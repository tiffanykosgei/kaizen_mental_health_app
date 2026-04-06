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
    public class SelfAssessmentController : ControllerBase
    {
        private readonly AppDbContext _context;

        public SelfAssessmentController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("submit")]
        public async Task<IActionResult> Submit(SelfAssessmentDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            if (!IsValidAnswers(dto))
                return BadRequest("All answers must be between 1 and 5.");

            double anxietyScore   = Math.Round((dto.Q1 + dto.Q2 + dto.Q3 + dto.Q4 + dto.Q5) / 5.0, 2);
            double depressionScore = Math.Round((dto.Q6 + dto.Q7 + dto.Q8 + dto.Q9 + dto.Q10) / 5.0, 2);
            double lonelinessScore = Math.Round((dto.Q11 + dto.Q12 + dto.Q13 + dto.Q14 + dto.Q15) / 5.0, 2);
            double overallScore   = Math.Round((anxietyScore + depressionScore + lonelinessScore) / 3.0, 2);

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
                Q1 = dto.Q1,   Q2 = dto.Q2,   Q3 = dto.Q3,
                Q4 = dto.Q4,   Q5 = dto.Q5,   Q6 = dto.Q6,
                Q7 = dto.Q7,   Q8 = dto.Q8,   Q9 = dto.Q9,
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
                disclaimer      = "This assessment is a screening tool only and does not constitute a medical diagnosis. Please consult a qualified mental health professional for clinical advice.",
                crisisSupport   = overallLevel == "Severe" || depressionLevel == "Severe" || lonelinessLevel == "Severe"
                    ? "If you are in crisis or feeling unsafe, please call Befrienders Kenya immediately: 0800 723 253 (free, 24 hours)"
                    : null
            });
        }

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
                    s.Primaryconcern,
                    s.ResultSummary
                })
                .ToListAsync();

            return Ok(history);
        }

        // GET: api/selfassessment/all
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
            s.UserId,
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
            s.ResultSummary,
            User = new
            {
                s.User.Id,
                s.User.FullName,
                s.User.Email
            }
        })
        .ToListAsync();

    return Ok(assessments);
}

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var assessment = await _context.SelfAssessments
                .FirstOrDefaultAsync(s => s.Id == id && s.UserId == userId);

            if (assessment == null)
                return NotFound("Assessment not found.");

            return Ok(assessment);
        }

        private bool IsValidAnswers(SelfAssessmentDto dto)
        {
            int[] answers = { dto.Q1, dto.Q2, dto.Q3, dto.Q4, dto.Q5,
                              dto.Q6, dto.Q7, dto.Q8, dto.Q9, dto.Q10,
                              dto.Q11, dto.Q12, dto.Q13, dto.Q14, dto.Q15 };
            return answers.All(a => a >= 1 && a <= 5);
        }

        private string GetLevel(double score) => score switch
        {
            <= 2.0 => "Good",
            <= 3.0 => "Mild",
            <= 4.0 => "Moderate",
            _      => "Severe"
        };

        private string GetPrimaryConcern(double anxiety, double depression, double loneliness)
        {
            if (anxiety >= depression && anxiety >= loneliness) return "Anxiety";
            if (depression >= anxiety && depression >= loneliness) return "Depression";
            return "Loneliness";
        }

        private string BuildSummary(string anxiety, string depression, string loneliness, string overall, string primary)
        {
            return $"Overall wellbeing: {overall}. " +
                   $"Anxiety: {anxiety}. Depression: {depression}. Loneliness: {loneliness}. " +
                   $"Your primary area of concern is {primary}. " +
                   $"Resources have been recommended based on your results.";
        }
    }
}