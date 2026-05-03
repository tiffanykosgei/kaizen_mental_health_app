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
    public class ResourceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ResourceController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/resource/upload — Professionals ONLY
        [HttpPost("upload")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> Upload(CreateResourceDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var allowedTypes = new[] { "Article", "Video", "Guide", "Exercise", "Podcast", "Audio" };
            if (!allowedTypes.Contains(dto.Type))
                return BadRequest("Type must be Article, Video, Guide, Exercise, Podcast or Audio.");

            var allowedCategories = new[] { "Anxiety", "Depression", "Loneliness", "General" };
            if (!allowedCategories.Contains(dto.Category))
                return BadRequest("Category must be Anxiety, Depression, Loneliness or General.");

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Title is required.");

            if (string.IsNullOrWhiteSpace(dto.Url))
                return BadRequest("URL is required.");

            var resource = new Resource
            {
                Title        = dto.Title,
                Description  = dto.Description ?? string.Empty,
                Type         = dto.Type,
                Category     = dto.Category,
                Url          = dto.Url,
                UploadedBy   = userId,
                DateUploaded = DateTime.UtcNow
            };

            _context.Resources.Add(resource);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Resource uploaded successfully.", resourceId = resource.Id });
        }

        // GET: api/resource/all — All roles
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
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
                    r.AverageRating,
                    r.TotalRatings,
                    uploadedBy = r.Uploader.FirstName + " " + r.Uploader.LastName
                })
                .ToListAsync();

            return Ok(resources);
        }

        // GET: api/resource/by-category/{category}
        [HttpGet("by-category/{category}")]
        public async Task<IActionResult> GetByCategory(string category)
        {
            var allowedCategories = new[] { "Anxiety", "Depression", "Loneliness", "General" };
            if (!allowedCategories.Contains(category))
                return BadRequest("Invalid category.");

            var resources = await _context.Resources
                .Include(r => r.Uploader)
                .Where(r => r.Category == category)
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
                    r.AverageRating,
                    r.TotalRatings,
                    uploadedBy = r.Uploader.FirstName + " " + r.Uploader.LastName
                })
                .ToListAsync();

            return Ok(resources);
        }

        // GET: api/resource/recommended — Based on latest assessment
        [HttpGet("recommended")]
        public async Task<IActionResult> GetRecommended()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var latestAssessment = await _context.SelfAssessments
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.DateCompleted)
                .FirstOrDefaultAsync();

            if (latestAssessment == null)
            {
                var general = await _context.Resources
                    .Include(r => r.Uploader)
                    .Where(r => r.Category == "General")
                    .OrderByDescending(r => r.AverageRating)
                    .ThenByDescending(r => r.DateUploaded)
                    .Take(3)
                    .Select(r => new
                    {
                        r.Id, r.Title, r.Description, r.Type,
                        r.Category, r.Url, r.AverageRating, r.TotalRatings,
                        uploadedBy = r.Uploader.FirstName + " " + r.Uploader.LastName
                    })
                    .ToListAsync();

                return Ok(new { message = "No assessment found. Showing general resources.", primaryConcern = (string?)null, resources = general });
            }

            var primaryConcern = latestAssessment.Primaryconcern;

            var recommended = await _context.Resources
                .Include(r => r.Uploader)
                .Where(r => r.Category == primaryConcern || r.Category == "General")
                .OrderByDescending(r => r.Category == primaryConcern)
                .ThenByDescending(r => r.AverageRating)
                .ThenByDescending(r => r.DateUploaded)
                .Take(6)
                .Select(r => new
                {
                    r.Id, r.Title, r.Description, r.Type,
                    r.Category, r.Url, r.AverageRating, r.TotalRatings,
                    uploadedBy = r.Uploader.FirstName + " " + r.Uploader.LastName
                })
                .ToListAsync();

            return Ok(new
            {
                message        = $"Resources recommended for your primary concern: {primaryConcern}",
                primaryConcern,
                resources      = recommended
            });
        }

        // GET: api/resource/my-uploads — Professional only
        [HttpGet("my-uploads")]
        [Authorize(Roles = "Professional")]
        public async Task<IActionResult> GetMyUploads()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var resources = await _context.Resources
                .Where(r => r.UploadedBy == userId)
                .OrderByDescending(r => r.DateUploaded)
                .Select(r => new
                {
                    r.Id, r.Title, r.Description, r.Type,
                    r.Category, r.Url, r.DateUploaded,
                    r.AverageRating, r.TotalRatings
                })
                .ToListAsync();

            return Ok(resources);
        }

        // DELETE: api/resource/{id} — Professional (own resources) or Admin
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            var resource = await _context.Resources.FindAsync(id);
            if (resource == null) return NotFound("Resource not found.");

            // Admins can delete any resource; professionals can only delete their own
            if (role == "Admin" || resource.UploadedBy == userId)
            {
                _context.Resources.Remove(resource);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Resource deleted successfully." });
            }

            return Forbid("You can only delete resources you uploaded.");
        }
    }
}