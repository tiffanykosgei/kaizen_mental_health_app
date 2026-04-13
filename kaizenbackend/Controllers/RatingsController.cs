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
    public class RatingsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<RatingsController> _logger;

        public RatingsController(AppDbContext context, ILogger<RatingsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ========== RATING ENDPOINTS ==========

        [HttpPost("rate-session/{sessionId}")]
        public async Task<IActionResult> RateSession(int sessionId, [FromBody] RateSessionDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            // Validate rating value
            if (dto.Rating < 1 || dto.Rating > 5)
                return BadRequest(new { message = "Rating must be between 1 and 5" });

            // Find the session
            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.ClientId == userId);

            if (session == null)
                return NotFound(new { message = "Session not found or you don't have permission to rate it." });

            // Check if session is completed
            if (session.Status != "Completed")
                return BadRequest(new { message = "You can only rate completed sessions." });

            // Check if already rated
            var existingRating = await _context.Ratings
                .FirstOrDefaultAsync(r => r.SessionId == sessionId && r.ClientId == userId);

            if (existingRating != null)
                return BadRequest(new { message = "You have already rated this session." });

            // Create new rating
            var rating = new Rating
            {
                SessionId = sessionId,
                ClientId = userId,
                ProfessionalId = session.ProfessionalId,
                RatingValue = dto.Rating,
                Review = dto.Review,
                CreatedAt = DateTime.UtcNow
            };

            _context.Ratings.Add(rating);
            await _context.SaveChangesAsync();

            // Update professional's average rating
            await UpdateProfessionalAverageRating(session.ProfessionalId);

            _logger.LogInformation($"Client {userId} rated session {sessionId} with {dto.Rating} stars");

            return Ok(new
            {
                success = true,
                message = "Rating submitted successfully",
                rating = new
                {
                    rating.RatingValue,
                    rating.Review,
                    rating.CreatedAt
                }
            });
        }

        [HttpPut("update-rating/{sessionId}")]
        public async Task<IActionResult> UpdateRating(int sessionId, [FromBody] RateSessionDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            // Validate rating value
            if (dto.Rating < 1 || dto.Rating > 5)
                return BadRequest(new { message = "Rating must be between 1 and 5" });

            // Find existing rating
            var rating = await _context.Ratings
                .FirstOrDefaultAsync(r => r.SessionId == sessionId && r.ClientId == userId);

            if (rating == null)
                return NotFound(new { message = "Rating not found for this session." });

            // Update rating
            rating.RatingValue = dto.Rating;
            rating.Review = dto.Review;
            rating.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Update professional's average rating
            await UpdateProfessionalAverageRating(rating.ProfessionalId);

            _logger.LogInformation($"Client {userId} updated rating for session {sessionId} to {dto.Rating} stars");

            return Ok(new
            {
                success = true,
                message = "Rating updated successfully",
                rating = new
                {
                    rating.RatingValue,
                    rating.Review,
                    rating.UpdatedAt
                }
            });
        }

        [HttpGet("professional/{professionalId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProfessionalRatings(int professionalId)
        {
            // Check if professional exists
            var professional = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == professionalId && u.Role == "Professional");

            if (professional == null)
                return NotFound(new { message = "Professional not found." });

            // Get all ratings for this professional
            var ratings = await _context.Ratings
                .Include(r => r.Client)
                .Where(r => r.ProfessionalId == professionalId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.RatingValue,
                    r.Review,
                    r.CreatedAt,
                    Client = new
                    {
                        r.Client.Id,
                        r.Client.FullName,
                        r.Client.Email
                    },
                    SessionId = r.SessionId
                })
                .ToListAsync();

            // Calculate statistics
            var averageRating = ratings.Any() ? ratings.Average(r => r.RatingValue) : 0;
            var ratingDistribution = new
            {
                OneStar = ratings.Count(r => r.RatingValue == 1),
                TwoStars = ratings.Count(r => r.RatingValue == 2),
                ThreeStars = ratings.Count(r => r.RatingValue == 3),
                FourStars = ratings.Count(r => r.RatingValue == 4),
                FiveStars = ratings.Count(r => r.RatingValue == 5)
            };

            // Get professional profile for split percentage info
            var professionalProfile = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == professionalId);

            return Ok(new
            {
                professionalId = professionalId,
                professionalName = professional.FullName,
                averageRating = Math.Round(averageRating, 1),
                totalRatings = ratings.Count,
                ratingDistribution,
                customSplitPercentage = professionalProfile?.CustomSplitPercentage,
                currentSplitBasedOnRating = GetPercentageFromRating((decimal)averageRating),
                recentRatings = ratings.Take(10)
            });
        }

        [HttpGet("my-ratings")]
        [Authorize(Roles = "Client")]
        public async Task<IActionResult> GetMyRatings()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var myRatings = await _context.Ratings
                .Include(r => r.Professional)
                .Include(r => r.Session)
                .Where(r => r.ClientId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.RatingValue
                    ,
                    r.Review,
                    r.CreatedAt,
                    Professional = new
                    {
                        r.Professional.Id,
                        r.Professional.FullName,
                        r.Professional.Email,
                        Profile = _context.ProfessionalProfiles
                            .Where(p => p.UserId == r.Professional.Id)
                            .Select(p => new { p.Specialization, p.AverageRating })
                            .FirstOrDefault()
                    },
                    Session = new
                    {
                        r.Session.Id,
                        r.Session.SessionDate,
                        r.Session.Status,
                        r.Session.Amount
                    }
                })
                .ToListAsync();

            return Ok(new
            {
                totalRatings = myRatings.Count,
                averageRating = myRatings.Any() ? myRatings.Average(r => r.RatingValue) : 0,
                ratings = myRatings
            });
        }

        [HttpGet("session/{sessionId}")]
        public async Task<IActionResult> GetSessionRating(int sessionId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            // Check if user is part of this session (either client or professional)
            var session = await _context.Sessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && (s.ClientId == userId || s.ProfessionalId == userId));

            if (session == null)
                return NotFound(new { message = "Session not found or you don't have permission." });

            var rating = await _context.Ratings
                .Include(r => r.Client)
                .FirstOrDefaultAsync(r => r.SessionId == sessionId);

            if (rating == null)
                return Ok(new { message = "This session has not been rated yet.", hasRating = false });

            return Ok(new
            {
                hasRating = true,
                rating = new
                {
                    rating.RatingValue,
                    rating.Review,
                    rating.CreatedAt,
                    rating.UpdatedAt,
                    Client = new
                    {
                        rating.Client.Id,
                        rating.Client.FullName
                    }
                }
            });
        }

        [HttpGet("professional/{professionalId}/average")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProfessionalAverageRating(int professionalId)
        {
            var averageRating = await _context.Ratings
                .Where(r => r.ProfessionalId == professionalId)
                .AverageAsync(r => (decimal?)r.RatingValue) ?? 0;

            var totalRatings = await _context.Ratings
                .CountAsync(r => r.ProfessionalId == professionalId);

            var ratingDistribution = await _context.Ratings
                .Where(r => r.ProfessionalId == professionalId)
                .GroupBy(r => r.RatingValue)
                .Select(g => new { Rating = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.Rating, g => g.Count);

            return Ok(new
            {
                professionalId,
                averageRating = Math.Round(averageRating, 1),
                totalRatings,
                ratingDistribution
            });
        }

        [HttpDelete("{ratingId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteRating(int ratingId)
        {
            var rating = await _context.Ratings.FindAsync(ratingId);

            if (rating == null)
                return NotFound(new { message = "Rating not found." });

            int professionalId = rating.ProfessionalId;

            _context.Ratings.Remove(rating);
            await _context.SaveChangesAsync();

            // Update professional's average rating after deletion
            await UpdateProfessionalAverageRating(professionalId);

            _logger.LogInformation($"Admin deleted rating {ratingId} for professional {professionalId}");

            return Ok(new
            {
                success = true,
                message = "Rating deleted successfully"
            });
        }

        [HttpGet("admin/all-ratings")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllRatings([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var query = _context.Ratings
                .Include(r => r.Client)
                .Include(r => r.Professional)
                .Include(r => r.Session)
                .OrderByDescending(r => r.CreatedAt);

            var totalCount = await query.CountAsync();
            var ratings = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(r => new
                {
                    r.Id,
                    r.RatingValue,
                    r.Review,
                    r.CreatedAt,
                    Client = new
                    {
                        r.Client.Id,
                        r.Client.FullName,
                        r.Client.Email
                    },
                    Professional = new
                    {
                        r.Professional.Id,
                        r.Professional.FullName,
                        r.Professional.Email
                    },
                    Session = new
                    {
                        r.Session.Id,
                        r.Session.SessionDate,
                        r.Session.Status
                    }
                })
                .ToListAsync();

            return Ok(new
            {
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                ratings
            });
        }

        [HttpGet("professional/top-rated")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTopRatedProfessionals([FromQuery] int limit = 10)
        {
            var topProfessionals = await _context.ProfessionalProfiles
                .Where(p => p.AverageRating > 0)
                .OrderByDescending(p => p.AverageRating)
                .ThenByDescending(p => p.TotalEarnings)
                .Take(limit)
                .Select(p => new
                {
                    p.UserId,
                    ProfessionalName = _context.Users.Where(u => u.Id == p.UserId).Select(u => u.FullName).FirstOrDefault(),
                    p.Specialization,
                    p.AverageRating,
                    p.TotalEarnings,
                })
                .ToListAsync();

            return Ok(topProfessionals);
        }

        [HttpGet("professional/{professionalId}/rating-history")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> GetMyRatingHistory(int professionalId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            // Verify professional is requesting their own data
            if (userId != professionalId)
                return Forbid("You can only view your own rating history.");

            var ratings = await _context.Ratings
                .Include(r => r.Client)
                .Include(r => r.Session)
                .Where(r => r.ProfessionalId == professionalId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.RatingValue,
                    r.Review,
                    r.CreatedAt,
                    Client = new
                    {
                        r.Client.Id,
                        r.Client.FullName
                    },
                    Session = new
                    {
                        r.Session.Id,
                        r.Session.SessionDate,
                        r.Session.Amount
                    }
                })
                .ToListAsync();

            var monthlyTrend = ratings
                .GroupBy(r => new { r.CreatedAt.Year, r.CreatedAt.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    AverageRating = g.Average(r => r.RatingValue),
                    TotalRatings = g.Count()
                })
                .OrderByDescending(t => t.Year)
                .ThenByDescending(t => t.Month)
                .ToList();

            return Ok(new
            {
                totalRatings = ratings.Count,
                averageRating = ratings.Any() ? ratings.Average(r => r.RatingValue) : 0,
                ratings,
                monthlyTrend
            });
        }

        // ========== HELPER METHODS ==========

        private async Task UpdateProfessionalAverageRating(int professionalId)
        {
            var averageRating = await _context.Ratings
                .Where(r => r.ProfessionalId == professionalId)
                .AverageAsync(r => (decimal?)r.RatingValue) ?? 0;

            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == professionalId);

            if (professional != null)
            {
                decimal oldRating = professional.AverageRating;
                professional.AverageRating = Math.Round(averageRating, 1);
                
                // Update split percentage based on new rating if no custom split is set
                if (!professional.CustomSplitPercentage.HasValue)
                {
                    int newPercentage = GetPercentageFromRating(professional.AverageRating);
                    // Note: The actual split percentage will be calculated on-the-fly in PaymentController
                    // We're just updating the rating here
                }
                
                await _context.SaveChangesAsync();
                _logger.LogInformation($"Updated professional {professionalId} average rating from {oldRating} to {professional.AverageRating}");
            }
        }

        private int GetPercentageFromRating(decimal rating)
        {
            if (rating >= 5.0m) return 70;
            if (rating >= 4.5m) return 65;
            if (rating >= 4.0m) return 62;
            if (rating >= 3.5m) return 60;
            return 55;
        }
    }
}