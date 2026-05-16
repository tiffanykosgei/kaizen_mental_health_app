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

        // Helper to check if current user is Admin
        private bool IsAdmin()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            return role == "Admin";
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
                DateUploaded = DateTime.UtcNow,
                IsActive     = true   // new resources are active by default
            };

            _context.Resources.Add(resource);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Resource uploaded successfully.", resourceId = resource.Id });
        }

        // GET: api/resource/all — All roles (clients, professionals, admins)
        [HttpGet("all")]
        public async Task<IActionResult> GetAll()
        {
            var query = _context.Resources.AsQueryable();

            // Non‑admins see only active resources
            if (!IsAdmin())
                query = query.Where(r => r.IsActive && r.Uploader.IsActive);

            query = query.Include(r => r.Uploader);

            var resources = await query
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
                    uploadedById = r.Uploader.Id,
                    uploadedByEmail = r.Uploader.Email,
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

            var query = _context.Resources
                .Include(r => r.Uploader)
                .Where(r => r.Category == category);

            if (!IsAdmin())
                query = query.Where(r => r.IsActive && r.Uploader.IsActive);

            var resources = await query
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
                    uploadedById = r.Uploader.Id,
                    uploadedByEmail = r.Uploader.Email,
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

            // Base query: active resources
            var query = _context.Resources
                .Include(r => r.Uploader)
                .Where(r => r.IsActive && r.Uploader.IsActive);

            if (latestAssessment == null)
            {
                var general = await query
                    .Where(r => r.Category == "General")
                    .OrderByDescending(r => r.AverageRating)
                    .ThenByDescending(r => r.DateUploaded)
                    .Take(3)
                    .Select(r => new
                    {
                        r.Id, r.Title, r.Description, r.Type,
                        r.Category, r.Url, r.AverageRating, r.TotalRatings,
                        uploadedById = r.Uploader.Id,
                        uploadedByEmail = r.Uploader.Email,
                        uploadedBy = r.Uploader.FirstName + " " + r.Uploader.LastName
                    })
                    .ToListAsync();

                return Ok(new { message = "No assessment found. Showing general resources.", primaryConcern = (string?)null, resources = general });
            }

            var primaryConcern = latestAssessment.Primaryconcern;

            var recommended = await query
                .Where(r => r.Category == primaryConcern || r.Category == "General")
                .OrderByDescending(r => r.Category == primaryConcern)
                .ThenByDescending(r => r.AverageRating)
                .ThenByDescending(r => r.DateUploaded)
                .Take(6)
                .Select(r => new
                {
                    r.Id, r.Title, r.Description, r.Type,
                    r.Category, r.Url, r.AverageRating, r.TotalRatings,
                    uploadedById = r.Uploader.Id,
                    uploadedByEmail = r.Uploader.Email,
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

            // Professionals see ALL their own resources (active or inactive)
            var resources = await _context.Resources
                .Where(r => r.UploadedBy == userId)
                .OrderByDescending(r => r.DateUploaded)
                .Select(r => new
                {
                    r.Id, r.Title, r.Description, r.Type,
                    r.Category, r.Url, r.DateUploaded,
                    r.AverageRating, r.TotalRatings,
                    r.IsActive   // include status so frontend can show it
                })
                .ToListAsync();

            return Ok(resources);
        }

        // DELETE: api/resource/{id} — Professionals soft‑deactivate, Admins hard‑delete
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            var resource = await _context.Resources.FindAsync(id);
            if (resource == null) return NotFound("Resource not found.");

            // Admins can still permanently delete any resource
            if (role == "Admin")
            {
                _context.Resources.Remove(resource);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Resource permanently deleted by admin." });
            }

            // Professionals can only deactivate their own resources (soft delete)
            if (resource.UploadedBy == userId)
            {
                resource.IsActive = false;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Resource has been deactivated. It will no longer appear to regular users." });
            }

            return Forbid("You can only delete resources you uploaded.");
        }
    }
}
