using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Security.Claims;
using kaizenbackend.Data;
using kaizenbackend.Services;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<NotificationsController> _logger;

        public NotificationsController(
            AppDbContext context,
            IEmailService emailService,
            ILogger<NotificationsController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpPost("email")]
        public async Task<IActionResult> SendCurrentUserNotificationEmail([FromBody] NotificationEmailDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Subject) || string.IsNullOrWhiteSpace(dto.Message))
                return BadRequest(new { message = "Subject and message are required." });

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();

            int userId = int.Parse(userIdClaim);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
            if (user == null) return NotFound(new { message = "User not found." });

            string safeSubject = dto.Subject.Trim();
            string safeMessage = WebUtility.HtmlEncode(dto.Message.Trim()).Replace("\n", "<br/>");
            string displayName = $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(displayName)) displayName = "there";

            string body = $@"
                <h2>{WebUtility.HtmlEncode(safeSubject)}</h2>
                <p>Hi {WebUtility.HtmlEncode(displayName)},</p>
                <p>{safeMessage}</p>
                <hr/>
                <p style='font-size:12px; color:#666;'>Kaizen Mental Health Platform</p>
            ";

            var sent = await _emailService.SendEmailAsync(user.Email, safeSubject, body, isHtml: true);
            if (!sent)
            {
                _logger.LogWarning("Failed to send notification email to user {UserId}", userId);
                return StatusCode(500, new { message = "Failed to send notification email." });
            }

            return Ok(new { message = "Notification email sent." });
        }
    }

    public class NotificationEmailDto
    {
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
    }
}
