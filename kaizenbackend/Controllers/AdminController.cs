using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using kaizenbackend.Data;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        private bool IsAdmin()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            return role == "Admin";
        }

        // GET: api/admin/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            if (!IsAdmin()) return Forbid();

            var totalClients = await _context.Users
                .CountAsync(u => u.Role == "Client");

            var totalProfessionals = await _context.Users
                .CountAsync(u => u.Role == "Professional");

            var totalSessions = await _context.Sessions.CountAsync();

            var pendingSessions = await _context.Sessions
                .CountAsync(s => s.Status == "Pending");

            var confirmedSessions = await _context.Sessions
                .CountAsync(s => s.Status == "Confirmed");

            var completedSessions = await _context.Sessions
                .CountAsync(s => s.Status == "Completed");

            var cancelledSessions = await _context.Sessions
                .CountAsync(s => s.Status == "Cancelled");

            var totalAssessments = await _context.SelfAssessments.CountAsync();

            var totalResources = await _context.Resources.CountAsync();

            var totalRevenue = await _context.Sessions
                .Where(s => s.PaymentStatus == "Paid")
                .SumAsync(s => (decimal?)s.Amount) ?? 0;

            var assessmentsByLevel = new
            {
                good     = await _context.SelfAssessments.CountAsync(a => a.OverallLevel == "Good"),
                mild     = await _context.SelfAssessments.CountAsync(a => a.OverallLevel == "Mild"),
                moderate = await _context.SelfAssessments.CountAsync(a => a.OverallLevel == "Moderate"),
                severe   = await _context.SelfAssessments.CountAsync(a => a.OverallLevel == "Severe"),
            };

            var primaryConcerns = new
            {
                anxiety    = await _context.SelfAssessments.CountAsync(a => a.Primaryconcern == "Anxiety"),
                depression = await _context.SelfAssessments.CountAsync(a => a.Primaryconcern == "Depression"),
                loneliness = await _context.SelfAssessments.CountAsync(a => a.Primaryconcern == "Loneliness"),
            };

            return Ok(new
            {
                totalClients,
                totalProfessionals,
                totalSessions,
                totalAssessments,
                totalResources,
                totalRevenue,
                sessions = new
                {
                    pending   = pendingSessions,
                    confirmed = confirmedSessions,
                    completed = completedSessions,
                    cancelled = cancelledSessions
                },
                assessmentsByLevel,
                primaryConcerns
            });
        }

        // GET: api/admin/users
        [HttpGet("users")]
        public async Task<IActionResult> GetAllUsers()
        {
            if (!IsAdmin()) return Forbid();

            var users = await _context.Users
                .OrderBy(u => u.Role)
                .ThenBy(u => u.FullName)
                .Select(u => new
                {
                    u.Id,
                    u.FullName,
                    u.Email,
                    u.Role,
                    u.DateRegistered,
                    profile = u.ProfessionalProfile != null ? new
                    {
                        u.ProfessionalProfile.Bio,
                        u.ProfessionalProfile.Specialization
                    } : null
                })
                .ToListAsync();

            return Ok(users);
        }

        // DELETE: api/admin/users/{id}
        [HttpDelete("users/{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            if (!IsAdmin()) return Forbid();

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim != null && int.Parse(userIdClaim) == id)
                return BadRequest("You cannot delete your own admin account.");

            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"{user.FullName} has been removed from the system." });
        }

        // GET: api/admin/sessions
        [HttpGet("sessions")]
        public async Task<IActionResult> GetAllSessions()
        {
            if (!IsAdmin()) return Forbid();

            var sessions = await _context.Sessions
                .Include(s => s.Client)
                .Include(s => s.Professional)
                .OrderByDescending(s => s.SessionDate)
                .Select(s => new
                {
                    s.Id,
                    s.SessionDate,
                    s.Status,
                    s.PaymentStatus,
                    s.Amount,
                    s.Notes,
                    s.CreatedAt,
                    client = new
                    {
                        s.Client.Id,
                        s.Client.FullName,
                        s.Client.Email
                    },
                    professional = new
                    {
                        s.Professional.Id,
                        s.Professional.FullName,
                        s.Professional.Email
                    }
                })
                .ToListAsync();

            return Ok(sessions);
        }

        // GET: api/admin/assessments
        [HttpGet("assessments")]
        public async Task<IActionResult> GetAllAssessments()
        {
            if (!IsAdmin()) return Forbid();

            var assessments = await _context.SelfAssessments
                .Include(a => a.User)
                .OrderByDescending(a => a.DateCompleted)
                .Select(a => new
                {
                    a.Id,
                    a.DateCompleted,
                    a.OverallScore,
                    a.OverallLevel,
                    a.AnxietyScore,
                    a.AnxietyLevel,
                    a.DepressionScore,
                    a.DepressionLevel,
                    a.LonelinessScore,
                    a.LonelinessLevel,
                    a.Primaryconcern,
                    a.ResultSummary,
                    user = new
                    {
                        a.User.Id,
                        a.User.FullName,
                        a.User.Email
                    }
                })
                .ToListAsync();

            return Ok(assessments);
        }

        // GET: api/admin/resources
        [HttpGet("resources")]
        public async Task<IActionResult> GetAllResources()
        {
            if (!IsAdmin()) return Forbid();

            var resources = await _context.Resources
                .Include(r => r.Uploader)
                .OrderByDescending(r => r.DateUploaded)
                .Select(r => new
                {
                    r.Id,
                    r.Title,
                    r.Description,
                    r.Type,
                    r.Category,
                    r.Url,
                    r.DateUploaded,
                    uploadedBy = new
                    {
                        r.Uploader.Id,
                        r.Uploader.FullName,
                        r.Uploader.Email
                    }
                })
                .ToListAsync();

            return Ok(resources);
        }

        // DELETE: api/admin/resources/{id}
        [HttpDelete("resources/{id}")]
        public async Task<IActionResult> DeleteResource(int id)
        {
            if (!IsAdmin()) return Forbid();

            var resource = await _context.Resources.FindAsync(id);
            if (resource == null) return NotFound("Resource not found.");

            _context.Resources.Remove(resource);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Resource removed successfully." });
        }
    }
}