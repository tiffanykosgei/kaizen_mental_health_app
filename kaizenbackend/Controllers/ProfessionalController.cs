using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using kaizenbackend.Data;
using kaizenbackend.Models;
using kaizenbackend.DTOs;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ProfessionalController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ProfessionalController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/professional/profile
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var user = await _context.Users
                .Include(u => u.ProfessionalProfile)
                .FirstOrDefaultAsync(u => u.Id == userId && u.Role == "Professional");

            if (user == null)
                return NotFound("Professional profile not found.");

            return Ok(new
            {
                user.Id,
                FirstName = user.FirstName,
                LastName = user.LastName,
                FullName = user.FirstName + " " + user.LastName,
                user.Email,
                user.PhoneNumber,
                user.DateRegistered,
                Profile = user.ProfessionalProfile != null ? new
                {
                    user.ProfessionalProfile.Bio,
                    user.ProfessionalProfile.Specialization,
                    user.ProfessionalProfile.YearsOfExperience,
                    user.ProfessionalProfile.Experience,
                    user.ProfessionalProfile.Education,
                    user.ProfessionalProfile.Certifications,
                    user.ProfessionalProfile.LicenseNumber,
                    user.ProfessionalProfile.AverageRating,
                    user.ProfessionalProfile.PaymentMethod,
                    user.ProfessionalProfile.PaymentAccount,
                    user.ProfessionalProfile.ExternalProfileUrl
                } : null
            });
        }

        // GET: api/professional/public-profile/{id}
        [HttpGet("public-profile/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicProfile(int id)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.ProfessionalProfile)
                    .FirstOrDefaultAsync(u => u.Id == id && u.Role == "Professional");

                if (user == null)
                    return NotFound(new { message = "Professional not found." });

                return Ok(new
                {
                    id         = user.Id,
                    firstName  = user.FirstName,
                    lastName   = user.LastName,
                    email      = user.Email,
                    profile = user.ProfessionalProfile != null ? new
                    {
                        bio                = user.ProfessionalProfile.Bio ?? "",
                        specialization     = user.ProfessionalProfile.Specialization ?? "",
                        yearsOfExperience  = user.ProfessionalProfile.YearsOfExperience ?? "",
                        education          = user.ProfessionalProfile.Education ?? "",
                        certifications     = user.ProfessionalProfile.Certifications ?? "",
                        licenseNumber      = user.ProfessionalProfile.LicenseNumber ?? "",
                        averageRating      = user.ProfessionalProfile.AverageRating,
                        externalProfileUrl = user.ProfessionalProfile.ExternalProfileUrl ?? ""
                    } : null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error retrieving profile.", error = ex.Message });
            }
        }

        // PUT: api/professional/payment-setup
        [HttpPut("payment-setup")]
        public async Task<IActionResult> UpdatePaymentSetup([FromBody] PaymentSetupDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (professional == null)
                return NotFound("Professional profile not found.");

            professional.PaymentMethod = dto.PaymentMethod;
            professional.PaymentAccount = dto.PaymentAccount;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Payment setup updated successfully.",
                paymentMethod = professional.PaymentMethod,
                paymentAccount = professional.PaymentAccount
            });
        }

        // GET: api/professional/earnings
        [HttpGet("earnings")]
        public async Task<IActionResult> GetEarnings()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (professional == null)
                return NotFound("Professional profile not found.");

            var sessions = await _context.Sessions
                .Where(s => s.ProfessionalId == userId && s.PaymentStatus == "Paid")
                .ToListAsync();

            var totalEarned = sessions.Sum(s => s.ProfessionalEarnings);
            var pendingPayout = sessions.Where(s => s.PayoutStatus == "Pending").Sum(s => s.ProfessionalEarnings);
            var paidOut = sessions.Where(s => s.PayoutStatus == "PaidOut").Sum(s => s.ProfessionalEarnings);
            var totalSessions = sessions.Count;

            var ratings = await _context.Ratings
                .Where(r => r.ProfessionalId == userId)
                .ToListAsync();

            var averageRating = ratings.Any() ? ratings.Average(r => r.RatingValue) : 0;

            var settings = await _context.PlatformSettings.FirstOrDefaultAsync();
            int defaultProfessionalPercentage = settings?.DefaultProfessionalPercentage ?? 60;
            int currentSplitPercentage = professional.CustomSplitPercentage ?? defaultProfessionalPercentage;

            return Ok(new
            {
                totalEarned,
                pendingPayout,
                paidOut,
                totalSessions,
                averageRating = Math.Round(averageRating, 1),
                currentSplitPercentage
            });
        }

        // GET: api/professional/payout-history
        [HttpGet("payout-history")]
        public async Task<IActionResult> GetPayoutHistory()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var paidOutSessions = await _context.Sessions
                .Where(s => s.ProfessionalId == userId && s.PayoutStatus == "PaidOut")
                .OrderByDescending(s => s.UpdatedAt)
                .Select(s => new
                {
                    s.Id,
                    Date = s.UpdatedAt ?? s.CreatedAt,
                    Amount = s.ProfessionalEarnings,
                    SessionId = s.Id,
                    ClientName = s.Client.FirstName + " " + s.Client.LastName
                })
                .ToListAsync();

            var payoutGroups = paidOutSessions
                .GroupBy(s => s.Date.ToString("yyyy-MM"))
                .Select(g => new
                {
                    Id = g.First().Id,
                    Date = g.First().Date,
                    Amount = g.Sum(s => s.Amount),
                    Method = "M-Pesa / Bank Transfer",
                    Reference = $"PAY-{g.Key.Replace("-", "")}",
                    Status = "Completed",
                    SessionsCount = g.Count()
                })
                .OrderByDescending(p => p.Date)
                .ToList();

            return Ok(payoutGroups);
        }

        // PUT: api/professional/profile
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfessionalProfileDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var user = await _context.Users.FindAsync(userId);
            var professional = await _context.ProfessionalProfiles
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (user == null || professional == null)
                return NotFound("Professional profile not found.");

            if (!string.IsNullOrEmpty(dto.FirstName))
                user.FirstName = dto.FirstName;
            
            if (!string.IsNullOrEmpty(dto.LastName))
                user.LastName = dto.LastName;

            if (!string.IsNullOrEmpty(dto.PhoneNumber))
                user.PhoneNumber = dto.PhoneNumber;

            if (!string.IsNullOrEmpty(dto.Bio))
                professional.Bio = dto.Bio;
            
            if (!string.IsNullOrEmpty(dto.Specialization))
                professional.Specialization = dto.Specialization;
            
            if (!string.IsNullOrEmpty(dto.YearsOfExperience))
                professional.YearsOfExperience = dto.YearsOfExperience;
            
            if (!string.IsNullOrEmpty(dto.Experience))
                professional.Experience = dto.Experience;
            
            if (!string.IsNullOrEmpty(dto.Education))
                professional.Education = dto.Education;
            
            if (!string.IsNullOrEmpty(dto.Certifications))
                professional.Certifications = dto.Certifications;
            
            if (!string.IsNullOrEmpty(dto.LicenseNumber))
                professional.LicenseNumber = dto.LicenseNumber;

            await _context.SaveChangesAsync();

            return Ok(new 
            { 
                message = "Profile updated successfully.",
                firstName = user.FirstName,
                lastName = user.LastName,
                fullName = user.FirstName + " " + user.LastName,
                phoneNumber = user.PhoneNumber,
                bio = professional.Bio,
                specialization = professional.Specialization,
                yearsOfExperience = professional.YearsOfExperience,
                experience = professional.Experience,
                education = professional.Education,
                certifications = professional.Certifications,
                licenseNumber = professional.LicenseNumber
            });
        }

        // GET: api/professional/earnings-breakdown
        [HttpGet("earnings-breakdown")]
        public async Task<IActionResult> GetEarningsBreakdown()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var sessions = await _context.Sessions
                .Where(s => s.ProfessionalId == userId && s.PaymentStatus == "Paid")
                .OrderByDescending(s => s.SessionDate)
                .Select(s => new
                {
                    s.Id,
                    s.SessionDate,
                    s.Amount,
                    s.ProfessionalEarnings,
                    s.PlatformFee,
                    s.PayoutStatus,
                    ClientName = s.Client.FirstName + " " + s.Client.LastName,
                    FormattedDate = s.SessionDate.ToString("dd MMM yyyy, hh:mm tt")
                })
                .ToListAsync();

            return Ok(sessions);
        }
    }

    // DTOs
    public class PaymentSetupDto
    {
        public string? PaymentMethod { get; set; }
        public string? PaymentAccount { get; set; }
    }
}