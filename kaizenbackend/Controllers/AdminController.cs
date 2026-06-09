using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Security.Claims;
using kaizenbackend.Data;
using kaizenbackend.Models;
using kaizenbackend.Services;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ISessionStatusService _sessionStatusService;

        public AdminController(
            AppDbContext context,
            IEmailService emailService,
            ISessionStatusService sessionStatusService)
        {
            _context = context;
            _emailService = emailService;
            _sessionStatusService = sessionStatusService;
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

            await _sessionStatusService.CancelExpiredUnpaidSessionsAsync();

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
                good = await _context.SelfAssessments.CountAsync(a => a.OverallLevel == "Good"),
                mild = await _context.SelfAssessments.CountAsync(a => a.OverallLevel == "Mild"),
                moderate = await _context.SelfAssessments.CountAsync(a => a.OverallLevel == "Moderate"),
                severe = await _context.SelfAssessments.CountAsync(a => a.OverallLevel == "Severe"),
            };

            var primaryConcerns = new
            {
                anxiety = await _context.SelfAssessments.CountAsync(a => a.Primaryconcern == "Anxiety"),
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
                    pending = pendingSessions,
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
                .ThenBy(u => u.FirstName)
                .Select(u => new
                {
                    u.Id,
                    u.FirstName,
                    u.LastName,
                    FullName = u.FirstName + " " + u.LastName,
                    u.Email,
                    u.Role,
                    u.DateRegistered,
                    u.PhoneNumber,
                    u.IsActive,
                    profile = u.ProfessionalProfile != null ? new
                    {
                        u.ProfessionalProfile.Bio,
                        u.ProfessionalProfile.Specialization,
                        u.ProfessionalProfile.ExternalProfileUrl
                    } : null
                })
                .ToListAsync();

            return Ok(users);
        }

        // GET: api/admin/users/{id}
        [HttpGet("users/{id}")]
        public async Task<IActionResult> GetUserById(int id)
        {
            if (!IsAdmin()) return Forbid();

            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == id);

            if (user == null)
                return NotFound(new { message = "User not found" });

            ProfessionalProfile? professionalProfile = null;
            int currentSplitPercentage = 60;

            if (user.Role == "Professional")
            {
                professionalProfile = await _context.ProfessionalProfiles
                    .FirstOrDefaultAsync(p => p.UserId == id);

                currentSplitPercentage = professionalProfile?.CustomSplitPercentage ??
                    (professionalProfile?.AverageRating > 0
                        ? GetPercentageFromRating(professionalProfile.AverageRating)
                        : 60);
            }

            var response = new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                FullName = user.FirstName + " " + user.LastName,
                user.Email,
                user.Role,
                user.DateRegistered,
                user.PhoneNumber,
                user.IsActive,
                user.ProfilePicture,
                professionalProfile = professionalProfile != null ? new
                {
                    professionalProfile.Bio,
                    professionalProfile.Specialization,
                    PaymentMethod = professionalProfile.PaymentMethod ?? "",
                    PaymentAccount = professionalProfile.PaymentAccount ?? "",
                    professionalProfile.AverageRating,
                    professionalProfile.CustomSplitPercentage,
                    professionalProfile.TotalEarnings,
                    professionalProfile.PendingPayout,
                    professionalProfile.PaidOut,
                    currentSplitPercentage
                } : null
            };

            return Ok(response);
        }

        // NEW: Deactivate user (soft delete)
        [HttpPut("users/{id}/deactivate")]
        public async Task<IActionResult> DeactivateUser(int id)
        {
            if (!IsAdmin()) return Forbid();

            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found." });

            if (user.Role == "Admin")
                return BadRequest(new { message = "Cannot deactivate an admin account." });

            if (!user.IsActive)
                return BadRequest(new { message = "User is already deactivated." });

            user.IsActive = false;
            await _context.SaveChangesAsync();

            await SendAccountStatusEmailAsync(
                user,
                "Your Kaizen account has been deactivated",
                "Your Kaizen account has been deactivated by an administrator. You can no longer log in unless an admin reactivates your account.");

            return Ok(new { message = $"{user.FirstName} {user.LastName} has been deactivated. They can no longer log in." });
        }

        // NEW: Reactivate user
        [HttpPut("users/{id}/reactivate")]
        public async Task<IActionResult> ReactivateUser(int id)
        {
            if (!IsAdmin()) return Forbid();

            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found." });

            if (user.IsActive)
                return BadRequest(new { message = "User is already active." });

            user.IsActive = true;
            await _context.SaveChangesAsync();

            await SendAccountStatusEmailAsync(
                user,
                "Your Kaizen account has been reactivated",
                "Your Kaizen account has been reactivated. You can now log in again using your account credentials.");

            return Ok(new { message = $"{user.FirstName} {user.LastName} has been reactivated." });
        }

        // GET: api/admin/users/{id}/sessions
        [HttpGet("users/{id}/sessions")]
        public async Task<IActionResult> GetUserSessions(int id)
        {
            if (!IsAdmin()) return Forbid();

            await _sessionStatusService.CancelExpiredUnpaidSessionsAsync();

            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound(new { message = "User not found" });

            if (user.Role == "Professional")
            {
                var sessions = await _context.Sessions
                    .Where(s => s.ProfessionalId == id)
                    .Include(s => s.Client)
                    .OrderByDescending(s => s.SessionDate)
                    .Select(s => new
                    {
                        s.Id,
                        s.SessionDate,
                        s.Amount,
                        s.Status,
                        s.PaymentStatus,
                        s.PayoutStatus,
                        s.ProfessionalEarnings,
                        s.PlatformFee,
                        s.Notes,
                        clientId = s.Client.Id,
                        clientName = s.Client.FirstName + " " + s.Client.LastName,
                        clientEmail = s.Client.Email,
                        clientFirstName = s.Client.FirstName,
                        clientLastName = s.Client.LastName
                    })
                    .ToListAsync();

                return Ok(sessions);
            }
            else
            {
                var sessions = await _context.Sessions
                    .Where(s => s.ClientId == id)
                    .Include(s => s.Professional)
                    .OrderByDescending(s => s.SessionDate)
                    .Select(s => new
                    {
                        s.Id,
                        s.SessionDate,
                        s.Amount,
                        s.Status,
                        s.PaymentStatus,
                        s.Notes,
                        professionalId = s.Professional.Id,
                        professionalName = s.Professional.FirstName + " " + s.Professional.LastName,
                        professionalEmail = s.Professional.Email,
                        professionalFirstName = s.Professional.FirstName,
                        professionalLastName = s.Professional.LastName
                    })
                    .ToListAsync();

                return Ok(sessions);
            }
        }

        // GET: api/admin/professionals/{id}/ratings
        [HttpGet("professionals/{id}/ratings")]
        public async Task<IActionResult> GetProfessionalRatings(int id)
        {
            if (!IsAdmin()) return Forbid();

            var professional = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == id && u.Role == "Professional");

            if (professional == null)
                return NotFound(new { message = "Professional not found" });

            var ratings = await _context.Ratings
                .Where(r => r.ProfessionalId == id)
                .Include(r => r.Client)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    rating = r.RatingValue,
                    review = r.Review,
                    createdAt = r.CreatedAt,
                    clientId = r.Client.Id,
                    clientName = r.Client.FirstName + " " + r.Client.LastName,
                    clientEmail = r.Client.Email,
                    clientFirstName = r.Client.FirstName,
                    clientLastName = r.Client.LastName
                })
                .ToListAsync();

            var averageRating = ratings.Any()
                ? ratings.Average(r => r.rating)
                : 0;

            return Ok(new
            {
                professionalId = id,
                professionalName = professional.FirstName + " " + professional.LastName,
                professionalFirstName = professional.FirstName,
                professionalLastName = professional.LastName,
                averageRating = Math.Round(averageRating, 1),
                totalRatings = ratings.Count,
                ratings = ratings
            });
        }

        // POST: api/admin/professionals/{id}/process-payout
        [HttpPost("professionals/{id}/process-payout")]
        public async Task<IActionResult> ProcessProfessionalPayout(int id, [FromBody] PayoutRequest? request)
        {
            if (!IsAdmin()) return Forbid();

            var professional = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == id && u.Role == "Professional");

            if (professional == null)
                return NotFound(new { message = "Professional not found" });

            var professionalProfile = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == id);

            var pendingSessions = await _context.Sessions
                .Where(s => s.ProfessionalId == id
                    && s.PaymentStatus == "Paid"
                    && s.PayoutStatus == "Pending")
                .ToListAsync();

            if (pendingSessions.Count == 0)
                return BadRequest(new { message = "No pending payouts for this professional." });

            decimal totalPayoutAmount = pendingSessions.Sum(s => s.ProfessionalEarnings);
            int sessionCount = pendingSessions.Count;

            foreach (var session in pendingSessions)
            {
                session.PayoutStatus = "PaidOut";
                session.UpdatedAt = DateTime.UtcNow;
            }

            if (professionalProfile != null)
            {
                professionalProfile.PendingPayout -= totalPayoutAmount;
                professionalProfile.PaidOut += totalPayoutAmount;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Payout processed for {professional.FirstName} {professional.LastName}.",
                professionalId = id,
                professionalName = professional.FirstName + " " + professional.LastName,
                sessionsProcessed = sessionCount,
                totalAmount = totalPayoutAmount
            });
        }

        // GET: api/admin/sessions
        [HttpGet("sessions")]
        public async Task<IActionResult> GetAllSessions()
        {
            if (!IsAdmin()) return Forbid();

            await _sessionStatusService.CancelExpiredUnpaidSessionsAsync();

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
                        ClientName = s.Client.FirstName + " " + s.Client.LastName,
                        ClientFirstName = s.Client.FirstName,
                        ClientLastName = s.Client.LastName,
                        s.Client.Email
                    },
                    professional = new
                    {
                        s.Professional.Id,
                        ProfessionalName = s.Professional.FirstName + " " + s.Professional.LastName,
                        ProfessionalFirstName = s.Professional.FirstName,
                        ProfessionalLastName = s.Professional.LastName,
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
                    primaryConcern = a.Primaryconcern,
                    a.ResultSummary,
                    user = new
                    {
                        UserName = "User Undefined",
                        FirstName = "User",
                        LastName = "Undefined",
                        Email = ""
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
                    r.IsActive,
                    uploadedBy = new
                    {
                        r.Uploader.Id,
                        UploaderName = r.Uploader.FirstName + " " + r.Uploader.LastName,
                        r.Uploader.FirstName,
                        r.Uploader.LastName,
                        r.Uploader.Email
                    }
                })
                .ToListAsync();

            return Ok(resources);
        }

        // NEW: Deactivate resource (soft delete)
        [HttpPut("resources/{id}/deactivate")]
        public async Task<IActionResult> DeactivateResource(int id)
        {
            if (!IsAdmin()) return Forbid();

            var resource = await _context.Resources.FindAsync(id);
            if (resource == null)
                return NotFound(new { message = "Resource not found." });

            if (!resource.IsActive)
                return BadRequest(new { message = "Resource is already deactivated." });

            resource.IsActive = false;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Resource \"{resource.Title}\" has been deactivated. It will no longer appear to users." });
        }

        // NEW: Reactivate resource
        [HttpPut("resources/{id}/reactivate")]
        public async Task<IActionResult> ReactivateResource(int id)
        {
            if (!IsAdmin()) return Forbid();

            var resource = await _context.Resources.FindAsync(id);
            if (resource == null)
                return NotFound(new { message = "Resource not found." });

            if (resource.IsActive)
                return BadRequest(new { message = "Resource is already active." });

            resource.IsActive = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Resource \"{resource.Title}\" has been reactivated and is now visible to users." });
        }

        // PUT: api/admin/professionals/{id}/external-link
        [HttpPut("professionals/{id}/external-link")]
        public async Task<IActionResult> UpdateProfessionalExternalLink(int id, [FromBody] UpdateExternalLinkDto dto)
        {
            if (!IsAdmin()) return Forbid();

            var user = await _context.Users
                .Include(u => u.ProfessionalProfile)
                .FirstOrDefaultAsync(u => u.Id == id && u.Role == "Professional");

            if (user == null)
                return NotFound(new { message = "Professional not found." });

            if (user.ProfessionalProfile == null)
            {
                user.ProfessionalProfile = new ProfessionalProfile { UserId = user.Id };
                _context.ProfessionalProfiles.Add(user.ProfessionalProfile);
            }

            if (!string.IsNullOrEmpty(dto.ExternalProfileUrl))
            {
                if (!Uri.TryCreate(dto.ExternalProfileUrl, UriKind.Absolute, out Uri? uriResult) ||
                    (uriResult.Scheme != Uri.UriSchemeHttp && uriResult.Scheme != Uri.UriSchemeHttps))
                {
                    return BadRequest(new { message = "Please enter a valid URL starting with http:// or https://" });
                }
                user.ProfessionalProfile.ExternalProfileUrl = dto.ExternalProfileUrl;
            }
            else
            {
                user.ProfessionalProfile.ExternalProfileUrl = null;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "External profile link updated successfully.",
                externalProfileUrl = user.ProfessionalProfile.ExternalProfileUrl
            });
        }

        // Helper
        private int GetPercentageFromRating(decimal rating)
        {
            if (rating >= 5.0m) return 70;
            if (rating >= 4.5m) return 65;
            if (rating >= 4.0m) return 62;
            if (rating >= 3.5m) return 60;
            return 55;
        }

        private async Task SendAccountStatusEmailAsync(User user, string subject, string message)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(user.Email)
                    || user.Email.StartsWith("deleted_")
                    || user.Email.EndsWith("@deleted.kaizen"))
                {
                    return;
                }

                string fullName = $"{user.FirstName} {user.LastName}".Trim();
                if (string.IsNullOrWhiteSpace(fullName)) fullName = "there";

                string body = $@"
                    <h2>{WebUtility.HtmlEncode(subject)}</h2>
                    <p>Hello {WebUtility.HtmlEncode(fullName)},</p>
                    <p>{WebUtility.HtmlEncode(message)}</p>
                    <p>If you believe this was a mistake, please contact Kaizen support.</p>";

                await _emailService.SendEmailAsync(user.Email, subject, body, true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Account status email failed: {ex.Message}");
            }
        }
    }

    public class PayoutRequest
    {
        public string? Notes { get; set; }
        public string? PaymentReference { get; set; }
    }

    public class UpdateExternalLinkDto
    {
        public string? ExternalProfileUrl { get; set; }
    }
}
