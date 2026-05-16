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
    public class SessionController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly TimeZoneInfo _eastAfricaTime;
        private readonly IDailyService _dailyService;
        private readonly ILogger<SessionController> _logger;

        public SessionController(AppDbContext context, IDailyService dailyService, ILogger<SessionController> logger)
        {
            _context = context;
            _dailyService = dailyService;
            _logger = logger;

            try
            {
                _eastAfricaTime = TimeZoneInfo.FindSystemTimeZoneById("E. Africa Standard Time");
            }
            catch
            {
                try
                {
                    _eastAfricaTime = TimeZoneInfo.FindSystemTimeZoneById("Africa/Nairobi");
                }
                catch
                {
                    _eastAfricaTime = TimeZoneInfo.CreateCustomTimeZone("EAT", TimeSpan.FromHours(3), "East Africa Time", "EAT");
                }
            }
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
                    _logger.LogInformation($"Session {session.Id} already has a meeting URL: {session.MeetingUrl}");
                    return;
                }

                var roomName = $"kaizen-session-{session.Id}";
                var expiryTime = session.SessionDate.AddHours(2);
                if (expiryTime < DateTime.UtcNow)
                    expiryTime = DateTime.UtcNow.AddHours(2);

                int expiryMinutes = (int)(expiryTime - DateTime.UtcNow).TotalMinutes;
                if (expiryMinutes < 60) expiryMinutes = 120;

                _logger.LogInformation($"Creating Daily.co room '{roomName}' for session {session.Id}");
                var result = await _dailyService.CreateRoom(roomName, expiryMinutes);

                if (result.Success && !string.IsNullOrEmpty(result.RoomUrl))
                {
                    session.MeetingUrl = result.RoomUrl;
                    session.MeetingRoomName = result.RoomName;
                    _logger.LogInformation($"✅ Video room created for session {session.Id}: {result.RoomUrl}");
                }
                else
                {
                    _logger.LogError($"❌ Failed to create video room for session {session.Id}: {result.ErrorMessage}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Exception creating video room for session {session.Id}");
            }
        }

        private string FormatKenyaDateTime(DateTime utcDateTime)
        {
            return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, _eastAfricaTime)
                .ToString("dd MMM yyyy, hh:mm tt");
        }

        private static bool CanCompleteSession(Session session, DateTime nowUtc)
        {
            return session.PaymentStatus == "Paid" && session.SessionDate <= nowUtc;
        }

        private static bool IsInvalidCompletedSession(Session session, DateTime nowUtc)
        {
            return session.Status == "Completed" && !CanCompleteSession(session, nowUtc);
        }

        private string? GetCurrentAvailabilityMessage(ProfessionalProfile? profile)
        {
            if (profile == null) return null;

            if (!profile.IsAcceptingSessions)
                return "Sorry, professional is not currently available.";

            var nowUtc = DateTime.UtcNow;
            if (profile.AvailableFromUtc.HasValue && nowUtc < profile.AvailableFromUtc.Value)
                return $"Sorry, professional is not currently available. They will be available from {FormatKenyaDateTime(profile.AvailableFromUtc.Value)}.";

            if (profile.AvailableUntilUtc.HasValue && nowUtc >= profile.AvailableUntilUtc.Value)
                return "Sorry, professional is not currently available.";

            return null;
        }

        private static bool IsProfessionalAvailableForSlot(ProfessionalProfile? profile, DateTime slotUtc)
        {
            if (profile == null || !profile.IsAcceptingSessions)
                return false;

            if (profile.AvailableFromUtc.HasValue && slotUtc < profile.AvailableFromUtc.Value)
                return false;

            if (profile.AvailableUntilUtc.HasValue && slotUtc >= profile.AvailableUntilUtc.Value)
                return false;

            return true;
        }

        // GET api/session/professionals
        [HttpGet("professionals")]
        public async Task<IActionResult> GetProfessionals()
        {
            var professionalUsers = await _context.Users
                .Where(u => u.Role == "Professional"
                    && u.IsActive
                    && u.FirstName != "[Deleted]"
                    && !u.Email.StartsWith("deleted_")
                    && !u.Email.EndsWith("@deleted.kaizen"))
                .Include(u => u.ProfessionalProfile)
                .ToListAsync();

            var professionals = professionalUsers
                .Select(u => new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    FullName = u.FirstName + " " + u.LastName,
                    u.Email,
                    Profile = u.ProfessionalProfile != null ? new
                    {
                        u.ProfessionalProfile.Bio,
                        u.ProfessionalProfile.Specialization,
                        u.ProfessionalProfile.YearsOfExperience,
                        u.ProfessionalProfile.Education,
                        u.ProfessionalProfile.Certifications,
                        u.ProfessionalProfile.LicenseNumber,
                        u.ProfessionalProfile.Experience,
                        u.ProfessionalProfile.AverageRating,
                        u.ProfessionalProfile.IsAcceptingSessions,
                        u.ProfessionalProfile.AvailableFromUtc,
                        u.ProfessionalProfile.AvailableUntilUtc,
                        CurrentAvailabilityMessage = GetCurrentAvailabilityMessage(u.ProfessionalProfile)
                    } : null
                })
                .ToList();

            return Ok(professionals);
        }

        [HttpGet("available/{professionalId}")]
        public async Task<IActionResult> GetAvailableSlots(int professionalId, DateTime? date)
        {
            try
            {
                var professional = await _context.Users
                    .Include(u => u.ProfessionalProfile)
                    .FirstOrDefaultAsync(u => u.Id == professionalId && u.Role == "Professional" && u.IsActive);

                if (professional == null)
                    return NotFound(new { message = "Professional not found." });

                var currentAvailabilityMessage = GetCurrentAvailabilityMessage(professional.ProfessionalProfile);
                if (!string.IsNullOrEmpty(currentAvailabilityMessage))
                    return Ok(new { date = date, availableSlots = new List<object>(), message = currentAvailabilityMessage });

                DateTime kenyaNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _eastAfricaTime);

                DateTime targetKenyaDate;
                if (date.HasValue)
                    targetKenyaDate = new DateTime(date.Value.Year, date.Value.Month, date.Value.Day, 0, 0, 0, DateTimeKind.Unspecified);
                else
                    targetKenyaDate = kenyaNow.Date;

                if (targetKenyaDate.Date < kenyaNow.Date)
                    return Ok(new { date = targetKenyaDate, availableSlots = new List<object>() });

                DateTime startOfDayUtc = TimeZoneInfo.ConvertTimeToUtc(targetKenyaDate, _eastAfricaTime);
                DateTime endOfDayUtc = startOfDayUtc.AddDays(1);

                var existingBookings = await _context.Sessions
                    .Where(s => s.ProfessionalId == professionalId
                        && s.SessionDate >= startOfDayUtc
                        && s.SessionDate < endOfDayUtc
                        && s.Status != "Cancelled")
                    .ToListAsync();

                var bookedHours = existingBookings
                    .Select(s => TimeZoneInfo.ConvertTimeFromUtc(s.SessionDate, _eastAfricaTime).Hour)
                    .ToHashSet();

                var availableSlots = new List<object>();

                for (int hour = 9; hour <= 16; hour++)
                {
                    if (!bookedHours.Contains(hour))
                    {
                        DateTime kenyaSlotTime = new DateTime(
                            targetKenyaDate.Year, targetKenyaDate.Month, targetKenyaDate.Day,
                            hour, 0, 0, DateTimeKind.Unspecified);

                        DateTime utcSlotTime = TimeZoneInfo.ConvertTimeToUtc(kenyaSlotTime, _eastAfricaTime);
                        if (kenyaSlotTime <= kenyaNow)
                            continue;

                        var profile = professional.ProfessionalProfile;
                        if (profile?.AvailableFromUtc.HasValue == true && utcSlotTime < profile.AvailableFromUtc.Value)
                            continue;

                        if (profile?.AvailableUntilUtc.HasValue == true && utcSlotTime >= profile.AvailableUntilUtc.Value)
                            continue;

                        string formattedTime = hour switch
                        {
                            9  => "09:00 AM",
                            10 => "10:00 AM",
                            11 => "11:00 AM",
                            12 => "12:00 PM",
                            13 => "01:00 PM",
                            14 => "02:00 PM",
                            15 => "03:00 PM",
                            16 => "04:00 PM",
                            _  => $"{hour:00}:00 {(hour < 12 ? "AM" : "PM")}"
                        };

                        availableSlots.Add(new { time = utcSlotTime, formattedTime });
                    }
                }

                var hasAvailabilityWindow = professional.ProfessionalProfile?.AvailableFromUtc.HasValue == true
                    || professional.ProfessionalProfile?.AvailableUntilUtc.HasValue == true;

                return Ok(new
                {
                    date = targetKenyaDate,
                    availableSlots,
                    message = hasAvailabilityWindow && availableSlots.Count == 0
                        ? "Professional not available."
                        : null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching available slots.", error = ex.Message });
            }
        }

        [HttpPost("book")]
        public async Task<IActionResult> BookSession(CreateSessionDto dto)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                int clientId = int.Parse(userIdClaim);

                var role = User.FindFirst(ClaimTypes.Role)?.Value;
                if (role != "Client")
                    return Forbid("Only clients can book sessions.");

                var professional = await _context.Users
                    .Include(u => u.ProfessionalProfile)
                    .FirstOrDefaultAsync(u => u.Id == dto.ProfessionalId && u.Role == "Professional" && u.IsActive);

                if (professional == null)
                    return BadRequest("Selected professional not found.");

                var hasUnratedCompletedSession = await _context.Sessions
                    .Where(s => s.ClientId == clientId && s.Status == "Completed")
                    .AnyAsync(s => !_context.Ratings.Any(r => r.SessionId == s.Id && r.ClientId == clientId));

                if (hasUnratedCompletedSession)
                    return BadRequest(new
                    {
                        code = "UNRATED_SESSION_REQUIRED",
                        message = "Please rate your completed session before booking another one."
                    });

                DateTime utcReceived = dto.SessionDate.ToUniversalTime();
                DateTime kenyaTime  = TimeZoneInfo.ConvertTimeFromUtc(utcReceived, _eastAfricaTime);
                DateTime kenyaNow   = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _eastAfricaTime);

                int hour = kenyaTime.Hour;
                if (hour < 9 || hour >= 17)
                    return BadRequest($"Sessions are only available between 9 AM and 5 PM Kenya time. You selected {hour:00}:00");

                if (kenyaTime.Date < kenyaNow.Date)
                    return BadRequest("Cannot book sessions in the past.");

                if (kenyaTime.Date == kenyaNow.Date && kenyaTime <= kenyaNow)
                    return BadRequest("Cannot book sessions in the past.");

                var professionalProfile = professional.ProfessionalProfile;
                var currentAvailabilityMessage = GetCurrentAvailabilityMessage(professionalProfile);
                if (!string.IsNullOrEmpty(currentAvailabilityMessage))
                    return BadRequest(new { message = currentAvailabilityMessage });

                if (professionalProfile?.AvailableFromUtc.HasValue == true && utcReceived < professionalProfile.AvailableFromUtc.Value)
                    return BadRequest(new { message = "Professional not available." });

                if (professionalProfile?.AvailableUntilUtc.HasValue == true && utcReceived >= professionalProfile.AvailableUntilUtc.Value)
                    return BadRequest(new { message = "Professional not available." });

                var existingSession = await _context.Sessions
                    .FirstOrDefaultAsync(s => s.ProfessionalId == dto.ProfessionalId
                        && s.SessionDate == utcReceived
                        && s.Status != "Cancelled");

                if (existingSession != null)
                    return BadRequest("This time slot is already booked. Please select another time.");

                var session = new Session
                {
                    ClientId       = clientId,
                    ProfessionalId = dto.ProfessionalId,
                    SessionDate    = utcReceived,
                    Status         = "Confirmed",
                    PaymentStatus  = "Pending",
                    Amount         = 10,
                    Notes          = dto.Notes,
                    CreatedAt      = DateTime.UtcNow
                };

                _context.Sessions.Add(session);
                await _context.SaveChangesAsync();

                string displayDate = kenyaTime.ToString("dd MMM yyyy, hh:mm tt");

                return Ok(new
                {
                    message       = "Session booked and confirmed. Please complete payment.",
                    sessionId     = session.Id,
                    amount        = session.Amount,
                    paymentStatus = session.PaymentStatus,
                    sessionDate   = displayDate
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error booking session.", error = ex.Message });
            }
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, UpdateSessionDto dto)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                int userId = int.Parse(userIdClaim);

                var session = await _context.Sessions.FindAsync(id);
                if (session == null) return NotFound("Session not found.");

                var role = User.FindFirst(ClaimTypes.Role)?.Value;
                if (role != "Professional" || session.ProfessionalId != userId)
                    return Forbid("Only the assigned professional can update session status.");

                var allowedStatuses = new[] { "Confirmed", "Completed", "Cancelled" };
                if (!allowedStatuses.Contains(dto.Status))
                    return BadRequest("Status must be Confirmed, Completed or Cancelled.");

                var nowUtc = DateTime.UtcNow;
                var requestedStatus = dto.Status;
                var effectiveStatus = requestedStatus == "Completed" && !CanCompleteSession(session, nowUtc)
                    ? "Cancelled"
                    : requestedStatus;

                session.Status    = effectiveStatus;
                session.UpdatedAt = nowUtc;

                if (dto.Notes != null)
                    session.Notes = dto.Notes;

                _logger.LogInformation($"UpdateStatus: Session {session.Id} -> {effectiveStatus}, PaymentStatus: {session.PaymentStatus}");

                if (effectiveStatus == "Confirmed"
                    && session.PaymentStatus == "Paid"
                    && string.IsNullOrEmpty(session.MeetingUrl))
                {
                    _logger.LogInformation($"Session {session.Id} already paid — creating video room on confirmation");
                    await CreateVideoRoom(session);
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message         = requestedStatus == "Completed" && effectiveStatus == "Cancelled"
                        ? "Session cancelled because payment was not successful or the session has not been conducted."
                        : $"Session {effectiveStatus.ToLower()} successfully.",
                    status          = effectiveStatus,
                    meetingUrl      = session.MeetingUrl,
                    meetingRoomName = session.MeetingRoomName,
                    awaitingPayment = effectiveStatus == "Confirmed" && session.PaymentStatus != "Paid"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating session status.", error = ex.Message });
            }
        }

        [HttpPost("fix-meeting/{sessionId}")]
        [Authorize(Roles = "Admin,Professional")]
        public async Task<IActionResult> FixMeetingUrl(int sessionId)
        {
            var session = await _context.Sessions.FindAsync(sessionId);
            if (session == null) return NotFound("Session not found");

            _logger.LogInformation($"FixMeetingUrl: Session {session.Id} - Status: {session.Status}, PaymentStatus: {session.PaymentStatus}");

            if (session.Status == "Confirmed"
                && session.PaymentStatus == "Paid"
                && string.IsNullOrEmpty(session.MeetingUrl))
            {
                await CreateVideoRoom(session);
                await _context.SaveChangesAsync();
                return Ok(new
                {
                    message    = "Meeting URL created successfully",
                    meetingUrl = session.MeetingUrl,
                    sessionId  = session.Id
                });
            }

            return Ok(new
            {
                message = session.MeetingUrl != null
                    ? "Meeting URL already exists"
                    : session.PaymentStatus != "Paid"
                        ? "Cannot create room — payment not yet completed"
                        : "Session not confirmed",
                meetingUrl    = session.MeetingUrl,
                status        = session.Status,
                paymentStatus = session.PaymentStatus
            });
        }

        [HttpGet("my-sessions")]
        public async Task<IActionResult> GetMySessions()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                int userId = int.Parse(userIdClaim);

                var role = User.FindFirst(ClaimTypes.Role)?.Value;

                IQueryable<Session> query;

                if (role == "Client")
                {
                    query = _context.Sessions
                        .Include(s => s.Professional)
                        .ThenInclude(p => p.ProfessionalProfile)
                        .Where(s => s.ClientId == userId && s.Professional.IsActive);
                }
                else if (role == "Professional")
                {
                    query = _context.Sessions
                        .Include(s => s.Client)
                        .ThenInclude(c => c.ClientProfile)
                        .Where(s => s.ProfessionalId == userId && s.Client.IsActive);
                }
                else return Forbid();

                var sessions = await query
                    .OrderByDescending(s => s.SessionDate)
                    .ToListAsync();

                var pendingSessions = sessions
                    .Where(s => s.Status == "Pending" && s.PaymentStatus != "Paid")
                    .ToList();

                if (pendingSessions.Any())
                {
                    var professionalIds = pendingSessions
                        .Select(s => s.ProfessionalId)
                        .Distinct()
                        .ToList();

                    var profiles = await _context.ProfessionalProfiles
                        .Where(p => professionalIds.Contains(p.UserId))
                        .ToDictionaryAsync(p => p.UserId);

                    foreach (var pending in pendingSessions)
                    {
                        profiles.TryGetValue(pending.ProfessionalId, out var profile);
                        if (IsProfessionalAvailableForSlot(profile, pending.SessionDate))
                        {
                            pending.Status = "Confirmed";
                            pending.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    if (_context.ChangeTracker.HasChanges())
                        await _context.SaveChangesAsync();
                }

                var nowUtc = DateTime.UtcNow;
                foreach (var session in sessions.Where(s => IsInvalidCompletedSession(s, nowUtc)))
                {
                    session.Status = "Cancelled";
                    session.UpdatedAt = nowUtc;
                }

                if (_context.ChangeTracker.HasChanges())
                    await _context.SaveChangesAsync();

                var ratedSessionIds = await _context.Ratings
                    .Where(r => r.ClientId == userId)
                    .Select(r => r.SessionId)
                    .ToListAsync();
                var ratedSessionIdSet = ratedSessionIds.ToHashSet();

                var result = sessions.Select(s => new
                {
                    s.Id,
                    s.SessionDate,
                    FormattedDate = TimeZoneInfo.ConvertTimeFromUtc(s.SessionDate, _eastAfricaTime)
                        .ToString("dd MMM yyyy, hh:mm tt"),
                    s.Status,
                    s.PaymentStatus,
                    s.Amount,
                    s.Notes,
                    s.MeetingUrl,
                    s.MeetingRoomName,
                    HasRating = ratedSessionIdSet.Contains(s.Id),
                    CanRate = role == "Client" && s.Status == "Completed" && !ratedSessionIdSet.Contains(s.Id),
                    CanJoin = !string.IsNullOrEmpty(s.MeetingUrl)
                              && s.Status == "Confirmed"
                              && s.PaymentStatus == "Paid"
                              && nowUtc >= s.SessionDate.AddMinutes(-5)
                              && nowUtc <= s.SessionDate.AddHours(1),
                    CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(s.CreatedAt, _eastAfricaTime)
                        .ToString("dd MMM yyyy, hh:mm tt"),
                    Client = role == "Professional" ? new
                    {
                        s.Client.Id,
                        ClientFullName  = s.Client.FirstName + " " + s.Client.LastName,
                        ClientFirstName = s.Client.FirstName,
                        ClientLastName  = s.Client.LastName,
                        s.Client.Email,
                        PhoneNumber = s.Client.PhoneNumber,
                        EmergencyContactName = s.Client.ClientProfile != null ? s.Client.ClientProfile.EmergencyContact : "",
                        EmergencyContactPhone = s.Client.ClientProfile != null ? s.Client.ClientProfile.EmergencyContactPhone : "",
                        EmergencyContactEmail = s.Client.ClientProfile != null ? s.Client.ClientProfile.EmergencyContactEmail : ""
                    } : (object?)null,
                    Professional = role == "Client" ? new
                    {
                        s.Professional.Id,
                        ProfessionalFullName  = s.Professional.FirstName + " " + s.Professional.LastName,
                        ProfessionalFirstName = s.Professional.FirstName,
                        ProfessionalLastName  = s.Professional.LastName,
                        s.Professional.Email,
                        Bio            = s.Professional.ProfessionalProfile?.Bio,
                        Specialization = s.Professional.ProfessionalProfile?.Specialization
                    } : (object?)null
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching sessions.", error = ex.Message });
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Client")]
        public async Task<IActionResult> DeleteSession(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                int userId = int.Parse(userIdClaim);

                var session = await _context.Sessions
                    .FirstOrDefaultAsync(s => s.Id == id && s.ClientId == userId);

                if (session == null)
                    return NotFound(new { message = "Session not found or you don't have permission to delete it." });

                if (session.Status == "Completed")
                    return BadRequest(new { message = "Cannot delete a completed session." });

                if (session.Status == "Confirmed")
                    return BadRequest(new { message = "Cannot delete a confirmed session. Please contact the professional to cancel." });

                if (session.PaymentStatus == "Paid")
                    return BadRequest(new { message = "Cannot delete a session that has already been paid for." });

                _context.Sessions.Remove(session);
                await _context.SaveChangesAsync();

                if (!string.IsNullOrEmpty(session.MeetingRoomName))
                {
                    try
                    {
                        await _dailyService.DeleteRoom(session.MeetingRoomName);
                        _logger.LogInformation($"Deleted Daily room: {session.MeetingRoomName}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning($"Failed to delete Daily room: {ex.Message}");
                    }
                }

                return Ok(new { message = "Session cancelled successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting session.", error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                int userId = int.Parse(userIdClaim);

                var session = await _context.Sessions
                    .Include(s => s.Client)
                    .ThenInclude(c => c.ClientProfile)
                    .Include(s => s.Professional)
                    .ThenInclude(p => p.ProfessionalProfile)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (session == null) return NotFound("Session not found.");

                var role = User.FindFirst(ClaimTypes.Role)?.Value;
                if (session.ClientId != userId && session.ProfessionalId != userId && role != "Admin")
                    return Forbid();

                if (role != "Admin"
                    && ((role == "Client" && !session.Professional.IsActive)
                        || (role == "Professional" && !session.Client.IsActive)))
                {
                    return NotFound("Session not found.");
                }

                var nowUtc = DateTime.UtcNow;

                return Ok(new
                {
                    session.Id,
                    session.SessionDate,
                    FormattedDate = TimeZoneInfo.ConvertTimeFromUtc(session.SessionDate, _eastAfricaTime)
                        .ToString("dd MMM yyyy, hh:mm tt"),
                    session.Status,
                    session.PaymentStatus,
                    session.Amount,
                    session.Notes,
                    session.MeetingUrl,
                    session.MeetingRoomName,
                    CanJoin = !string.IsNullOrEmpty(session.MeetingUrl)
                              && session.Status == "Confirmed"
                              && session.PaymentStatus == "Paid"
                              && nowUtc >= session.SessionDate.AddMinutes(-5)
                              && nowUtc <= session.SessionDate.AddHours(1),
                    CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(session.CreatedAt, _eastAfricaTime)
                        .ToString("dd MMM yyyy, hh:mm tt"),
                    UpdatedAt = session.UpdatedAt.HasValue
                        ? TimeZoneInfo.ConvertTimeFromUtc(session.UpdatedAt.Value, _eastAfricaTime)
                            .ToString("dd MMM yyyy, hh:mm tt")
                        : null,
                    Client = new
                    {
                        session.Client.Id,
                        ClientFullName  = session.Client.FirstName + " " + session.Client.LastName,
                        session.Client.Email,
                        PhoneNumber = session.Client.PhoneNumber,
                        EmergencyContactName = session.Client.ClientProfile?.EmergencyContact ?? "",
                        EmergencyContactPhone = session.Client.ClientProfile?.EmergencyContactPhone ?? "",
                        EmergencyContactEmail = session.Client.ClientProfile?.EmergencyContactEmail ?? ""
                    },
                    Professional = new
                    {
                        session.Professional.Id,
                        ProfessionalFullName  = session.Professional.FirstName + " " + session.Professional.LastName,
                        session.Professional.Email,
                        Bio            = session.Professional.ProfessionalProfile?.Bio,
                        Specialization = session.Professional.ProfessionalProfile?.Specialization
                    }
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching session.", error = ex.Message });
            }
        }
    }
}
