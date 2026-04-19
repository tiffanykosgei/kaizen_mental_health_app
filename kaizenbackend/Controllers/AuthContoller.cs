using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using kaizenbackend.Data;
using kaizenbackend.DTOs;
using kaizenbackend.Models;
using Google.Apis.Auth;
using kaizenbackend.Services;
using System.Text.Json;

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly IEmailService _emailService;

        public AuthController(AppDbContext context, IConfiguration config, IEmailService emailService)
        {
            _context = context;
            _config = config;
            _emailService = emailService;
        }

        // POST: api/auth/send-verification
        [HttpPost("send-verification")]
        public async Task<IActionResult> SendVerification([FromBody] SendVerificationDto dto)
        {
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "An account with this email already exists. Please login instead." });
            }

            var code = new Random().Next(100000, 999999).ToString();
            
            var verification = new EmailVerification
            {
                Email = dto.Email,
                Code = code,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IsVerified = false,
                TempRegistrationData = null
            };
            
            _context.EmailVerifications.Add(verification);
            
            var oldVerifications = _context.EmailVerifications
                .Where(v => v.Email == dto.Email && !v.IsVerified && v.ExpiresAt < DateTime.UtcNow);
            _context.EmailVerifications.RemoveRange(oldVerifications);
            
            await _context.SaveChangesAsync();
            
            var emailSent = await _emailService.SendVerificationCodeAsync(dto.Email, code);
            
            if (!emailSent)
            {
                return StatusCode(500, new { message = "Failed to send verification email. Please try again." });
            }
            
            return Ok(new { message = "Verification code sent to your email.", expiresIn = 10 });
        }

        // POST: api/auth/verify-code
        [HttpPost("verify-code")]
        public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeDto dto)
        {
            var verification = await _context.EmailVerifications
                .FirstOrDefaultAsync(v => v.Email == dto.Email && v.Code == dto.Code && !v.IsVerified);
            
            if (verification == null)
            {
                return BadRequest(new { message = "Invalid or expired verification code." });
            }
            
            if (verification.ExpiresAt < DateTime.UtcNow)
            {
                _context.EmailVerifications.Remove(verification);
                await _context.SaveChangesAsync();
                return BadRequest(new { message = "Verification code has expired. Please request a new one." });
            }
            
            verification.IsVerified = true;
            await _context.SaveChangesAsync();
            
            return Ok(new { message = "Email verified successfully. You can now complete registration." });
        }

        // POST: api/auth/complete-registration
        [HttpPost("complete-registration")]
        public async Task<IActionResult> CompleteRegistration([FromBody] CompleteRegistrationDto dto)
        {
            Console.WriteLine($"CompleteRegistration called for email: {dto.Email}, Role: {dto.Role}");

            var passwordErrors = ValidatePassword(dto.Password);
            if (passwordErrors.Any())
                return BadRequest(new { message = string.Join(" ", passwordErrors) });

            if (dto.Password != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            if (!dto.IsGoogleUser)
            {
                var verification = await _context.EmailVerifications
                    .FirstOrDefaultAsync(v => v.Email == dto.Email && v.IsVerified);
                
                if (verification == null)
                {
                    return BadRequest(new { message = "Please verify your email address first." });
                }
                
                _context.EmailVerifications.Remove(verification);
            }

            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "An account with this email already exists." });
            }

            var user = new User
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                DateRegistered = DateTime.UtcNow,
                PhoneNumber = dto.PhoneNumber ?? ""
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            if (dto.Role == "Client")
            {
                _context.ClientProfiles.Add(new ClientProfile { UserId = user.Id });
                await _context.SaveChangesAsync();
            }
            else if (dto.Role == "Professional")
            {
                var professionalProfile = new ProfessionalProfile
                {
                    UserId = user.Id,
                    Bio = dto.Bio ?? "",
                    Specialization = dto.Specialization ?? "",
                    YearsOfExperience = dto.YearsOfExperience ?? "",
                    Education = dto.Education ?? "",
                    Certifications = dto.Certifications ?? "",
                    LicenseNumber = dto.LicenseNumber ?? "",
                    ProfessionalLinks = new ProfessionalLinks
                    {
                        Linkedin = dto.ProfessionalLinks?.Linkedin ?? "",
                        Website = dto.ProfessionalLinks?.Website ?? "",
                        Portfolio = dto.ProfessionalLinks?.Portfolio ?? ""
                    }
                };
                _context.ProfessionalProfiles.Add(professionalProfile);
                await _context.SaveChangesAsync();
            }
            else if (dto.Role == "Admin")
            {
                _context.Admins.Add(new Admin { UserId = user.Id });
                await _context.SaveChangesAsync();
            }

            var token = GenerateToken(user);
            string fullName = $"{user.FirstName} {user.LastName}".Trim();

            return Ok(new
            {
                token,
                role = user.Role,
                firstName = user.FirstName,
                lastName = user.LastName,
                fullName,
                message = "Account created successfully!"
            });
        }

        // POST: api/auth/check-email
        [HttpPost("check-email")]
        public async Task<IActionResult> CheckEmail([FromBody] CheckEmailDto dto)
        {
            var exists = await _context.Users.AnyAsync(u => u.Email == dto.Email);
            return Ok(new { exists });
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized("Invalid email or password.");

            var token = GenerateToken(user);
            string fullName = $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrEmpty(fullName))
                fullName = user.FirstName ?? user.LastName ?? "User";

            return Ok(new
            {
                token,
                role = user.Role,
                firstName = user.FirstName ?? "",
                lastName = user.LastName ?? "",
                fullName
            });
        }

        // POST: api/auth/set-password
        [HttpPost("set-password")]
        [Authorize]
        public async Task<IActionResult> SetPassword([FromBody] SetPasswordDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found.");

            if (!string.IsNullOrEmpty(user.PasswordHash) && !user.PasswordHash.StartsWith("google_"))
                return BadRequest(new { message = "You already have a password set." });

            var passwordErrors = ValidatePassword(dto.NewPassword);
            if (passwordErrors.Any())
                return BadRequest(new { message = string.Join(" ", passwordErrors) });

            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password set successfully. You can now login with email and password." });
        }

        // POST: api/auth/google-login
        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto)
        {
            if (string.IsNullOrEmpty(dto.Credential))
                return BadRequest(new { message = "Google credential is required." });

            GoogleJsonWebSignature.Payload payload;
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { _config["Google:ClientId"] }
                };
                payload = await GoogleJsonWebSignature.ValidateAsync(dto.Credential, settings);
            }
            catch (InvalidJwtException)
            {
                return Unauthorized(new { message = "Invalid Google token. Please try again." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);

            if (user == null)
            {
                return Ok(new
                {
                    requiresPassword = true,
                    email = payload.Email,
                    firstName = payload.GivenName ?? payload.Name?.Split(' ')[0] ?? "",
                    lastName = payload.FamilyName ?? (payload.Name?.Contains(' ') == true
                                ? payload.Name.Substring(payload.Name.IndexOf(' ') + 1)
                                : ""),
                    googleId = payload.Subject,
                    message = "Please set a password to complete your registration."
                });
            }

            var token = GenerateToken(user);
            string fullName = $"{user.FirstName} {user.LastName}".Trim();

            return Ok(new
            {
                token,
                role = user.Role,
                firstName = user.FirstName ?? "",
                lastName = user.LastName ?? "",
                fullName,
                requiresPassword = false
            });
        }

        // PUT: api/auth/update-profile
        [HttpPut("update-profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile(UpdateProfileDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var user = await _context.Users
                .Include(u => u.ProfessionalProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return NotFound("User not found.");

            if (!string.IsNullOrWhiteSpace(dto.FirstName)) user.FirstName = dto.FirstName;
            if (!string.IsNullOrWhiteSpace(dto.LastName)) user.LastName = dto.LastName;
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber;

            if (user.Role == "Professional")
            {
                if (user.ProfessionalProfile == null)
                {
                    user.ProfessionalProfile = new ProfessionalProfile { UserId = user.Id };
                    _context.ProfessionalProfiles.Add(user.ProfessionalProfile);
                }
                
                if (dto.Bio != null) user.ProfessionalProfile.Bio = dto.Bio;
                if (dto.Specialization != null) user.ProfessionalProfile.Specialization = dto.Specialization;
                if (dto.YearsOfExperience != null) user.ProfessionalProfile.YearsOfExperience = dto.YearsOfExperience;
                if (dto.Education != null) user.ProfessionalProfile.Education = dto.Education;
                if (dto.Certifications != null) user.ProfessionalProfile.Certifications = dto.Certifications;
                if (dto.LicenseNumber != null) user.ProfessionalProfile.LicenseNumber = dto.LicenseNumber;
                
                if (dto.ProfessionalLinks != null)
                {
                    if (user.ProfessionalProfile.ProfessionalLinks == null)
                        user.ProfessionalProfile.ProfessionalLinks = new ProfessionalLinks();
                    
                    if (dto.ProfessionalLinks.Linkedin != null)
                        user.ProfessionalProfile.ProfessionalLinks.Linkedin = dto.ProfessionalLinks.Linkedin;
                    if (dto.ProfessionalLinks.Website != null)
                        user.ProfessionalProfile.ProfessionalLinks.Website = dto.ProfessionalLinks.Website;
                    if (dto.ProfessionalLinks.Portfolio != null)
                        user.ProfessionalProfile.ProfessionalLinks.Portfolio = dto.ProfessionalLinks.Portfolio;
                }
            }

            if (!string.IsNullOrWhiteSpace(dto.Password))
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            await _context.SaveChangesAsync();

            string fullName = $"{user.FirstName} {user.LastName}".Trim();

            return Ok(new
            {
                message = "Profile updated successfully.",
                firstName = user.FirstName,
                lastName = user.LastName,
                fullName,
                phoneNumber = user.PhoneNumber
            });
        }

        // DELETE: api/auth/account
        [HttpDelete("account")]
        [Authorize]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var user = await _context.Users
                .Include(u => u.ClientProfile)
                .Include(u => u.ProfessionalProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return NotFound(new { message = "User not found." });

            bool isGoogleUser = string.IsNullOrEmpty(user.PasswordHash) || 
                                user.PasswordHash.StartsWith("google_");

            if (!isGoogleUser)
            {
                if (string.IsNullOrEmpty(dto.Password) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                    return BadRequest(new { message = "Incorrect password. Account deletion cancelled." });
            }

            if (user.Role == "Admin")
            {
                var adminCount = await _context.Users.CountAsync(u => u.Role == "Admin");
                if (adminCount <= 1)
                    return BadRequest(new { message = "Cannot delete the only admin account. Please create another admin first." });
            }

            if (user.Role == "Professional" && user.ProfessionalProfile != null)
            {
                var sessions = await _context.Sessions
                    .Where(s => s.ProfessionalId == userId || s.ClientId == userId).ToListAsync();
                _context.Sessions.RemoveRange(sessions);

                var ratings = await _context.Ratings
                    .Where(r => r.ProfessionalId == userId || r.ClientId == userId).ToListAsync();
                _context.Ratings.RemoveRange(ratings);

                var resources = await _context.Resources
                    .Where(r => r.UploadedBy == userId).ToListAsync();
                _context.Resources.RemoveRange(resources);

                _context.ProfessionalProfiles.Remove(user.ProfessionalProfile);
            }
            else if (user.Role == "Client" && user.ClientProfile != null)
            {
                var sessions = await _context.Sessions
                    .Where(s => s.ClientId == userId).ToListAsync();
                _context.Sessions.RemoveRange(sessions);

                var assessments = await _context.SelfAssessments
                    .Where(a => a.UserId == userId).ToListAsync();
                _context.SelfAssessments.RemoveRange(assessments);

                var journals = await _context.JournalEntries
                    .Where(j => j.UserId == userId).ToListAsync();
                _context.JournalEntries.RemoveRange(journals);

                var ratings = await _context.Ratings
                    .Where(r => r.ClientId == userId).ToListAsync();
                _context.Ratings.RemoveRange(ratings);

                _context.ClientProfiles.Remove(user.ClientProfile);
            }
            else if (user.Role == "Admin")
            {
                var sessions = await _context.Sessions
                    .Where(s => s.ClientId == userId || s.ProfessionalId == userId).ToListAsync();
                _context.Sessions.RemoveRange(sessions);

                var adminRecord = await _context.Admins.FirstOrDefaultAsync(a => a.UserId == userId);
                if (adminRecord != null) _context.Admins.Remove(adminRecord);
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Your account has been permanently deleted." });
        }

        // GET: api/auth/profile
        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdClaim))
                {
                    return Unauthorized(new { message = "User not authenticated" });
                }
                
                int userId = int.Parse(userIdClaim);

                var user = await _context.Users
                    .FirstOrDefaultAsync(u => u.Id == userId);
                    
                if (user == null)
                {
                    return NotFound(new { message = "User not found" });
                }

                // Get professional profile separately
                ProfessionalProfile professionalProfile = null;
                if (user.Role == "Professional")
                {
                    professionalProfile = await _context.ProfessionalProfiles
                        .FirstOrDefaultAsync(p => p.UserId == userId);
                    
                    // Create profile if it doesn't exist
                    if (professionalProfile == null)
                    {
                        professionalProfile = new ProfessionalProfile 
                        { 
                            UserId = user.Id,
                            Bio = "",
                            Specialization = "",
                            YearsOfExperience = "",
                            Education = "",
                            Certifications = "",
                            LicenseNumber = "",
                            ProfessionalLinks = new ProfessionalLinks(),
                            PaymentMethod = "Mpesa",
                            PaymentAccount = ""
                        };
                        _context.ProfessionalProfiles.Add(professionalProfile);
                        await _context.SaveChangesAsync();
                    }
                }

                // Build response
                var response = new
                {
                    Id = user.Id,
                    FirstName = user.FirstName ?? "",
                    LastName = user.LastName ?? "",
                    FullName = $"{user.FirstName} {user.LastName}".Trim(),
                    Email = user.Email ?? "",
                    Role = user.Role ?? "",
                    PhoneNumber = user.PhoneNumber ?? "",
                    DateRegistered = user.DateRegistered,
                    ProfessionalProfile = professionalProfile != null ? new
                    {
                        Bio = professionalProfile.Bio ?? "",
                        Specialization = professionalProfile.Specialization ?? "",
                        YearsOfExperience = professionalProfile.YearsOfExperience ?? "",
                        Education = professionalProfile.Education ?? "",
                        Certifications = professionalProfile.Certifications ?? "",
                        LicenseNumber = professionalProfile.LicenseNumber ?? "",
                        ProfessionalLinks = new
                        {
                            Linkedin = professionalProfile.ProfessionalLinks?.Linkedin ?? "",
                            Website = professionalProfile.ProfessionalLinks?.Website ?? "",
                            Portfolio = professionalProfile.ProfessionalLinks?.Portfolio ?? ""
                        }
                    } : null
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetProfile: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            string fullName = $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrEmpty(fullName))
                fullName = user.FirstName ?? user.LastName ?? "User";

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, fullName),
                new Claim("FirstName", user.FirstName ?? ""),
                new Claim("LastName", user.LastName ?? ""),
                new Claim(ClaimTypes.Role, user.Role)
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private List<string> ValidatePassword(string password)
        {
            var errors = new List<string>();
            if (string.IsNullOrEmpty(password)) { errors.Add("Password is required."); return errors; }
            if (password.Length < 8) errors.Add("Password must be at least 8 characters long.");
            if (!password.Any(char.IsUpper)) errors.Add("Password must contain at least 1 uppercase letter.");
            if (!password.Any(char.IsLower)) errors.Add("Password must contain at least 1 lowercase letter.");
            if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
                errors.Add("Password must contain at least 1 special character.");
            return errors;
        }

        // PUT: api/auth/update-password
        [HttpPut("update-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            if (string.IsNullOrEmpty(user.PasswordHash) || user.PasswordHash.StartsWith("google_"))
            {
                return BadRequest(new { message = "You don't have a password set. Please use 'Set Password' instead." });
            }

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }

            var passwordErrors = ValidatePassword(dto.NewPassword);
            if (passwordErrors.Any())
                return BadRequest(new { message = string.Join(" ", passwordErrors) });

            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(new { message = "New passwords do not match." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully." });
        }
    }
}