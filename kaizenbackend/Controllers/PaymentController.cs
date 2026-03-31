using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using kaizenbackend.Data;
using kaizenbackend.DTOs;
using kaizenbackend.Models;
using kaizenbackend.Services;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IPaymentService _paymentService;

        public PaymentController(AppDbContext context, IPaymentService paymentService)
        {
            _context = context;
            _paymentService = paymentService;
        }

        // POST: api/payment/initiate/{sessionId}
        [HttpPost("initiate/{sessionId}")]
        public async Task<IActionResult> InitiatePayment(int sessionId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            // Get the session
            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.ClientId == userId);

            if (session == null)
                return NotFound(new { message = "Session not found." });

            if (session.PaymentStatus == "Paid")
                return BadRequest(new { message = "Session already paid for." });

            // Get user's phone number
            var user = await _context.Users.FindAsync(userId);
            if (string.IsNullOrEmpty(user?.PhoneNumber))
                return BadRequest(new { message = "Phone number not found. Please update your profile." });

            // Initiate STK Push
            var result = await _paymentService.InitiatePayment(user.PhoneNumber, session.Amount, session.Id);

            if (result.Success)
            {
                // Save the CheckoutRequestID for later querying
                session.PaymentReference = result.CheckoutRequestId;
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = "Payment prompt sent to your phone. Please enter your PIN to complete payment.",
                    checkoutRequestId = result.CheckoutRequestId,
                    merchantRequestId = result.MerchantRequestId
                });
            }

            return BadRequest(new
            {
                success = false,
                message = result.ResponseDescription ?? "Failed to initiate payment. Please try again."
            });
        }

        // POST: api/payment/callback
        [HttpPost("callback")]
        public async Task<IActionResult> MpesaCallback([FromBody] object callbackData)
        {
            try
            {
                Console.WriteLine("=== M-Pesa Callback Received ===");
                Console.WriteLine($"Data: {System.Text.Json.JsonSerializer.Serialize(callbackData)}");

                // Parse the callback data
                var json = System.Text.Json.JsonSerializer.Serialize(callbackData);
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var root = doc.RootElement;
                
                var body = root.GetProperty("Body");
                var stkCallback = body.GetProperty("stkCallback");
                
                var checkoutRequestId = stkCallback.GetProperty("CheckoutRequestID").GetString();
                var resultCode = stkCallback.GetProperty("ResultCode").GetInt32();
                var resultDesc = stkCallback.GetProperty("ResultDesc").GetString();

                Console.WriteLine($"CheckoutRequestID: {checkoutRequestId}");
                Console.WriteLine($"ResultCode: {resultCode}");
                Console.WriteLine($"ResultDesc: {resultDesc}");

                // Find the session by PaymentReference
                var session = await _context.Sessions
                    .FirstOrDefaultAsync(s => s.PaymentReference == checkoutRequestId);

                if (session == null)
                {
                    Console.WriteLine($"Session not found for CheckoutRequestID: {checkoutRequestId}");
                    return Ok(new { ResultCode = 1, ResultDesc = "Session not found" });
                }

                if (resultCode == 0)
                {
                    // Payment successful
                    session.PaymentStatus = "Paid";
                    
                    // Extract metadata if available
                    if (stkCallback.TryGetProperty("CallbackMetadata", out var metadata))
                    {
                        var items = metadata.GetProperty("Item");
                        foreach (var item in items.EnumerateArray())
                        {
                            var name = item.GetProperty("Name").GetString();
                            var value = item.GetProperty("Value").GetString();
                            
                            Console.WriteLine($"Metadata - {name}: {value}");
                            
                            if (name == "MpesaReceiptNumber" && value != null)
                            {
                                session.PaymentReference = value;
                            }
                            else if (name == "Amount" && value != null)
                            {
                                session.Amount = decimal.Parse(value);
                            }
                        }
                    }
                    
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"Session {session.Id} payment marked as PAID");
                    
                    return Ok(new { ResultCode = 0, ResultDesc = "Success" });
                }
                else
                {
                    // Payment failed
                    session.PaymentStatus = "Failed";
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"Session {session.Id} payment marked as FAILED");
                    
                    return Ok(new { ResultCode = resultCode, ResultDesc = resultDesc });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Callback error: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return Ok(new { ResultCode = 1, ResultDesc = ex.Message });
            }
        }

        // GET: api/payment/status/{sessionId}
        [HttpGet("status/{sessionId}")]
        public async Task<IActionResult> GetPaymentStatus(int sessionId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.ClientId == userId);

            if (session == null)
                return NotFound(new { message = "Session not found." });

            return Ok(new
            {
                sessionId = session.Id,
                paymentStatus = session.PaymentStatus,
                sessionStatus = session.Status,
                amount = session.Amount,
                paymentReference = session.PaymentReference
            });
        }
    }
}