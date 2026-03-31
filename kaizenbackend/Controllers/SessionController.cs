using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using kaizenbackend.Data;
using kaizenbackend.DTOs;
using kaizenbackend.Models;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SessionController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly TimeZoneInfo _eastAfricaTime;

        public SessionController(AppDbContext context)
        {
            _context = context;
            
            // Initialize Kenya timezone (EAT = UTC+3)
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
                    // Fallback for Windows
                    _eastAfricaTime = TimeZoneInfo.FindSystemTimeZoneById("Eastern Standard Time");
                }
            }
        }

        // GET: api/session/professionals
        [HttpGet("professionals")]
        public async Task<IActionResult> GetProfessionals()
        {
            var professionals = await _context.Users
                .Where(u => u.Role == "Professional")
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    Profile = u.ProfessionalProfile != null ? new
                    {
                        u.ProfessionalProfile.Bio,
                        u.ProfessionalProfile.Specialization
                    } : null
                })
                .ToListAsync();

            return Ok(professionals);
        }

        // GET: api/session/available/{professionalId}
        [HttpGet("available/{professionalId}")]
        public async Task<IActionResult> GetAvailableSlots(int professionalId, DateTime? date)
        {
            try
            {
                // Check if professional exists
                var professional = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == professionalId && u.Role == "Professional");

                if (professional == null)
                    return NotFound(new { message = "Professional not found." });

                // Get current Kenya time
                DateTime kenyaNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _eastAfricaTime);
                
                // Get the target date in Kenya time
                DateTime targetKenyaDate;
                if (date.HasValue)
                {
                    // Create a clean date with no time component
                    targetKenyaDate = new DateTime(date.Value.Year, date.Value.Month, date.Value.Day, 0, 0, 0, DateTimeKind.Unspecified);
                }
                else
                {
                    targetKenyaDate = kenyaNow.Date;
                }
                
                // Don't show past dates
                if (targetKenyaDate.Date < kenyaNow.Date)
                {
                    return Ok(new
                    {
                        date = targetKenyaDate,
                        availableSlots = new List<object>()
                    });
                }
                
                // Convert Kenya date to UTC for database query
                DateTime startOfDayUtc = TimeZoneInfo.ConvertTimeToUtc(targetKenyaDate, _eastAfricaTime);
                DateTime endOfDayUtc = startOfDayUtc.AddDays(1);

                // Get existing bookings for this professional on this date
                var existingBookings = await _context.Sessions
                    .Where(s => s.ProfessionalId == professionalId 
                        && s.SessionDate >= startOfDayUtc 
                        && s.SessionDate < endOfDayUtc
                        && s.Status != "Cancelled")
                    .ToListAsync();

                // Get booked hours in Kenya time
                var bookedHours = existingBookings
                    .Select(s => TimeZoneInfo.ConvertTimeFromUtc(s.SessionDate, _eastAfricaTime).Hour)
                    .ToHashSet();

                // Generate available time slots (9 AM to 5 PM in Kenya time)
                var availableSlots = new List<object>();
                
                for (int hour = 9; hour <= 16; hour++) // 9 AM to 4 PM
                {
                    if (!bookedHours.Contains(hour))
                    {
                        // Create the time in Kenya time
                        DateTime kenyaSlotTime = new DateTime(
                            targetKenyaDate.Year, 
                            targetKenyaDate.Month, 
                            targetKenyaDate.Day, 
                            hour, 0, 0, 
                            DateTimeKind.Unspecified);
                        
                        // Convert to UTC for sending to frontend
                        DateTime utcSlotTime = TimeZoneInfo.ConvertTimeToUtc(kenyaSlotTime, _eastAfricaTime);
                        
                        string formattedTime = hour switch
                        {
                            9 => "09:00 AM",
                            10 => "10:00 AM",
                            11 => "11:00 AM",
                            12 => "12:00 PM",
                            13 => "01:00 PM",
                            14 => "02:00 PM",
                            15 => "03:00 PM",
                            16 => "04:00 PM",
                            _ => $"{hour:00}:00 {(hour < 12 ? "AM" : "PM")}"
                        };
                        
                        availableSlots.Add(new
                        {
                            time = utcSlotTime,
                            formattedTime = formattedTime
                        });
                    }
                }

                return Ok(new
                {
                    date = targetKenyaDate,
                    availableSlots = availableSlots
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetAvailableSlots: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                return StatusCode(500, new { message = "An error occurred while fetching available slots.", error = ex.Message });
            }
        }

        // POST: api/session/book
