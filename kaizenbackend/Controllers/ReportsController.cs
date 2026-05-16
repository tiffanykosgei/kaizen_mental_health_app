using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using kaizenbackend.Data;
using kaizenbackend.DTOs;
using kaizenbackend.Models;
using kaizenbackend.Services;   // Add this for IEmailService
using System.Linq;
using System.Net;
using System.Threading.Tasks;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(
            AppDbContext context,
            IEmailService emailService,
            ILogger<ReportsController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        // POST api/reports/professional
        [HttpPost("professional")]
        [Authorize(Roles = "Client")]
        public async Task<IActionResult> ReportProfessional([FromBody] ReportProfessionalDto dto)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized();
                int clientId = int.Parse(userIdClaim);

                // Verify the professional exists
                var professional = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == dto.ProfessionalId && u.Role == "Professional" && u.IsActive);
                if (professional == null)
                    return NotFound(new { message = "Professional not found." });

                // Create the report
                var report = new ProfessionalReport
                {
                    ProfessionalId = dto.ProfessionalId,
                    ClientId = clientId,
                    Complaint = dto.Complaint,
                    CreatedAt = DateTime.UtcNow,
                    Status = "Pending"
                };

                _context.ProfessionalReports.Add(report);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Client {clientId} reported professional {dto.ProfessionalId}. Report ID: {report.Id}");

                // --- FIRE‑AND‑FORGET EMAIL NOTIFICATIONS ---
                // Do not await – we don't want to slow the API response
                await SendEmailNotificationsAsync(report.Id, clientId, professional.Id, dto.Complaint);

                return Ok(new { message = "Report submitted successfully. Admin will review it shortly." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error submitting professional report");
                return StatusCode(500, new { message = "An error occurred while submitting the report." });
            }
        }

        private async Task SendEmailNotificationsAsync(int reportId, int clientId, int professionalId, string complaint)
        {
            try
            {
                // 1. Get client details
                var client = await _context.Users.FindAsync(clientId);
                string clientName = client != null ? $"{client.FirstName} {client.LastName}" : $"Client ID {clientId}";
                string? clientEmail = client?.Email;

                // 2. Get professional details
                var professional = await _context.Users.FindAsync(professionalId);
                string proName = professional != null ? $"{professional.FirstName} {professional.LastName}" : $"Professional ID {professionalId}";

                // 3. Get all active admin emails
                var adminEmails = await _context.Users
                    .Where(u => u.Role == "Admin" && u.IsActive && !string.IsNullOrEmpty(u.Email))
                    .Select(u => u.Email)
                    .ToListAsync();

                // 4. Prepare email subject and body for admins
                string encodedComplaint = WebUtility.HtmlEncode(complaint).Replace("\n", "<br/>");
                string adminSubject = $"New Professional Report - {proName}";
                string adminBody = $@"
                    <h2>Professional Report Received</h2>
                    <p><strong>Report ID:</strong> {reportId}</p>
                    <p><strong>Reported Professional:</strong> {proName} (ID: {professionalId})</p>
                    <p><strong>Reported by:</strong> {clientName} (Client ID: {clientId})</p>
                    <p><strong>Complaint:</strong></p>
                    <div style='background:#f5f5f5; padding:12px; border-radius:6px; margin:10px 0;'>
                        {encodedComplaint}
                    </div>
                    <p>Please log in to the admin panel to review and take action.</p>
                    <hr/>
                    <p style='font-size:12px; color:#666;'>Kaizen Mental Health Platform</p>
                ";

                // 5. Send to all admins
                foreach (var adminEmail in adminEmails)
                {
                    await _emailService.SendEmailAsync(adminEmail, adminSubject, adminBody, isHtml: true);
                    _logger.LogInformation($"Admin notification sent to {adminEmail} for report {reportId}");
                }

                // 6. Send a confirmation email to the client (if email exists)
                if (!string.IsNullOrEmpty(clientEmail))
                {
                    string clientSubject = "Your report has been submitted";
                    string clientBody = $@"
                        <h2>Thank you for your report</h2>
                        <p>Dear {clientName},</p>
                        <p>We have received your report regarding <strong>{proName}</strong>.</p>
                        <p>Our admin team will review the complaint and take appropriate action. You will be notified if further information is needed.</p>
                        <p><strong>Your complaint (for your records):</strong></p>
                        <div style='background:#f5f5f5; padding:12px; border-radius:6px;'>
                            {encodedComplaint}
                        </div>
                        <p>Report ID: <strong>{reportId}</strong></p>
                        <br/>
                        <p>Thank you for helping keep our community safe.</p>
                        <p>- Kaizen Mental Health Team</p>
                    ";
                    await _emailService.SendEmailAsync(clientEmail, clientSubject, clientBody, isHtml: true);
                    _logger.LogInformation($"Client confirmation email sent to {clientEmail} for report {reportId}");
                }
            }
            catch (Exception ex)
            {
                // Log but do NOT throw – email failure should not affect the API response
                _logger.LogError(ex, $"Failed to send email notifications for report {reportId}");
            }
        }

        // GET api/reports/all (unchanged)
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAllReports()
        {
            var reports = await _context.ProfessionalReports
                .Include(r => r.Professional)
                .Include(r => r.Client)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    r.Id,
                    r.Complaint,
                    r.CreatedAt,
                    r.Status,
                    Professional = new
                    {
                        r.Professional.Id,
                        r.Professional.FirstName,
                        r.Professional.LastName,
                        r.Professional.Email
                    },
                    Client = new
                    {
                        r.Client.Id,
                        r.Client.FirstName,
                        r.Client.LastName,
                        r.Client.Email
                    }
                })
                .ToListAsync();

            return Ok(reports);
        }

        // PATCH api/reports/{id}/status (unchanged)
        [HttpPatch("{id}/status")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateReportStatus(int id, [FromBody] string newStatus)
        {
            var report = await _context.ProfessionalReports.FindAsync(id);
            if (report == null) return NotFound();

            report.Status = newStatus;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Report status updated." });
        }
    }
}
