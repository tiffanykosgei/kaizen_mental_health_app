using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
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
    public class SelfAssessmentController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<SelfAssessmentController> _logger;

        public SelfAssessmentController(
            AppDbContext context,
            IEmailService emailService,
            ILogger<SelfAssessmentController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        // POST: api/selfassessment/submit
        [HttpPost("submit")]
        public async Task<IActionResult> Submit(SelfAssessmentDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            if (!IsValidAnswers(dto))
                return BadRequest("All answers must be between 1 and 5.");

            double anxietyScore    = Math.Round((dto.Q1 + dto.Q2 + dto.Q3 + dto.Q4 + dto.Q5) / 5.0, 2);
            double depressionScore = Math.Round((dto.Q6 + dto.Q7 + dto.Q8 + dto.Q9 + dto.Q10) / 5.0, 2);
            double lonelinessScore = Math.Round((dto.Q11 + dto.Q12 + dto.Q13 + dto.Q14 + dto.Q15) / 5.0, 2);
            double overallScore    = Math.Round((anxietyScore + depressionScore + lonelinessScore) / 3.0, 2);

            string anxietyLevel    = GetLevel(anxietyScore);
            string depressionLevel = GetLevel(depressionScore);
            string lonelinessLevel = GetLevel(lonelinessScore);
            string overallLevel    = GetLevel(overallScore);

            string primaryConcern = GetPrimaryConcern(anxietyScore, depressionScore, lonelinessScore);
            string resultSummary  = BuildSummary(anxietyLevel, depressionLevel, lonelinessLevel, overallLevel, primaryConcern);

            var assessment = new SelfAssessment
            {
                UserId          = userId,
                DateCompleted   = DateTime.UtcNow,
                Q1  = dto.Q1,  Q2  = dto.Q2,  Q3  = dto.Q3,
                Q4  = dto.Q4,  Q5  = dto.Q5,  Q6  = dto.Q6,
                Q7  = dto.Q7,  Q8  = dto.Q8,  Q9  = dto.Q9,
                Q10 = dto.Q10, Q11 = dto.Q11, Q12 = dto.Q12,
                Q13 = dto.Q13, Q14 = dto.Q14, Q15 = dto.Q15,
                AnxietyScore    = anxietyScore,
                DepressionScore = depressionScore,
                LonelinessScore = lonelinessScore,
                OverallScore    = overallScore,
                AnxietyLevel    = anxietyLevel,
                DepressionLevel = depressionLevel,
                LonelinessLevel = lonelinessLevel,
                OverallLevel    = overallLevel,
                Primaryconcern  = primaryConcern,
                ResultSummary   = resultSummary
            };

            _context.SelfAssessments.Add(assessment);
            await _context.SaveChangesAsync();

            // Fetch recommended resources from DB
            var recommendedResources = await GetRecommendedResources(primaryConcern);

            bool isCrisis = overallLevel    == "Severe"
                         || depressionLevel == "Severe"
                         || anxietyLevel    == "Severe"
                         || lonelinessLevel == "Severe";

            bool emergencyContactNotified = false;
            if (isCrisis)
                emergencyContactNotified = await NotifyEmergencyContactAsync(
                    userId,
                    anxietyScore,
                    depressionScore,
                    lonelinessScore,
                    overallScore,
                    anxietyLevel,
                    depressionLevel,
                    lonelinessLevel,
                    overallLevel,
                    primaryConcern);

            return Ok(new
            {
                assessmentId    = assessment.Id,
                anxietyScore,
                depressionScore,
                lonelinessScore,
                overallScore,
                anxietyLevel,
                depressionLevel,
                lonelinessLevel,
                overallLevel,
                primaryConcern,
                resultSummary,
                recommendedResources,
                resourceCount   = recommendedResources.Count,
                disclaimer      = "This assessment is a screening tool only and does not constitute a medical diagnosis. Please consult a qualified mental health professional for clinical advice.",
                crisisSupport   = isCrisis
                    ? "If you are in crisis or feeling unsafe, please call Befrienders Kenya immediately: 0800 723 253 (free, available 24 hours)"
                    : null,
                emergencyContactNotified
            });
        }

        // GET: api/selfassessment/has-completed
        [HttpGet("has-completed")]
        public async Task<IActionResult> HasCompleted()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var hasCompleted = await _context.SelfAssessments
                .AnyAsync(s => s.UserId == userId);

            return Ok(new { hasCompleted });
        }

        // GET: api/selfassessment/my-history
        [HttpGet("my-history")]
        public async Task<IActionResult> GetMyHistory()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var history = await _context.SelfAssessments
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.DateCompleted)
                .Select(s => new
                {
                    s.Id,
                    s.DateCompleted,
                    s.AnxietyScore,
                    s.DepressionScore,
                    s.LonelinessScore,
                    s.OverallScore,
                    s.AnxietyLevel,
                    s.DepressionLevel,
                    s.LonelinessLevel,
                    s.OverallLevel,
                    primaryConcern = s.Primaryconcern,
                    s.ResultSummary
                })
                .ToListAsync();

            return Ok(history);
        }

        // GET: api/selfassessment/client/{clientId}/history
        [HttpGet("client/{clientId}/history")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> GetClientHistory(int clientId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int professionalId = int.Parse(userIdClaim);

            // Check if professional has a session with this client
            var hasSession = await _context.Sessions
                .AnyAsync(s => s.ClientId == clientId
                    && s.ProfessionalId == professionalId
                    && s.Client.IsActive
                    && s.Status != "Cancelled");

            if (!hasSession)
            {
                return Forbid("You can only view assessment history for clients you have sessions with.");
            }

            var client = await _context.Users
                .Where(u => u.Id == clientId && u.Role == "Client" && u.IsActive)
                .Select(u => new { u.FirstName, u.LastName, u.Email })
                .FirstOrDefaultAsync();

            if (client == null)
                return NotFound(new { message = "Client not found." });

            var assessments = await _context.SelfAssessments
                .Where(s => s.UserId == clientId)
                .OrderByDescending(s => s.DateCompleted)
                .Select(s => new
                {
                    s.Id,
                    s.DateCompleted,
                    s.AnxietyScore,
                    s.DepressionScore,
                    s.LonelinessScore,
                    s.OverallScore,
                    s.AnxietyLevel,
                    s.DepressionLevel,
                    s.LonelinessLevel,
                    s.OverallLevel,
                    s.Primaryconcern,
                    s.ResultSummary
                })
                .ToListAsync();

            return Ok(new
            {
                client = new
                {
                    clientId = clientId,
                    firstName = client?.FirstName ?? "",
                    lastName = client?.LastName ?? "",
                    email = client?.Email ?? ""
                },
                assessments
            });
        }

        // GET: api/selfassessment/all — Admin only
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllAssessments()
        {
            var assessments = await _context.SelfAssessments
                .Include(s => s.User)
                .OrderByDescending(s => s.DateCompleted)
                .Select(s => new
                {
                    s.Id,
                    s.DateCompleted,
                    s.AnxietyScore,
                    s.DepressionScore,
                    s.LonelinessScore,
                    s.OverallScore,
                    s.AnxietyLevel,
                    s.DepressionLevel,
                    s.LonelinessLevel,
                    s.OverallLevel,
                    primaryConcern = s.Primaryconcern,
                    s.ResultSummary,
                    User = new
                    {
                        FullName = "User Undefined",
                        Email = ""
                    }
                })
                .ToListAsync();

            return Ok(assessments);
        }

        // GET: api/selfassessment/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var assessment = await _context.SelfAssessments
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (assessment == null) return NotFound("Assessment not found.");
            return Ok(assessment);
        }

        // ── Private helpers ──────────────────────────────────────────────────

        private async Task<List<object>> GetRecommendedResources(string primaryConcern)
        {
            // Up to 4 exact-category matches, sorted by rating then date
            var exact = await _context.Resources
                .Include(r => r.Uploader)
                .Where(r => r.IsActive && r.Uploader.IsActive && r.Category.ToLower() == primaryConcern.ToLower())
                .OrderByDescending(r => r.AverageRating)
                .ThenByDescending(r => r.DateUploaded)
                .Take(4)
                .ToListAsync();

            // Top up with General resources to reach 6 total
            int remaining = 6 - exact.Count;
            var general   = new List<Resource>();

            if (remaining > 0)
            {
                var excludeIds = exact.Select(r => r.Id).ToList();
                general = await _context.Resources
                    .Include(r => r.Uploader)
                    .Where(r => r.IsActive && r.Uploader.IsActive && r.Category.ToLower() == "general" && !excludeIds.Contains(r.Id))
                    .OrderByDescending(r => r.AverageRating)
                    .ThenByDescending(r => r.DateUploaded)
                    .Take(remaining)
                    .ToListAsync();
            }

            return exact.Concat(general).Select(r => (object)new
            {
                id            = r.Id,
                title         = r.Title,
                description   = r.Description ?? "",
                type          = r.Type ?? "Resource",
                category      = r.Category ?? "General",
                url           = r.Url ?? "#",
                icon          = GetIconForCategory(r.Category ?? "General"),
                dateUploaded  = r.DateUploaded.ToString("MMM dd, yyyy"),
                uploadedBy    = r.Uploader != null
                                    ? $"{r.Uploader.FirstName} {r.Uploader.LastName}".Trim()
                                    : "Professional",
                averageRating = r.AverageRating,
                totalRatings  = r.TotalRatings,
                isExactMatch  = r.Category?.ToLower() == primaryConcern.ToLower()
            }).ToList();
        }

        private async Task<bool> NotifyEmergencyContactAsync(
            int userId,
            double anxietyScore,
            double depressionScore,
            double lonelinessScore,
            double overallScore,
            string anxietyLevel,
            string depressionLevel,
            string lonelinessLevel,
            string overallLevel,
            string primaryConcern)
        {
            try
            {
                var client = await _context.Users
                    .Include(u => u.ClientProfile)
                    .FirstOrDefaultAsync(u => u.Id == userId && u.Role == "Client" && u.IsActive);

                var emergencyEmail = client?.ClientProfile?.EmergencyContactEmail;
                if (string.IsNullOrWhiteSpace(emergencyEmail))
                {
                    _logger.LogWarning("Severe assessment for user {UserId} had no emergency contact email.", userId);
                    return false;
                }

                var clientName = $"{client!.FirstName} {client.LastName}".Trim();
                if (string.IsNullOrWhiteSpace(clientName)) clientName = "A Kaizen client";

                var contactName = client.ClientProfile?.EmergencyContact;
                if (string.IsNullOrWhiteSpace(contactName)) contactName = "there";

                string subject = "Kaizen severe assessment alert";
                string body = $@"
                    <h2>Severe assessment result alert</h2>
                    <p>Hello {WebUtility.HtmlEncode(contactName)},</p>
                    <p>{WebUtility.HtmlEncode(clientName)} listed you as their emergency contact on Kaizen.</p>
                    <p>Their latest wellbeing assessment returned a <strong>severe</strong> result.</p>
                    <table cellpadding=""6"" cellspacing=""0"" style=""border-collapse:collapse;"">
                        <tr><td><strong>Overall</strong></td><td>{overallScore} ({WebUtility.HtmlEncode(overallLevel)})</td></tr>
                        <tr><td><strong>Anxiety</strong></td><td>{anxietyScore} ({WebUtility.HtmlEncode(anxietyLevel)})</td></tr>
                        <tr><td><strong>Depression</strong></td><td>{depressionScore} ({WebUtility.HtmlEncode(depressionLevel)})</td></tr>
                        <tr><td><strong>Loneliness</strong></td><td>{lonelinessScore} ({WebUtility.HtmlEncode(lonelinessLevel)})</td></tr>
                        <tr><td><strong>Primary concern</strong></td><td>{WebUtility.HtmlEncode(primaryConcern)}</td></tr>
                    </table>
                    <p>Please check in with them as soon as possible. If there is immediate risk, contact local emergency services or Befrienders Kenya at 0800 723 253.</p>
                    <p>This email is an automated safety notification from Kaizen.</p>";

                var sent = await _emailService.SendEmailAsync(emergencyEmail, subject, body, true);
                if (!sent)
                    _logger.LogWarning("Emergency contact email was not sent to {Email} for user {UserId}.", emergencyEmail, userId);

                return sent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to notify emergency contact for severe assessment by user {UserId}", userId);
                return false;
            }
        }

        private static string GetIconForCategory(string category) => category?.ToLower() switch
        {
            "anxiety"    => "😰",
            "depression" => "😔",
            "loneliness" => "🫂",
            _            => "📖"
        };

        private static bool IsValidAnswers(SelfAssessmentDto dto)
        {
            int[] answers = {
                dto.Q1,  dto.Q2,  dto.Q3,  dto.Q4,  dto.Q5,
                dto.Q6,  dto.Q7,  dto.Q8,  dto.Q9,  dto.Q10,
                dto.Q11, dto.Q12, dto.Q13, dto.Q14, dto.Q15
            };
            return answers.All(a => a >= 1 && a <= 5);
        }

        private static string GetLevel(double score) => score switch
        {
            <= 2.0 => "Good",
            <= 3.0 => "Mild",
            <= 4.0 => "Moderate",
            _      => "Severe"
        };

        private static string GetPrimaryConcern(double anxiety, double depression, double loneliness)
        {
            if (anxiety >= depression && anxiety >= loneliness) return "Anxiety";
            if (depression >= anxiety && depression >= loneliness) return "Depression";
            return "Loneliness";
        }

        private static string BuildSummary(
            string anxiety, string depression, string loneliness,
            string overall, string primary)
        {
            return $"Overall wellbeing: {overall}. " +
                   $"Anxiety: {anxiety}. Depression: {depression}. Loneliness: {loneliness}. " +
                   $"Your primary area of concern is {primary}. " +
                   $"Resources have been recommended based on your results.";
        }
    }
}
