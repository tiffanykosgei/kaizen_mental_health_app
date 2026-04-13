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
            // Check if email already exists
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "An account with this email already exists. Please login instead." });
            }

            // Generate 6-digit code
            var code = new Random().Next(100000, 999999).ToString();
            
            // Store verification record
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
            
            // Remove old unverified entries for same email
            var oldVerifications = _context.EmailVerifications
                .Where(v => v.Email == dto.Email && !v.IsVerified && v.ExpiresAt < DateTime.UtcNow);
            _context.EmailVerifications.RemoveRange(oldVerifications);
            
            await _context.SaveChangesAsync();
            
            // Send email
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
            
            // Mark as verified
            verification.IsVerified = true;
            await _context.SaveChangesAsync();
            
            return Ok(new { message = "Email verified successfully. You can now complete registration." });
        }

        // POST: api/auth/complete-registration
        [HttpPost("complete-registration")]
        public async Task<IActionResult> CompleteRegistration([FromBody] CompleteRegistrationDto dto)
        {
            Console.WriteLine($"CompleteRegistration called for email: {dto.Email}, Role: {dto.Role}, IsGoogleUser: {dto.IsGoogleUser}");

            // Validate password
            var passwordErrors = ValidatePassword(dto.Password);
            if (passwordErrors.Any())
                return BadRequest(new { message = string.Join(" ", passwordErrors) });

            if (dto.Password != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            // For non-Google users, verify email was verified
            if (!dto.IsGoogleUser)
            {
                var verification = await _context.EmailVerifications
                    .FirstOrDefaultAsync(v => v.Email == dto.Email && v.IsVerified);
                
                if (verification == null)
                {
                    return BadRequest(new { message = "Please verify your email address first." });
                }
                
                // Remove the verification record
                _context.EmailVerifications.Remove(verification);
            }

            // Check if user already exists
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
            {
                return BadRequest(new { message = "An account with this email already exists." });
            }

            // Create user
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

            // Create role-specific profile
            if (dto.Role == "Client")
            {
                _context.ClientProfiles.Add(new ClientProfile { UserId = user.Id });
                await _context.SaveChangesAsync();
            }
            else if (dto.Role == "Professional")
            {
                _context.ProfessionalProfiles.Add(new ProfessionalProfile
                {
                    UserId = user.Id,
                    Bio = dto.Bio ?? "",
                    Specialization = dto.Specialization ?? ""
                });
                await _context.SaveChangesAsync();
            }
            else if (dto.Role == "Admin")
            {
                _context.Admins.Add(new Admin { UserId = user.Id });
                await _context.SaveChangesAsync();
            }

            // Generate token and log them in
            var token = GenerateToken(user);
            string fullName = $"{user.FirstName} {user.LastName}".Trim();

            Console.WriteLine($"User created successfully: {user.Email} with Role: {user.Role}");

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

            // Check if user is a Google user
            if (!string.IsNullOrEmpty(user.PasswordHash) && !user.PasswordHash.StartsWith("google_"))
                return BadRequest(new { message = "You already have a password set." });

            // Validate password strength
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

            // Check if user already exists
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);

            if (user == null)
            {
                // New Google user - return data to complete registration
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

            // Existing user - log them in normally
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

        // POST: api/auth/update-profile
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

            if (user.Role == "Professional" && user.ProfessionalProfile != null)
            {
                if (!string.IsNullOrWhiteSpace(dto.Bio)) user.ProfessionalProfile.Bio = dto.Bio;
                if (!string.IsNullOrWhiteSpace(dto.Specialization)) user.ProfessionalProfile.Specialization = dto.Specialization;
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

            // Check if user is a Google user (no password or starts with google_)
            bool isGoogleUser = string.IsNullOrEmpty(user.PasswordHash) || 
                                user.PasswordHash.StartsWith("google_");

            // For Google users, we don't require password verification
            // For regular users, verify password
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
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var user = await _context.Users
                .Include(u => u.ClientProfile)
                .Include(u => u.ProfessionalProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return NotFound("User not found.");

            string fullName = $"{user.FirstName} {user.LastName}".Trim();

            return Ok(new
            {
                user.Id,
                user.FirstName,
                user.LastName,
                FullName = fullName,
                user.Email,
                user.Role,
                user.PhoneNumber,
                user.DateRegistered,
                ClientProfile = user.ClientProfile != null ? new
                {
                    user.ClientProfile.EmergencyContact,
                    user.ClientProfile.EmergencyContactPhone,
                    user.ClientProfile.Diagnoses,
                    user.ClientProfile.CurrentMedications,
                    user.ClientProfile.PreviousTherapy,
                    user.ClientProfile.KnownTriggers,
                    user.ClientProfile.MedicalNotes
                } : null,
                ProfessionalProfile = user.ProfessionalProfile != null ? new
                {
                    user.ProfessionalProfile.Bio,
                    user.ProfessionalProfile.Specialization,
                    user.ProfessionalProfile.PaymentMethod,
                    user.ProfessionalProfile.PaymentAccount
                } : null
            });
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
    }
}