[HttpPost("book")]
public async Task<IActionResult> BookSession([FromBody] CreateSessionDto request)
{
    try
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null) return Unauthorized();
        int clientId = int.Parse(userIdClaim);

        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Client")
            return Forbid("Only clients can book sessions.");

        // Verify professional exists
        var professional = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.ProfessionalId && u.Role == "Professional");

        if (professional == null)
            return BadRequest("Selected professional not found.");

        // Parse the session date - handle different formats
        DateTime sessionDate;
        try
        {
            // Try to parse the date from the request
            sessionDate = request.SessionDate;
            
            // If the date is in UTC, convert to local for validation
            if (sessionDate.Kind == DateTimeKind.Utc)
            {
                sessionDate = sessionDate.ToLocalTime();
            }
        }
        catch (Exception)
        {
            return BadRequest("Invalid session date format. Please use a valid date and time.");
        }

        // Check if slot is within working hours (9 AM - 5 PM Kenya time)
        int hour = sessionDate.Hour;
        if (hour < 9 || hour >= 17)
            return BadRequest($"Sessions are only available between 9 AM and 5 PM (Kenya time). You selected {hour:00}:00");

        // Check if the date is in the past
        if (sessionDate.Date < DateTime.Now.Date)
            return BadRequest("Cannot book sessions in the past.");

        // Convert to UTC for database storage
        DateTime utcSessionDate = sessionDate.ToUniversalTime();

        // Check if slot is already booked
        var existingSession = await _context.Sessions
            .FirstOrDefaultAsync(s => s.ProfessionalId == request.ProfessionalId 
                && s.SessionDate == utcSessionDate
                && s.Status != "Cancelled");

        if (existingSession != null)
            return BadRequest("This time slot is already booked. Please select another time.");

        // Create the session with UTC date
        var session = new Session
        {
            ClientId = clientId,
            ProfessionalId = request.ProfessionalId,
            SessionDate = utcSessionDate,
            Status = "Pending",
            PaymentStatus = "Pending",
            Amount = 1500,
            Notes = request.Notes ?? "",
            CreatedAt = DateTime.UtcNow
        };

        _context.Sessions.Add(session);
        await _context.SaveChangesAsync();

        // Format the date for display in Kenya time
        string displayDate = sessionDate.ToString("dd MMM yyyy, hh:mm tt");

        return Ok(new
        {
            message = "Session booked successfully! Please complete payment to confirm your booking.",
            sessionId = session.Id,
            amount = session.Amount,
            paymentStatus = session.PaymentStatus,
            sessionDate = displayDate
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error in BookSession: {ex.Message}");
        return StatusCode(500, new { message = "An error occurred while booking the session.", error = ex.Message });
    }
}
                   
        // GET: api/session/my-sessions
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
                        .Where(s => s.ClientId == userId);
                }
                else if (role == "Professional")
                {
                    query = _context.Sessions
                        .Include(s => s.Client)
                        .Where(s => s.ProfessionalId == userId);
                }
                else
                {
                    return Forbid();
                }

                var sessions = await query
                    .OrderByDescending(s => s.SessionDate)
                    .ToListAsync();

                var result = sessions.Select(s => new
                {
                    s.Id,
                    s.SessionDate,
                    FormattedDate = TimeZoneInfo.ConvertTimeFromUtc(s.SessionDate, _eastAfricaTime).ToString("dd MMM yyyy, hh:mm tt"),
                    s.Status,
                    s.PaymentStatus,
                    s.Amount,
                    s.Notes,
                    CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(s.CreatedAt, _eastAfricaTime).ToString("dd MMM yyyy, hh:mm tt"),
                    Client = role == "Professional" ? new
                    {
                        s.Client.Id,
                        s.Client.FullName,
                        s.Client.Email
                    } : null,
                    Professional = role == "Client" ? new
                    {
                        s.Professional.Id,
                        s.Professional.FullName,
                        s.Professional.Email,
                        Bio = s.Professional.ProfessionalProfile != null ? s.Professional.ProfessionalProfile.Bio : null,
                        Specialization = s.Professional.ProfessionalProfile != null ? s.Professional.ProfessionalProfile.Specialization : null
                    } : null
                });

                return Ok(result);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetMySessions: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred while fetching sessions.", error = ex.Message });
            }
        }

        // PUT: api/session/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, UpdateSessionDto dto)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                int userId = int.Parse(userIdClaim);

                var session = await _context.Sessions.FindAsync(id);
                if (session == null)
                    return NotFound("Session not found.");

                var role = User.FindFirst(ClaimTypes.Role)?.Value;

                // Only professional can update status of their sessions
                if (role != "Professional" || session.ProfessionalId != userId)
                    return Forbid("Only the assigned professional can update session status.");

                var allowedStatuses = new[] { "Confirmed", "Completed", "Cancelled" };
                if (!allowedStatuses.Contains(dto.Status))
                    return BadRequest("Status must be Confirmed, Completed, or Cancelled.");

                session.Status = dto.Status;
                session.UpdatedAt = DateTime.UtcNow;
                if (dto.Notes != null)
                    session.Notes = dto.Notes;

                await _context.SaveChangesAsync();

                return Ok(new { message = $"Session {dto.Status.ToLower()} successfully." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in UpdateStatus: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred while updating session status.", error = ex.Message });
            }
        }

        // GET: api/session/{id}
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
                    .Include(s => s.Professional)
                    .ThenInclude(p => p.ProfessionalProfile)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (session == null)
                    return NotFound("Session not found.");

                // Check if user is authorized to view this session
                var role = User.FindFirst(ClaimTypes.Role)?.Value;
                if (session.ClientId != userId && session.ProfessionalId != userId && role != "Admin")
                    return Forbid();

                return Ok(new
                {
                    session.Id,
                    SessionDate = session.SessionDate,
                    FormattedDate = TimeZoneInfo.ConvertTimeFromUtc(session.SessionDate, _eastAfricaTime).ToString("dd MMM yyyy, hh:mm tt"),
                    session.Status,
                    session.PaymentStatus,
                    session.Amount,
                    session.Notes,
                    CreatedAt = TimeZoneInfo.ConvertTimeFromUtc(session.CreatedAt, _eastAfricaTime).ToString("dd MMM yyyy, hh:mm tt"),
                    UpdatedAt = session.UpdatedAt.HasValue ? TimeZoneInfo.ConvertTimeFromUtc(session.UpdatedAt.Value, _eastAfricaTime).ToString("dd MMM yyyy, hh:mm tt") : null,
                    Client = new
                    {
                        session.Client.Id,
                        session.Client.FullName,
                        session.Client.Email
                    },
                    Professional = new
                    {
                        session.Professional.Id,
                        session.Professional.FullName,
                        session.Professional.Email,
                        Bio = session.Professional.ProfessionalProfile != null ? session.Professional.ProfessionalProfile.Bio : null,
                        Specialization = session.Professional.ProfessionalProfile != null ? session.Professional.ProfessionalProfile.Specialization : null
                    }
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetById: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred while fetching session details.", error = ex.Message });
            }
        }
    }
}