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

        [HttpPost("upload")]
        public async Task<IActionResult> Upload(CreateResourceDto dto)
        {
            // Get the logged-in user's ID
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            // Check if user is a Professional
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Professional")
                return Forbid("Only professionals can upload resources.");

            // Validate type
            var allowedTypes = new[] { "Article", "Video", "Guide", "Exercise" };
            if (!allowedTypes.Contains(dto.Type))
                return BadRequest("Type must be Article, Video, Guide or Exercise.");

            // Validate category
            var allowedCategories = new[] { "Anxiety", "Depression", "Loneliness", "General" };
            if (!allowedCategories.Contains(dto.Category))
                return BadRequest("Category must be Anxiety, Depression, Loneliness or General.");

            // Validate required fields
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest("Title is required.");
            
            if (string.IsNullOrWhiteSpace(dto.Url))
                return BadRequest("URL is required.");

            // Create the resource
            var resource = new Resource
            {
                Title = dto.Title,
                Description = dto.Description ?? string.Empty,
                Type = dto.Type,
                Category = dto.Category,
                Url = dto.Url,
                UploadedBy = userId,
                DateUploaded = DateTime.UtcNow
            };

            _context.Resources.Add(resource);
            await _context.SaveChangesAsync();

            return Ok(new 
            { 
                message = "Resource uploaded successfully.", 
                resourceId = resource.Id 
            });
        }

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
                    uploadedBy = r.Uploader.FullName
                })
                .ToListAsync();

            return Ok(resources);
        }

        [HttpGet("by-category/{category}")]
        public async Task<IActionResult> GetByCategory(string category)
        {
            var allowedCategories = new[] { "Anxiety", "Depression", "Loneliness", "General" };
            if (!allowedCategories.Contains(category))
                return BadRequest("Invalid category. Must be Anxiety, Depression, Loneliness or General.");

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
                    uploadedBy = r.Uploader.FullName
                })
                .ToListAsync();

            return Ok(resources);
        }

        [HttpGet("recommended")]
        public async Task<IActionResult> GetRecommended()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            // Get the client's latest assessment
            var latestAssessment = await _context.SelfAssessments
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.DateCompleted)
                .FirstOrDefaultAsync();

            // If no assessment exists, return general resources
            if (latestAssessment == null)
            {
                var generalResources = await _context.Resources
                    .Where(r => r.Category == "General")
                    .OrderByDescending(r => r.DateUploaded)
                    .Select(r => new
                    {
                        r.Id,
                        r.Title,
                        r.Description,
                        r.Type,
                        r.Category,
                        r.Url
                    })
                    .ToListAsync();

                return Ok(new
                {
                    message = "No assessment found. Showing general resources.",
                    primaryConcern = (string?)null,
                    resources = generalResources
                });
            }

            var primaryConcern = latestAssessment.Primaryconcern;

            // Get resources matching primary concern first, then general resources
            var recommended = await _context.Resources
                .Where(r => r.Category == primaryConcern || r.Category == "General")
                .OrderByDescending(r => r.Category == primaryConcern)
                .ThenByDescending(r => r.DateUploaded)
                .Select(r => new
                {
                    r.Id,
                    r.Title,
                    r.Description,
                    r.Type,
                    r.Category,
                    r.Url
                })
                .ToListAsync();

            return Ok(new
            {
                message = $"Resources recommended based on your primary concern: {primaryConcern}",
                primaryConcern,
                resources = recommended
            });
        }

        [HttpGet("my-uploads")]
        public async Task<IActionResult> GetMyUploads()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Professional")
                return Forbid("Only professionals can view their uploads.");

            var resources = await _context.Resources
                .Where(r => r.UploadedBy == userId)
                .OrderByDescending(r => r.DateUploaded)
                .Select(r => new
                {
                    r.Id,
                    r.Title,
                    r.Description,
                    r.Type,
                    r.Category,
                    r.Url,
                    r.DateUploaded
                })
                .ToListAsync();

            return Ok(resources);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != "Professional")
                return Forbid("Only professionals can delete resources.");

            var resource = await _context.Resources.FindAsync(id);
            if (resource == null) 
                return NotFound("Resource not found.");

            // Only the professional who uploaded it can delete it
            if (resource.UploadedBy != userId)
                return Forbid("You can only delete resources you uploaded.");

            _context.Resources.Remove(resource);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Resource deleted successfully." });
        }
    }
}