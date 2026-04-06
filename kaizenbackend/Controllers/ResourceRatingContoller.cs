using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using kaizenbackend.Data;
using kaizenbackend.Models;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ResourceRatingController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ResourceRatingController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/resourcerating/{resourceId}
        [HttpPost("{resourceId}")]
        public async Task<IActionResult> RateResource(int resourceId, [FromBody] RatingRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var resource = await _context.Resources.FindAsync(resourceId);
            if (resource == null)
                return NotFound("Resource not found.");

            if (request.Rating < 1 || request.Rating > 5)
                return BadRequest("Rating must be between 1 and 5.");

            // Check if user already rated this resource
            var existingRating = await _context.ResourceRatings
                .FirstOrDefaultAsync(r => r.ResourceId == resourceId && r.UserId == userId);

            if (existingRating != null)
            {
                // Update existing rating
                existingRating.Rating = request.Rating;
                existingRating.Comment = request.Comment;
                existingRating.CreatedAt = DateTime.UtcNow;
            }
            else
            {
                // Create new rating
                var rating = new ResourceRating
                {
                    ResourceId = resourceId,
                    UserId = userId,
                    Rating = request.Rating,
                    Comment = request.Comment,
                    CreatedAt = DateTime.UtcNow
                };
                _context.ResourceRatings.Add(rating);
            }

            await _context.SaveChangesAsync();

            // Calculate and update average rating on the resource
            var avgRating = await _context.ResourceRatings
                .Where(r => r.ResourceId == resourceId)
                .AverageAsync(r => r.Rating);
            
            // You could add an AverageRating field to Resource model if desired

            return Ok(new { message = "Rating submitted successfully.", averageRating = Math.Round(avgRating, 1) });
        }

        // GET: api/resourcerating/{resourceId}
        [HttpGet("{resourceId}")]
        public async Task<IActionResult> GetResourceRatings(int resourceId)
        {
            var ratings = await _context.ResourceRatings
                .Include(r => r.User)
                .Where(r => r.ResourceId == resourceId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Rating,
                    r.Comment,
                    r.CreatedAt,
                    User = new
                    {
                        r.User.FullName
                    }
                })
                .ToListAsync();

            var averageRating = ratings.Any() ? ratings.Average(r => r.Rating) : 0;

            return Ok(new
            {
                averageRating = Math.Round(averageRating, 1),
                totalRatings = ratings.Count,
                ratings
            });
        }

        // GET: api/resourcerating/admin/all-with-ratings
        [HttpGet("admin/all-with-ratings")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllResourcesWithRatings()
        {
            var resources = await _context.Resources
                .Include(r => r.Uploader)
                .Select(r => new
                {
                    r.Id,
                    r.Title,
                    r.Description,
                    r.Type,
                    r.Category,
                    r.Url,
                    r.DateUploaded,
                    UploadedBy = r.Uploader.FullName,
                    Ratings = _context.ResourceRatings
                        .Where(rr => rr.ResourceId == r.Id)
                        .Select(rr => new
                        {
                            rr.Rating,
                            rr.Comment,
                            rr.CreatedAt,
                            UserName = rr.User.FullName
                        })
                        .ToList()
                })
                .ToListAsync();

            var result = resources.Select(r => new
            {
                r.Id,
                r.Title,
                r.Description,
                r.Type,
                r.Category,
                r.Url,
                r.DateUploaded,
                r.UploadedBy,
                AverageRating = r.Ratings.Any() ? Math.Round(r.Ratings.Average(rr => rr.Rating), 1) : 0,
                TotalRatings = r.Ratings.Count,
                RecentComments = r.Ratings
                    .Where(rr => !string.IsNullOrEmpty(rr.Comment))
                    .OrderByDescending(rr => rr.CreatedAt)
                    .Take(3)
                    .Select(rr => new
                    {
                        rr.Rating,
                        rr.Comment,
                        rr.CreatedAt,
                        rr.UserName
                    })
                    .ToList()
            });

            return Ok(result);
        }

        public class RatingRequest
        {
            public int Rating { get; set; }
            public string? Comment { get; set; }
        }
    }
}