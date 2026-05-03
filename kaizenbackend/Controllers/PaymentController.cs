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

        public PaymentController(
            AppDbContext context,
            IPaymentService paymentService,
            IDailyService dailyService,
            ILogger<PaymentController> logger)
        {
            _context = context;
            _paymentService = paymentService;
            _dailyService = dailyService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════
        // HELPERS
        // ═══════════════════════════════════════════════

        private async Task<(decimal platformFee, decimal professionalEarnings, int professionalPercentage)>
            CalculateRevenueSplit(int professionalId, decimal amount)
        {
            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == professionalId);

            var settings = await _context.PlatformSettings.FirstOrDefaultAsync();
            int defaultProfessionalPercentage = settings?.DefaultProfessionalPercentage ?? 60;

            int professionalPercentage = defaultProfessionalPercentage;

            if (professional?.CustomSplitPercentage.HasValue == true)
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

        private static string NormalizePhone(string phone)
        {
            phone = phone.Trim().Replace(" ", "").Replace("-", "");
            if (phone.StartsWith("+")) phone = phone.Substring(1);
            if (phone.StartsWith("0") && phone.Length == 10)
                phone = "254" + phone.Substring(1);
            if (!phone.StartsWith("254"))
                phone = "254" + phone;
            return phone;
        }

        private async Task CreateVideoRoom(Session session)
        {
            try
            {
                if (session == null || !string.IsNullOrEmpty(session.MeetingUrl)) return;

                var roomName   = $"kaizen-session-{session.Id}";
                var expiryTime = session.SessionDate.AddHours(24);
                int expiryMin  = Math.Max(60, (int)(expiryTime - DateTime.UtcNow).TotalMinutes);

                _logger.LogInformation($"Creating Daily.co room '{roomName}' for session {session.Id}");
                var result = await _dailyService.CreateRoom(roomName, expiryMin);

                if (result.Success)
                {
                    session.MeetingUrl      = result.RoomUrl;
                    session.MeetingRoomName = result.RoomName;
                    _logger.LogInformation($"✅ Video room created: {result.RoomUrl}");
                }
                else
                {
                    _logger.LogError($"❌ Room creation failed: {result.ErrorMessage}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Exception creating video room for session {session?.Id}");
            }
        }

        // ═══════════════════════════════════════════════
        // INITIATE PAYMENT  —  POST /api/payment/initiate
        // Accepts both camelCase and PascalCase thanks to
        // PropertyNameCaseInsensitive = true in Program.cs
        // ═══════════════════════════════════════════════
        [HttpPost("initiate")]
        public async Task<IActionResult> InitiatePayment([FromBody] InitiatePaymentRequest request)
        {
            try
            {
                _logger.LogInformation(
                    $"=== InitiatePayment === SessionId:{request?.SessionId} Phone:{request?.PhoneNumber}");

                if (request == null || request.SessionId == 0)
                    return BadRequest(new { success = false, message = "SessionId is required." });

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                int userId = int.Parse(userIdClaim);

                var session = await _context.Sessions
                    .FirstOrDefaultAsync(s => s.Id == request.SessionId && s.ClientId == userId);

                if (session == null)
                    return NotFound(new { success = false, message = "Session not found." });

                if (session.PaymentStatus == "Paid")
                    return BadRequest(new { success = false, message = "Session already paid." });

                // Resolve phone — request body first, then user profile
                string phoneNumber = request.PhoneNumber?.Trim() ?? "";

                if (string.IsNullOrEmpty(phoneNumber))
                {
                    var user = await _context.Users.FindAsync(userId);
                    phoneNumber = user?.PhoneNumber?.Trim() ?? "";
                }

                if (string.IsNullOrEmpty(phoneNumber))
                    return BadRequest(new
                    {
                        success = false,
                        message = "No phone number found. Please add one to your profile in Settings."
                    });

                phoneNumber = NormalizePhone(phoneNumber);

                _logger.LogInformation(
                    $"Initiating M-Pesa — Session:{session.Id} Phone:{phoneNumber} Amount:{session.Amount}");

                var result = await _paymentService.InitiatePayment(phoneNumber, session.Amount, session.Id);

                if (result.Success)
                {
                    session.PaymentReference = result.CheckoutRequestId;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation($"Payment initiated. CheckoutRequestId: {result.CheckoutRequestId}");

                    return Ok(new
                    {
                        success           = true,
                        message           = "M-Pesa prompt sent. Enter your PIN to complete payment.",
                        checkoutRequestId = result.CheckoutRequestId,
                        merchantRequestId = result.MerchantRequestId
                    });
                }

                _logger.LogWarning($"Payment failed: {result.ResponseDescription}");
                return BadRequest(new
                {
                    success = false,
                    message = result.ResponseDescription ?? "Failed to initiate payment. Please try again."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in InitiatePayment");
                return StatusCode(500, new { success = false, message = "Server error. Please try again." });
            }
        }

        // ═══════════════════════════════════════════════
        // INITIATE PAYMENT (URL PATH FORMAT)
        // POST /api/payment/initiate/{sessionId}
        // Uses phone from profile automatically
        // ═══════════════════════════════════════════════
        [HttpPost("initiate/{sessionId}")]
        public async Task<IActionResult> InitiatePaymentByPath(int sessionId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.ClientId == userId);

            if (session == null)
                return NotFound(new { success = false, message = "Session not found." });

            if (session.PaymentStatus == "Paid")
                return BadRequest(new { success = false, message = "Session already paid." });

            var user = await _context.Users.FindAsync(userId);
            if (string.IsNullOrEmpty(user?.PhoneNumber))
                return BadRequest(new { success = false, message = "No phone number on profile. Please add one in Settings." });

            var phoneNumber = NormalizePhone(user.PhoneNumber);
            var result      = await _paymentService.InitiatePayment(phoneNumber, session.Amount, session.Id);

            if (result.Success)
            {
                session.PaymentReference = result.CheckoutRequestId;
                await _context.SaveChangesAsync();
                return Ok(new
                {
                    success           = true,
                    message           = "M-Pesa prompt sent. Enter your PIN to complete payment.",
                    checkoutRequestId = result.CheckoutRequestId,
                    merchantRequestId = result.MerchantRequestId
                });
            }

            return BadRequest(new
            {
                success = false,
                message = result.ResponseDescription ?? "Failed to initiate payment."
            });
        }

        // ═══════════════════════════════════════════════
        // M-PESA CALLBACK
        // POST /api/payment/callback
        // ═══════════════════════════════════════════════
        [HttpPost("callback")]
        [AllowAnonymous]
        public async Task<IActionResult> MpesaCallback([FromBody] object callbackData)
        {
            try
            {
                _logger.LogInformation("=== M-Pesa Callback Received ===");

                var json = System.Text.Json.JsonSerializer.Serialize(callbackData);
                _logger.LogInformation($"Callback: {json}");

                using var doc  = System.Text.Json.JsonDocument.Parse(json);
                var root       = doc.RootElement;

                if (!root.TryGetProperty("Body", out var body))
                    return Ok(new { ResultCode = 1, ResultDesc = "Invalid callback — missing Body" });

                if (!body.TryGetProperty("stkCallback", out var stkCallback))
                    return Ok(new { ResultCode = 1, ResultDesc = "Invalid callback — missing stkCallback" });

                var checkoutRequestId = stkCallback.GetProperty("CheckoutRequestID").GetString();
                var resultCode        = stkCallback.GetProperty("ResultCode").GetInt32();
                var resultDesc        = stkCallback.GetProperty("ResultDesc").GetString();

                _logger.LogInformation(
                    $"Callback — CheckoutRequestId:{checkoutRequestId} ResultCode:{resultCode}");

                var session = await _context.Sessions
                    .FirstOrDefaultAsync(s => s.PaymentReference == checkoutRequestId);

                if (session == null)
                {
                    _logger.LogWarning($"Session not found for CheckoutRequestId: {checkoutRequestId}");
                    return Ok(new { ResultCode = 1, ResultDesc = "Session not found" });
                }

                if (resultCode == 0)
                {
                    decimal paidAmount    = session.Amount;
                    string receiptNumber  = "";

                    if (stkCallback.TryGetProperty("CallbackMetadata", out var metadata) &&
                        metadata.TryGetProperty("Item", out var items))
                    {
                        foreach (var item in items.EnumerateArray())
                        {
                            var name = item.GetProperty("Name").GetString();
                            if (!item.TryGetProperty("Value", out var val)) continue;
                            var valStr = val.ToString();

                            if (name == "Amount")
                                paidAmount = decimal.Parse(valStr);
                            else if (name == "MpesaReceiptNumber")
                                receiptNumber = valStr;
                        }
                    }

                    var (platformFee, professionalEarnings, _) =
                        await CalculateRevenueSplit(session.ProfessionalId, paidAmount);

                    session.Amount               = paidAmount;
                    session.PlatformFee          = platformFee;
                    session.ProfessionalEarnings = professionalEarnings;
                    session.PaymentStatus        = "Paid";
                    session.PayoutStatus         = "Pending";
                    session.PaymentReference     = !string.IsNullOrEmpty(receiptNumber) ? receiptNumber : session.PaymentReference;
                    session.UpdatedAt            = DateTime.UtcNow;

                    if (session.Status == "Pending")
                    {
                        session.Status = "Confirmed";
                        _logger.LogInformation($"Session {session.Id} auto-confirmed after payment");
                    }

                    if (session.Status == "Confirmed" && string.IsNullOrEmpty(session.MeetingUrl))
                        await CreateVideoRoom(session);

                    await _context.SaveChangesAsync();

                    var prof = await _context.ProfessionalProfiles
                        .FirstOrDefaultAsync(p => p.UserId == session.ProfessionalId);

                    if (prof != null)
                    {
                        prof.TotalEarnings += professionalEarnings;
                        prof.PendingPayout += professionalEarnings;
                        await _context.SaveChangesAsync();
                    }

                    _logger.LogInformation(
                        $"✅ Session {session.Id} paid. Receipt:{receiptNumber} MeetingUrl:{session.MeetingUrl}");

                    return Ok(new { ResultCode = 0, ResultDesc = "Success" });
                }
                else
                {
                    session.PaymentStatus = "Failed";
                    session.UpdatedAt     = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    _logger.LogWarning($"❌ Payment failed for session {session.Id}: {resultDesc}");
                    return Ok(new { ResultCode = resultCode, ResultDesc = resultDesc });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Callback error");
                return Ok(new { ResultCode = 1, ResultDesc = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════
        // CHECK PAYMENT STATUS
        // GET /api/payment/check-status/{sessionId}
        // ═══════════════════════════════════════════════
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
                return Ok(new
                {
                    sessionId     = session.Id,
                    paymentStatus = session.PaymentStatus,
                    meetingUrl    = session.MeetingUrl,
                    message       = session.PaymentStatus == "Paid" ? "Payment completed" : "Payment failed"
                });

            if (!string.IsNullOrEmpty(session.PaymentReference))
            {
                try
                {
                    var status = await _paymentService.QueryPaymentStatus(session.PaymentReference);
                    if (status.ResultCode == 0)
                    {
                        session.PaymentStatus = "Paid";
                        session.PayoutStatus  = "Pending";
                        if (session.Status == "Pending") session.Status = "Confirmed";
                        await _context.SaveChangesAsync();

                        return Ok(new
                        {
                            sessionId     = session.Id,
                            paymentStatus = "Paid",
                            meetingUrl    = session.MeetingUrl,
                            message       = "Payment confirmed!"
                        });
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error querying payment status");
                }
            }

            return Ok(new
            {
                sessionId     = session.Id,
                paymentStatus = "Pending",
                message       = "Payment still processing. Please wait for M-Pesa confirmation."
            });
        }

        // ═══════════════════════════════════════════════
        // GET PAYMENT STATUS
        // GET /api/payment/status/{sessionId}
        // ═══════════════════════════════════════════════
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
                sessionId            = session.Id,
                paymentStatus        = session.PaymentStatus,
                sessionStatus        = session.Status,
                amount               = session.Amount,
                platformFee          = session.PlatformFee,
                professionalEarnings = session.ProfessionalEarnings,
                payoutStatus         = session.PayoutStatus,
                paymentReference     = session.PaymentReference,
                meetingUrl           = session.MeetingUrl
            });
        }

        // ═══════════════════════════════════════════════
        // PROFESSIONAL EARNINGS
        // ═══════════════════════════════════════════════
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
            int defaultPct = settings?.DefaultProfessionalPercentage ?? 60;
            int currentSplitPercentage = professional?.CustomSplitPercentage ??
                (averageRating > 0 ? GetPercentageFromRating(averageRating) : defaultPct);

            return Ok(new
            {
                totalEarned            = professional?.TotalEarnings ?? 0,
                pendingPayout          = professional?.PendingPayout ?? 0,
                paidOut                = professional?.PaidOut ?? 0,
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

            var sessions = await _context.Sessions
                .Where(s => s.ProfessionalId == userId && s.PayoutStatus == "PaidOut")
                .OrderByDescending(s => s.UpdatedAt)
                .Select(s => new
                {
                    id        = s.Id,
                    date      = s.UpdatedAt ?? s.CreatedAt,
                    amount    = s.ProfessionalEarnings,
                    method    = "M-Pesa",
                    reference = s.PaymentReference,
                    status    = "Completed"
                })
                .ToListAsync();

            return Ok(sessions);
        }

        // ═══════════════════════════════════════════════
        // ADMIN REVENUE
        // ═══════════════════════════════════════════════
        [HttpGet("platform-revenue")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPlatformRevenue()
        {
            var totalPlatformFees  = await _context.Sessions.Where(s => s.PaymentStatus == "Paid").SumAsync(s => s.PlatformFee);
            var totalPaidSessions  = await _context.Sessions.CountAsync(s => s.PaymentStatus == "Paid");
            var totalSessionAmount = await _context.Sessions.Where(s => s.PaymentStatus == "Paid").SumAsync(s => s.Amount);

            var professionalBreakdown = await _context.Sessions
                .Where(s => s.PaymentStatus == "Paid")
                .GroupBy(s => s.ProfessionalId)
                .Select(g => new
                {
                    ProfessionalId   = g.Key,
                    ProfessionalName = _context.Users.Where(u => u.Id == g.Key).Select(u => u.FirstName + " " + u.LastName).FirstOrDefault(),
                    TotalSessions    = g.Count(),
                    TotalEarned      = g.Sum(s => s.ProfessionalEarnings),
                    PlatformFees     = g.Sum(s => s.PlatformFee),
                    PendingPayout    = g.Where(s => s.PayoutStatus == "Pending").Sum(s => s.ProfessionalEarnings),
                    PaidOut          = g.Where(s => s.PayoutStatus == "PaidOut").Sum(s => s.ProfessionalEarnings)
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
                    averagePlatformFeePerSession  = totalPaidSessions > 0 ? totalPlatformFees / totalPaidSessions : 0,
                    currentPlatformPercentage     = settings?.DefaultPlatformPercentage ?? 40,
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
                    FullName = u.FirstName + " " + u.LastName,
                    u.Email,
                    Profile  = _context.ProfessionalProfiles.FirstOrDefault(p => p.UserId == u.Id)
                })
                .ToListAsync();

            var breakdown = new List<object>();

            foreach (var pro in professionals)
            {
                var paid          = await _context.Sessions.Where(s => s.ProfessionalId == pro.Id && s.PaymentStatus == "Paid").ToListAsync();
                var totalEarned   = paid.Sum(s => s.ProfessionalEarnings);
                var platformFees  = paid.Sum(s => s.PlatformFee);
                var pendingPayout = paid.Where(s => s.PayoutStatus == "Pending").Sum(s => s.ProfessionalEarnings);
                var paidOut       = paid.Where(s => s.PayoutStatus == "PaidOut").Sum(s => s.ProfessionalEarnings);

                int pct  = 60;
                var first = paid.FirstOrDefault();
                if (first != null && first.Amount > 0)
                    pct = (int)Math.Round((first.ProfessionalEarnings / first.Amount) * 100);

                breakdown.Add(new
                {
                    professionalId        = pro.Id,
                    professionalName      = pro.FullName,
                    professionalEmail     = pro.Email,
                    paymentMethod         = pro.Profile?.PaymentMethod ?? "Not set",
                    paymentAccount        = pro.Profile?.PaymentAccount ?? "Not set",
                    averageRating         = pro.Profile?.AverageRating ?? 0,
                    customSplitPercentage = pro.Profile?.CustomSplitPercentage,
                    currentSplitPercentage = pct,
                    totalSessions         = paid.Count,
                    totalEarned,
                    platformFees,
                    pendingPayout,
                    paidOut
                });
            }

            var tPlatformFees   = await _context.Sessions.Where(s => s.PaymentStatus == "Paid").SumAsync(s => s.PlatformFee);
            var tPaidSessions   = await _context.Sessions.CountAsync(s => s.PaymentStatus == "Paid");
            var tProEarnings    = await _context.Sessions.Where(s => s.PaymentStatus == "Paid").SumAsync(s => s.ProfessionalEarnings);

            return Ok(new
            {
                summary = new
                {
                    totalPlatformFees     = tPlatformFees,
                    totalProfessionalEarnings = tProEarnings,
                    totalPaidSessions     = tPaidSessions,
                    totalRevenue          = tPlatformFees + tProEarnings
                },
                professionals = breakdown
            });
        }

        // ═══════════════════════════════════════════════
        // ADMIN PAYOUT MANAGEMENT
        // ═══════════════════════════════════════════════
        [HttpPost("mark-paidout/{sessionId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> MarkSessionAsPaidOut(int sessionId)
        {
            var session = await _context.Sessions.FindAsync(sessionId);
            if (session == null) return NotFound(new { message = "Session not found" });
            if (session.PayoutStatus != "Pending") return BadRequest(new { message = "Session is not pending payout" });
            if (session.PaymentStatus != "Paid")   return BadRequest(new { message = "Session payment not completed yet" });

            session.PayoutStatus = "PaidOut";
            session.UpdatedAt    = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var prof = await _context.ProfessionalProfiles.FirstOrDefaultAsync(p => p.UserId == session.ProfessionalId);
            if (prof != null)
            {
                prof.PendingPayout -= session.ProfessionalEarnings;
                prof.PaidOut       += session.ProfessionalEarnings;
                await _context.SaveChangesAsync();
            }

            return Ok(new
            {
                message              = $"Session {sessionId} marked as paid out.",
                sessionId            = session.Id,
                professionalEarnings = session.ProfessionalEarnings,
                payoutStatus         = session.PayoutStatus
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

            decimal total = 0;
            foreach (var s in sessions)
            {
                s.PayoutStatus = "PaidOut";
                s.UpdatedAt    = DateTime.UtcNow;
                total         += s.ProfessionalEarnings;

                var prof = await _context.ProfessionalProfiles.FirstOrDefaultAsync(p => p.UserId == s.ProfessionalId);
                if (prof != null)
                {
                    prof.PendingPayout -= s.ProfessionalEarnings;
                    prof.PaidOut       += s.ProfessionalEarnings;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = $"{sessions.Count} sessions marked as paid out", totalPaidOut = total, sessionsAffected = sessions.Count });
        }

        // ═══════════════════════════════════════════════
        // PLATFORM SETTINGS
        // ═══════════════════════════════════════════════
        [HttpPut("platform-settings")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdatePlatformSettings([FromBody] UpdatePlatformSettingsDto dto)
        {
            if (dto.PlatformPercentage + dto.ProfessionalPercentage != 100)
                return BadRequest(new { message = "Percentages must add up to 100" });
            if (dto.PlatformPercentage < 20 || dto.PlatformPercentage > 50)
                return BadRequest(new { message = "Platform percentage must be between 20 and 50" });

            var settings = await _context.PlatformSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new PlatformSetting();
                _context.PlatformSettings.Add(settings);
            }

            settings.DefaultPlatformPercentage     = dto.PlatformPercentage;
            settings.DefaultProfessionalPercentage = dto.ProfessionalPercentage;
            settings.UpdatedAt                     = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message                = "Platform settings updated",
                platformPercentage     = settings.DefaultPlatformPercentage,
                professionalPercentage = settings.DefaultProfessionalPercentage
            });
        }

        [HttpPost("update-professional-split/{professionalId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateProfessionalSplit(int professionalId, [FromBody] int customPercentage)
        {
            if (customPercentage < 40 || customPercentage > 80)
                return BadRequest(new { message = "Custom percentage must be between 40 and 80" });

            var prof = await _context.ProfessionalProfiles.FirstOrDefaultAsync(p => p.UserId == professionalId);
            if (prof == null) return NotFound(new { message = "Professional not found" });

            prof.CustomSplitPercentage = customPercentage;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message                = $"Split updated to {customPercentage}%",
                professionalId,
                professionalPercentage = customPercentage,
                platformPercentage     = 100 - customPercentage
            });
        }

        // ═══════════════════════════════════════════════
        // PAYMENT METHOD (PROFESSIONAL)
        // ═══════════════════════════════════════════════
        [HttpGet("my-payment-method")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> GetMyPaymentMethod()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var prof = await _context.ProfessionalProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (prof == null) return NotFound(new { message = "Professional profile not found" });

            return Ok(new { paymentMethod = prof.PaymentMethod ?? "Mpesa", paymentAccount = prof.PaymentAccount ?? "" });
        }

        [HttpPut("update-payment-method")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> UpdatePaymentMethod([FromBody] UpdatePaymentMethodDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var prof = await _context.ProfessionalProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
            if (prof == null) return NotFound(new { message = "Professional profile not found" });

            prof.PaymentMethod  = dto.PaymentMethod;
            prof.PaymentAccount = dto.PaymentAccount;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Payment method updated", paymentMethod = prof.PaymentMethod, paymentAccount = prof.PaymentAccount });
        }
    }

    // ═══════════════════════════════════════════════
    // DTOs
    // ═══════════════════════════════════════════════
    public class InitiatePaymentRequest
    {
        public int      SessionId   { get; set; }
        public string?  PhoneNumber { get; set; }
        public decimal? Amount      { get; set; }
    }

    public class UpdatePlatformSettingsDto
    {
        public int PlatformPercentage     { get; set; }
        public int ProfessionalPercentage { get; set; }
    }

    public class UpdatePaymentMethodDto
    {
        public string PaymentMethod  { get; set; } = "Mpesa";
        public string PaymentAccount { get; set; } = string.Empty;
    }
}