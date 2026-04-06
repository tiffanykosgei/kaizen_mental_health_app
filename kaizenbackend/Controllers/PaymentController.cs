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

        // ========== HELPER METHODS ==========
        
        private async Task<(decimal platformFee, decimal professionalEarnings, int professionalPercentage)> CalculateRevenueSplit(int professionalId, decimal amount)
        {
            // Get professional profile to check for custom split
            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == professionalId);
            
            // Get platform settings
            var settings = await _context.PlatformSettings.FirstOrDefaultAsync();
            int defaultProfessionalPercentage = settings?.DefaultProfessionalPercentage ?? 60;
            
            int professionalPercentage = defaultProfessionalPercentage;
            
            // If professional has a custom split based on rating, use it
            if (professional != null && professional.CustomSplitPercentage.HasValue)
            {
                professionalPercentage = professional.CustomSplitPercentage.Value;
            }
            // Otherwise calculate based on average rating
            else if (professional != null && professional.AverageRating > 0)
            {
                professionalPercentage = GetPercentageFromRating(professional.AverageRating);
            }
            
            int platformPercentage = 100 - professionalPercentage;
            
            decimal professionalEarnings = Math.Round(amount * professionalPercentage / 100, 2);
            decimal platformFee = Math.Round(amount * platformPercentage / 100, 2);
            
            return (platformFee, professionalEarnings, professionalPercentage);
        }

        private int GetPercentageFromRating(decimal rating)
        {
            if (rating >= 5.0m) return 70;
            if (rating >= 4.5m) return 65;
            if (rating >= 4.0m) return 62;
            if (rating >= 3.5m) return 60;
            return 55;  // Below 3.5 stars
        }

        // ========== PAYMENT ENDPOINTS ==========

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
                    // Extract metadata
                    decimal paidAmount = session.Amount;
                    string receiptNumber = "";
                    
                    if (stkCallback.TryGetProperty("CallbackMetadata", out var metadata))
                    {
                        var items = metadata.GetProperty("Item");
                        foreach (var item in items.EnumerateArray())
                        {
                            var name = item.GetProperty("Name").GetString();
                            var value = item.GetProperty("Value").GetString();
                            
                            Console.WriteLine($"Metadata - {name}: {value}");
                            
                            if (name == "Amount" && value != null)
                            {
                                paidAmount = decimal.Parse(value);
                                session.Amount = paidAmount;
                            }
                            else if (name == "MpesaReceiptNumber" && value != null)
                            {
                                receiptNumber = value;
                                session.PaymentReference = receiptNumber;
                            }
                        }
                    }
                    
                    // Calculate revenue split based on professional's rating/custom split
                    var (platformFee, professionalEarnings, professionalPercentage) = 
                        await CalculateRevenueSplit(session.ProfessionalId, paidAmount);
                    
                    // Update session with split amounts
                    session.PlatformFee = platformFee;
                    session.ProfessionalEarnings = professionalEarnings;
                    session.PaymentStatus = "Paid";
                    session.Status = "Confirmed";  // Auto-confirm after payment
                    session.PayoutStatus = "Pending";  // Payout not yet sent to professional
                    
                    await _context.SaveChangesAsync();
                    
                    // Update professional's total earnings and pending payout
                    var professional = await _context.ProfessionalProfiles
                        .FirstOrDefaultAsync(p => p.UserId == session.ProfessionalId);
                    
                    if (professional != null)
                    {
                        professional.TotalEarnings += professionalEarnings;
                        professional.PendingPayout += professionalEarnings;
                        await _context.SaveChangesAsync();
                    }
                    
                    Console.WriteLine($"✅ Payment successful for Session {session.Id}");
                    Console.WriteLine($"   Amount: KSh {paidAmount} | Platform Fee: KSh {platformFee} | Professional: KSh {professionalEarnings} ({professionalPercentage}%)");
                    
                    return Ok(new { ResultCode = 0, ResultDesc = "Success" });
                }
                else
                {
                    // Payment failed
                    session.PaymentStatus = "Failed";
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"❌ Payment failed for Session {session.Id}: {resultDesc}");
                    
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
                platformFee = session.PlatformFee,
                professionalEarnings = session.ProfessionalEarnings,
                payoutStatus = session.PayoutStatus,
                paymentReference = session.PaymentReference
            });
        }

        // ========== ADMIN REVENUE ENDPOINTS ==========

        // GET: api/payment/platform-revenue
        [HttpGet("platform-revenue")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPlatformRevenue()
        {
            // Total platform fees from all paid sessions
            var totalPlatformFees = await _context.Sessions
                .Where(s => s.PaymentStatus == "Paid")
                .SumAsync(s => s.PlatformFee);
            
            var totalPaidSessions = await _context.Sessions
                .CountAsync(s => s.PaymentStatus == "Paid");
            
            var totalSessionAmount = await _context.Sessions
                .Where(s => s.PaymentStatus == "Paid")
                .SumAsync(s => s.Amount);
            
            // Per-professional breakdown
            var professionalBreakdown = await _context.Sessions
                .Where(s => s.PaymentStatus == "Paid")
                .GroupBy(s => s.ProfessionalId)
                .Select(g => new
                {
                    ProfessionalId = g.Key,
                    ProfessionalName = _context.Users.Where(u => u.Id == g.Key).Select(u => u.FullName).FirstOrDefault(),
                    TotalSessions = g.Count(),
                    TotalEarned = g.Sum(s => s.ProfessionalEarnings),
                    PlatformFees = g.Sum(s => s.PlatformFee),
                    PendingPayout = g.Where(s => s.PayoutStatus == "Pending").Sum(s => s.ProfessionalEarnings),
                    PaidOut = g.Where(s => s.PayoutStatus == "PaidOut").Sum(s => s.ProfessionalEarnings)
                })
                .ToListAsync();
            
            // Platform settings
            var settings = await _context.PlatformSettings.FirstOrDefaultAsync();
            
            return Ok(new
            {
                summary = new
                {
                    totalPlatformFees,
                    totalPaidSessions,
                    totalSessionAmount,
                    averagePlatformFeePerSession = totalPaidSessions > 0 ? totalPlatformFees / totalPaidSessions : 0,
                    currentPlatformPercentage = settings?.DefaultPlatformPercentage ?? 40,
                    currentProfessionalPercentage = settings?.DefaultProfessionalPercentage ?? 60
                },
                professionalBreakdown
            });
        }

        // GET: api/payment/professional-earnings/{professionalId}
        [HttpGet("professional-earnings/{professionalId}")]
        [Authorize(Roles = "Admin,Professional")]
        public async Task<IActionResult> GetProfessionalEarnings(int professionalId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);
            
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            
            // Professionals can only view their own earnings
            if (role == "Professional" && userId != professionalId)
                return Forbid();
            
            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == professionalId);
            
            if (professional == null)
                return NotFound("Professional not found");
            
            var sessions = await _context.Sessions
                .Where(s => s.ProfessionalId == professionalId && s.PaymentStatus == "Paid")
                .Select(s => new
                {
                    s.Id,
                    s.SessionDate,
                    s.Amount,
                    s.ProfessionalEarnings,
                    s.PayoutStatus,
                    s.CreatedAt
                })
                .OrderByDescending(s => s.SessionDate)
                .ToListAsync();
            
            return Ok(new
            {
                professionalId,
                professionalName = _context.Users.Where(u => u.Id == professionalId).Select(u => u.FullName).FirstOrDefault(),
                totalEarnings = professional.TotalEarnings,
                pendingPayout = professional.PendingPayout,
                paidOut = professional.PaidOut,
                averageRating = professional.AverageRating,
                customSplitPercentage = professional.CustomSplitPercentage,
                paymentMethod = professional.PaymentMethod,
                paymentAccount = professional.PaymentAccount,
                sessions
            });
        }

