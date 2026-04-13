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
        private readonly IDailyService _dailyService;
        private readonly ILogger<PaymentController> _logger;

        public PaymentController(AppDbContext context, IPaymentService paymentService, IDailyService dailyService, ILogger<PaymentController> logger)
        {
            _context = context;
            _paymentService = paymentService;
            _dailyService = dailyService;
            _logger = logger;
        }

        // ========== HELPER METHODS ==========

        private async Task<(decimal platformFee, decimal professionalEarnings, int professionalPercentage)> CalculateRevenueSplit(int professionalId, decimal amount)
        {
            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == professionalId);

            var settings = await _context.PlatformSettings.FirstOrDefaultAsync();
            int defaultProfessionalPercentage = settings?.DefaultProfessionalPercentage ?? 60;

            int professionalPercentage = defaultProfessionalPercentage;

            if (professional != null && professional.CustomSplitPercentage.HasValue)
                professionalPercentage = professional.CustomSplitPercentage.Value;
            else if (professional != null && professional.AverageRating > 0)
                professionalPercentage = GetPercentageFromRating(professional.AverageRating);

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
            return 55;
        }

        private async Task CreateVideoRoom(Session session)
        {
            try
            {
                if (session == null)
                {
                    _logger.LogWarning("CreateVideoRoom: Session is null");
                    return;
                }

                if (!string.IsNullOrEmpty(session.MeetingUrl))
                {
                    _logger.LogInformation($"Session {session.Id} already has a meeting URL");
                    return;
                }

                var roomName = $"kaizen-session-{session.Id}";
                var sessionTime = session.SessionDate;
                var expiryTime = sessionTime.AddHours(24);
                int expiryMinutes = (int)(expiryTime - DateTime.UtcNow).TotalMinutes;
                if (expiryMinutes < 60) expiryMinutes = 60;

                _logger.LogInformation($"Creating Daily.co room '{roomName}' for session {session.Id}");

                var result = await _dailyService.CreateRoom(roomName, expiryMinutes);

                if (result.Success)
                {
                    session.MeetingUrl = result.RoomUrl;
                    session.MeetingRoomName = result.RoomName;
                    _logger.LogInformation($"✅ Video room created: {result.RoomUrl}");
                }
                else
                {
                    _logger.LogError($"❌ Failed to create room: {result.ErrorMessage}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Exception creating video room for session {session.Id}");
            }
        }

        // ========== PAYMENT ENDPOINTS ==========

        [HttpPost("initiate/{sessionId}")]
        public async Task<IActionResult> InitiatePayment(int sessionId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.ClientId == userId);

            if (session == null)
                return NotFound(new { message = "Session not found." });

            if (session.PaymentStatus == "Paid")
                return BadRequest(new { message = "Session already paid for." });

            var user = await _context.Users.FindAsync(userId);
            if (string.IsNullOrEmpty(user?.PhoneNumber))
                return BadRequest(new { message = "Phone number not found. Please update your profile." });

            var result = await _paymentService.InitiatePayment(user.PhoneNumber, session.Amount, session.Id);

            if (result.Success)
            {
                session.PaymentReference = result.CheckoutRequestId;
                session.PaymentStatus = "Pending"; // Explicitly set to pending
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Payment initiated for session {sessionId}. CheckoutRequestId: {result.CheckoutRequestId}");

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

        [HttpPost("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> MpesaCallback([FromBody] object callbackData)
        {
            try
            {
                _logger.LogInformation("=== M-Pesa Callback Received ===");
                
                // Log the entire callback for debugging
                var json = System.Text.Json.JsonSerializer.Serialize(callbackData);
                _logger.LogInformation($"Callback Data: {json}");
                
                using var doc = System.Text.Json.JsonDocument.Parse(json);
                var root = doc.RootElement;

                // Try to get Body and stkCallback
                if (!root.TryGetProperty("Body", out var body))
                {
                    _logger.LogError("Callback missing 'Body' property");
                    return Ok(new { ResultCode = 1, ResultDesc = "Invalid callback structure" });
                }

                if (!body.TryGetProperty("stkCallback", out var stkCallback))
                {
                    _logger.LogError("Callback missing 'stkCallback' property");
                    return Ok(new { ResultCode = 1, ResultDesc = "Invalid callback structure" });
                }

                var checkoutRequestId = stkCallback.GetProperty("CheckoutRequestID").GetString();
                var resultCode = stkCallback.GetProperty("ResultCode").GetInt32();
                var resultDesc = stkCallback.GetProperty("ResultDesc").GetString();

                _logger.LogInformation($"Processing callback - CheckoutRequestId: {checkoutRequestId}, ResultCode: {resultCode}, ResultDesc: {resultDesc}");

                // Find session by PaymentReference
                var session = await _context.Sessions
                    .FirstOrDefaultAsync(s => s.PaymentReference == checkoutRequestId);

                if (session == null)
                {
                    _logger.LogWarning($"Session not found for CheckoutRequestId: {checkoutRequestId}");
                    return Ok(new { ResultCode = 1, ResultDesc = "Session not found" });
                }

                _logger.LogInformation($"Found session {session.Id} with current status: PaymentStatus={session.PaymentStatus}, SessionStatus={session.Status}");

                if (resultCode == 0) // Payment successful
                {
                    decimal paidAmount = session.Amount;
                    string receiptNumber = "";
                    DateTime? transactionDate = null;

                    // Extract metadata
                    if (stkCallback.TryGetProperty("CallbackMetadata", out var metadata))
                    {
                        if (metadata.TryGetProperty("Item", out var items))
                        {
                            foreach (var item in items.EnumerateArray())
                            {
                                var name = item.GetProperty("Name").GetString();
                                if (item.TryGetProperty("Value", out var value))
                                {
                                    var valueStr = value.ToString();
                                    _logger.LogInformation($"Metadata item: {name} = {valueStr}");
                                    
                                    if (name == "Amount")
                                    {
                                        paidAmount = decimal.Parse(valueStr);
                                    }
                                    else if (name == "MpesaReceiptNumber")
                                    {
                                        receiptNumber = valueStr;
                                    }
                                    else if (name == "TransactionDate")
                                    {
                                        transactionDate = DateTime.ParseExact(valueStr, "yyyyMMddHHmmss", null);
                                    }
                                }
                            }
                        }
                    }

                    _logger.LogInformation($"Payment details - Amount: {paidAmount}, Receipt: {receiptNumber}, Date: {transactionDate}");

                    // Calculate revenue split
                    var (platformFee, professionalEarnings, professionalPercentage) =
                        await CalculateRevenueSplit(session.ProfessionalId, paidAmount);

                    // Update session with payment details
                    session.Amount = paidAmount;
                    session.PlatformFee = platformFee;
                    session.ProfessionalEarnings = professionalEarnings;
                    session.PaymentStatus = "Paid";
                    session.PayoutStatus = "Pending";
                    session.PaymentReference = !string.IsNullOrEmpty(receiptNumber) ? receiptNumber : session.PaymentReference;
                    session.UpdatedAt = DateTime.UtcNow;

                    // IMPORTANT: Set session status to Confirmed if it was pending
                    if (session.Status == "Pending")
                    {
                        session.Status = "Confirmed";
                        _logger.LogInformation($"Session {session.Id} auto-confirmed after successful payment");
                    }

                    // Create video room if session is confirmed
                    if (session.Status == "Confirmed" && string.IsNullOrEmpty(session.MeetingUrl))
                    {
                        _logger.LogInformation($"Creating video room for session {session.Id} after payment");
                        await CreateVideoRoom(session);
                    }

                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"✅ Session {session.Id} updated successfully. PaymentStatus={session.PaymentStatus}, SessionStatus={session.Status}");

                    // Update professional earnings
                    var professional = await _context.ProfessionalProfiles
                        .FirstOrDefaultAsync(p => p.UserId == session.ProfessionalId);

                    if (professional != null)
                    {
                        professional.TotalEarnings += professionalEarnings;
                        professional.PendingPayout += professionalEarnings;
                        await _context.SaveChangesAsync();
                        _logger.LogInformation($"Updated professional {session.ProfessionalId} earnings: +{professionalEarnings}");
                    }

                    return Ok(new { ResultCode = 0, ResultDesc = "Success" });
                }
                else // Payment failed
                {
                    session.PaymentStatus = "Failed";
                    session.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    _logger.LogWarning($"❌ Payment failed for session {session.Id}: {resultDesc}");
                    return Ok(new { ResultCode = resultCode, ResultDesc = resultDesc });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Callback error");
                // Always return OK to M-Pesa to acknowledge receipt
                return Ok(new { ResultCode = 1, ResultDesc = ex.Message });
            }
        }

        // Add this endpoint to manually check payment status from Safaricom
        [HttpGet("check-status/{sessionId}")]
        public async Task<IActionResult> CheckPaymentStatus(int sessionId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.ClientId == userId);

            if (session == null)
                return NotFound(new { message = "Session not found." });

            if (session.PaymentStatus != "Pending")
            {
                return Ok(new
                {
                    sessionId = session.Id,
                    paymentStatus = session.PaymentStatus,
                    message = session.PaymentStatus == "Paid" ? "Payment已完成" : "Payment failed"
                });
            }

            // If still pending, try to query the status from M-Pesa
            if (!string.IsNullOrEmpty(session.PaymentReference))
            {
                try
                {
                    var status = await _paymentService.QueryPaymentStatus(session.PaymentReference);
                    if (status.ResultCode == 0)
                    {
                        // Payment was successful - update session
                        session.PaymentStatus = "Paid";
                        session.PayoutStatus = "Pending";
                        
                        if (session.Status == "Pending")
                        {
                            session.Status = "Confirmed";
                        }
                        
                        await _context.SaveChangesAsync();
                        
                        return Ok(new
                        {
                            sessionId = session.Id,
                            paymentStatus = "Paid",
                            message = "Payment confirmed!"
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error checking payment status");
                }
            }

            return Ok(new
            {
                sessionId = session.Id,
                paymentStatus = "Pending",
                message = "Payment still processing. Please wait for M-Pesa confirmation."
            });
        }

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
                paymentReference = session.PaymentReference,
                meetingUrl = session.MeetingUrl
            });
        }

        // Rest of your existing endpoints remain the same...
        [HttpGet("my-earnings")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> GetMyEarnings()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            var totalSessions = await _context.Sessions
                .CountAsync(s => s.ProfessionalId == userId && s.PaymentStatus == "Paid");

            var averageRating = professional?.AverageRating ?? 0;

            var settings = await _context.PlatformSettings.FirstOrDefaultAsync();
            int defaultProfessionalPercentage = settings?.DefaultProfessionalPercentage ?? 60;
            int currentSplitPercentage = professional?.CustomSplitPercentage ??
                (averageRating > 0 ? GetPercentageFromRating(averageRating) : defaultProfessionalPercentage);

            return Ok(new
            {
                totalEarned = professional?.TotalEarnings ?? 0,
                pendingPayout = professional?.PendingPayout ?? 0,
                paidOut = professional?.PaidOut ?? 0,
                totalSessions,
                averageRating,
                currentSplitPercentage
            });
        }

        [HttpGet("payout-history")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> GetPayoutHistory()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var paidOutSessions = await _context.Sessions
                .Where(s => s.ProfessionalId == userId && s.PayoutStatus == "PaidOut")
                .OrderByDescending(s => s.UpdatedAt)
                .Select(s => new
                {
                    id = s.Id,
                    date = s.UpdatedAt ?? s.CreatedAt,
                    amount = s.ProfessionalEarnings,
                    method = "M-Pesa",
                    reference = s.PaymentReference,
                    status = "Completed"
                })
                .ToListAsync();

            return Ok(paidOutSessions);
        }

        [HttpGet("platform-revenue")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPlatformRevenue()
        {
            var totalPlatformFees = await _context.Sessions
                .Where(s => s.PaymentStatus == "Paid")
                .SumAsync(s => s.PlatformFee);

            var totalPaidSessions = await _context.Sessions
                .CountAsync(s => s.PaymentStatus == "Paid");

            var totalSessionAmount = await _context.Sessions
                .Where(s => s.PaymentStatus == "Paid")
                .SumAsync(s => s.Amount);

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

        [HttpGet("professional-breakdown")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetProfessionalBreakdown()
        {
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
                var paidSessions = await _context.Sessions
                    .Where(s => s.ProfessionalId == pro.Id && s.PaymentStatus == "Paid")
                    .ToListAsync();

                var totalEarned = paidSessions.Sum(s => s.ProfessionalEarnings);
                var platformFees = paidSessions.Sum(s => s.PlatformFee);
                var pendingPayout = paidSessions.Where(s => s.PayoutStatus == "Pending").Sum(s => s.ProfessionalEarnings);
                var paidOut = paidSessions.Where(s => s.PayoutStatus == "PaidOut").Sum(s => s.ProfessionalEarnings);

                int professionalPercentage = 60;
                var firstSession = paidSessions.FirstOrDefault();
                if (firstSession != null && firstSession.Amount > 0)
                    professionalPercentage = (int)Math.Round((firstSession.ProfessionalEarnings / firstSession.Amount) * 100);

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
            session.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == session.ProfessionalId);

            if (professional != null)
            {
                professional.PendingPayout -= session.ProfessionalEarnings;
                professional.PaidOut += session.ProfessionalEarnings;
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                message = $"Session {sessionId} marked as paid out. Professional earnings: KSh {session.ProfessionalEarnings}",
                sessionId = session.Id,
                professionalEarnings = session.ProfessionalEarnings,
                payoutStatus = session.PayoutStatus
            });
        }

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
                session.UpdatedAt = DateTime.UtcNow;
                totalPaidOut += session.ProfessionalEarnings;

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
                totalPaidOut,
                sessionsAffected = sessions.Count
            });
        }

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
                professionalId,
                professionalPercentage = customPercentage,
                platformPercentage = 100 - customPercentage
            });
        }

        [HttpGet("my-payment-method")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> GetMyPaymentMethod()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (professional == null)
                return NotFound(new { message = "Professional profile not found" });

            return Ok(new
            {
                paymentMethod = professional.PaymentMethod ?? "Mpesa",
                paymentAccount = professional.PaymentAccount ?? ""
            });
        }

        [HttpPut("update-payment-method")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> UpdatePaymentMethod([FromBody] UpdatePaymentMethodDto dto)
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