[HttpGet("professional-breakdown")]
[Authorize(Roles = "Admin")]
public async Task<IActionResult> GetProfessionalBreakdown()
{
    // Get all professionals with their earnings from paid sessions
    var professionals = await _context.Users
        .Where(u => u.Role == "Professional")
        .Select(u => new
        {
            u.Id,
            u.FullName,
            u.Email,
            Profile = _context.ProfessionalProfiles.FirstOrDefault(p => p.UserId == u.Id)
        })
        .ToListAsync();

    var breakdown = new List<object>();

    foreach (var pro in professionals)
    {
        // Get all paid sessions for this professional
        var paidSessions = await _context.Sessions
            .Where(s => s.ProfessionalId == pro.Id && s.PaymentStatus == "Paid")
            .ToListAsync();

        var totalEarned = paidSessions.Sum(s => s.ProfessionalEarnings);
        var platformFees = paidSessions.Sum(s => s.PlatformFee);
        var pendingPayout = paidSessions.Where(s => s.PayoutStatus == "Pending").Sum(s => s.ProfessionalEarnings);
        var paidOut = paidSessions.Where(s => s.PayoutStatus == "PaidOut").Sum(s => s.ProfessionalEarnings);
        
        // Calculate split percentage based on actual earnings vs session amounts
        var firstSession = paidSessions.FirstOrDefault();
        int professionalPercentage = 60; // Default
        if (firstSession != null && firstSession.Amount > 0)
        {
            professionalPercentage = (int)Math.Round((firstSession.ProfessionalEarnings / firstSession.Amount) * 100);
        }

        breakdown.Add(new
        {
            professionalId = pro.Id,
            professionalName = pro.FullName,
            professionalEmail = pro.Email,
            paymentMethod = pro.Profile?.PaymentMethod ?? "Not set",
            paymentAccount = pro.Profile?.PaymentAccount ?? "Not set",
            averageRating = pro.Profile?.AverageRating ?? 0,
            customSplitPercentage = pro.Profile?.CustomSplitPercentage,
            currentSplitPercentage = professionalPercentage,
            totalSessions = paidSessions.Count,
            totalEarned,
            platformFees,
            pendingPayout,
            paidOut
        });
    }

    // Also get platform totals
    var totalPlatformFees = await _context.Sessions
        .Where(s => s.PaymentStatus == "Paid")
        .SumAsync(s => s.PlatformFee);
    
    var totalPaidSessions = await _context.Sessions
        .CountAsync(s => s.PaymentStatus == "Paid");
    
    var totalProfessionalEarnings = await _context.Sessions
        .Where(s => s.PaymentStatus == "Paid")
        .SumAsync(s => s.ProfessionalEarnings);

    return Ok(new
    {
        summary = new
        {
            totalPlatformFees,
            totalProfessionalEarnings,
            totalPaidSessions,
            totalRevenue = totalPlatformFees + totalProfessionalEarnings
        },
        professionals = breakdown
    });
}
        // POST: api/payment/mark-paidout/{sessionId}
        [HttpPost("mark-paidout/{sessionId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MarkSessionAsPaidOut(int sessionId)
        {
            var session = await _context.Sessions.FindAsync(sessionId);
            
            if (session == null)
                return NotFound(new { message = "Session not found" });
            
            if (session.PayoutStatus != "Pending")
                return BadRequest(new { message = "Session is not pending payout" });
            
            if (session.PaymentStatus != "Paid")
                return BadRequest(new { message = "Session payment not completed yet" });
            
            session.PayoutStatus = "PaidOut";
            await _context.SaveChangesAsync();
            
            // Update professional's pending payout and paid out amounts
            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == session.ProfessionalId);
            
            if (professional != null)
            {
                professional.PendingPayout -= session.ProfessionalEarnings;
                professional.PaidOut += session.ProfessionalEarnings;
                await _context.SaveChangesAsync();
            }
            
            return Ok(new { 
                message = $"Session {sessionId} marked as paid out. Professional earnings: KSh {session.ProfessionalEarnings}",
                sessionId = session.Id,
                professionalEarnings = session.ProfessionalEarnings,
                payoutStatus = session.PayoutStatus
            });
        }

        // POST: api/payment/mark-bulk-paidout
        [HttpPost("mark-bulk-paidout")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MarkBulkSessionsAsPaidOut([FromBody] List<int> sessionIds)
        {
            if (sessionIds == null || sessionIds.Count == 0)
                return BadRequest(new { message = "No session IDs provided" });
            
            var sessions = await _context.Sessions
                .Where(s => sessionIds.Contains(s.Id) && s.PayoutStatus == "Pending" && s.PaymentStatus == "Paid")
                .ToListAsync();
            
            if (sessions.Count == 0)
                return BadRequest(new { message = "No valid sessions found for payout" });
            
            decimal totalPaidOut = 0;
            
            foreach (var session in sessions)
            {
                session.PayoutStatus = "PaidOut";
                totalPaidOut += session.ProfessionalEarnings;
                
                // Update professional's pending payout and paid out amounts
                var professional = await _context.ProfessionalProfiles
                    .FirstOrDefaultAsync(p => p.UserId == session.ProfessionalId);
                
                if (professional != null)
                {
                    professional.PendingPayout -= session.ProfessionalEarnings;
                    professional.PaidOut += session.ProfessionalEarnings;
                }
            }
            
            await _context.SaveChangesAsync();
            
            return Ok(new
            {
                message = $"{sessions.Count} sessions marked as paid out",
                totalPaidOut = totalPaidOut,
                sessionsAffected = sessions.Count
            });
        }

        // PUT: api/payment/platform-settings
        [HttpPut("platform-settings")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePlatformSettings([FromBody] UpdatePlatformSettingsDto dto)
        {
            if (dto.PlatformPercentage + dto.ProfessionalPercentage != 100)
                return BadRequest(new { message = "Platform and professional percentages must add up to 100" });
            
            if (dto.PlatformPercentage < 20 || dto.PlatformPercentage > 50)
                return BadRequest(new { message = "Platform percentage must be between 20 and 50" });
            
            var settings = await _context.PlatformSettings.FirstOrDefaultAsync();
            
            if (settings == null)
            {
                settings = new PlatformSetting();
                _context.PlatformSettings.Add(settings);
            }
            
            settings.DefaultPlatformPercentage = dto.PlatformPercentage;
            settings.DefaultProfessionalPercentage = dto.ProfessionalPercentage;
            settings.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            return Ok(new
            {
                message = "Platform settings updated successfully",
                platformPercentage = settings.DefaultPlatformPercentage,
                professionalPercentage = settings.DefaultProfessionalPercentage
            });
        }

        // POST: api/payment/update-professional-split/{professionalId}
        [HttpPost("update-professional-split/{professionalId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateProfessionalSplit(int professionalId, [FromBody] int customPercentage)
        {
            if (customPercentage < 40 || customPercentage > 80)
                return BadRequest(new { message = "Custom percentage must be between 40 and 80" });
            
            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == professionalId);
            
            if (professional == null)
                return NotFound(new { message = "Professional not found" });
            
            professional.CustomSplitPercentage = customPercentage;
            await _context.SaveChangesAsync();
            
            return Ok(new
            {
                message = $"Professional split updated to {customPercentage}%",
                professionalId = professionalId,
                professionalPercentage = customPercentage,
                platformPercentage = 100 - customPercentage
            });
        }

        // PUT: api/payment/professional-payment-method
        [HttpPut("professional-payment-method")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> UpdateProfessionalPaymentMethod([FromBody] UpdatePaymentMethodDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);
            
            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);
            
            if (professional == null)
                return NotFound(new { message = "Professional profile not found" });
            
            professional.PaymentMethod = dto.PaymentMethod;
            professional.PaymentAccount = dto.PaymentAccount;
            await _context.SaveChangesAsync();
            
            return Ok(new
            {
                message = "Payment method updated successfully",
                paymentMethod = professional.PaymentMethod,
                paymentAccount = professional.PaymentAccount
            });
        }
    }

    // ========== DTOs ==========
    
    public class UpdatePlatformSettingsDto
    {
        public int PlatformPercentage { get; set; }
        public int ProfessionalPercentage { get; set; }
    }

    public class UpdatePaymentMethodDto
    {
        public string PaymentMethod { get; set; } = "Mpesa";
        public string PaymentAccount { get; set; } = string.Empty;
    }
}