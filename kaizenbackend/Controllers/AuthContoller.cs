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
        private readonly IWebHostEnvironment _environment;

        public AuthController(
            AppDbContext context,
            IConfiguration config,
            IEmailService emailService,
            IWebHostEnvironment environment)
        {
            _context      = context;
            _config       = config;
            _emailService = emailService;
            _environment  = environment;
        }

        // ── Normalise a URL — adds https:// if scheme is missing ─────────────
        private static string? NormaliseUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return null;
            url = url.Trim();
            if (url.StartsWith("http://",  StringComparison.OrdinalIgnoreCase) ||
                url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                return url;
            return "https://" + url;
        }

        // ── Validate that a string is a reachable URL ─────────────────────────
        private static bool IsValidUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return true; // optional field — skip if empty
            url = url.Trim();
            if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
                !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                url = "https://" + url;
            return Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
                   && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
        }

        // POST: api/auth/send-verification
        [HttpPost("send-verification")]
        public async Task<IActionResult> SendVerification([FromBody] SendVerificationDto dto)
        {
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existingUser != null)
                return BadRequest(new { message = "An account with this email already exists. Please login instead." });

            var code = new Random().Next(100000, 999999).ToString();

            var verification = new EmailVerification
            {
                Email                = dto.Email,
                Code                 = code,
                CreatedAt            = DateTime.UtcNow,
                ExpiresAt            = DateTime.UtcNow.AddMinutes(10),
                IsVerified           = false,
                TempRegistrationData = null
            };

            _context.EmailVerifications.Add(verification);

            var old = _context.EmailVerifications
                .Where(v => v.Email == dto.Email && !v.IsVerified && v.ExpiresAt < DateTime.UtcNow);
            _context.EmailVerifications.RemoveRange(old);

            await _context.SaveChangesAsync();

            var sent = await _emailService.SendVerificationCodeAsync(dto.Email, code);
            if (!sent)
                return StatusCode(500, new { message = "Failed to send verification email. Please try again." });

            return Ok(new { message = "Verification code sent to your email.", expiresIn = 10 });
        }

        // POST: api/auth/verify-code
        [HttpPost("verify-code")]
        public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeDto dto)
        {
            var verification = await _context.EmailVerifications
                .FirstOrDefaultAsync(v => v.Email == dto.Email && v.Code == dto.Code && !v.IsVerified);

            if (verification == null)
                return BadRequest(new { message = "Invalid or expired verification code." });

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
            Console.WriteLine($"CompleteRegistration: {dto.Email}, Role: {dto.Role}");

            // ── 1. Password validation ─────────────────────────────────────────
            var passwordErrors = ValidatePassword(dto.Password);
            if (passwordErrors.Any())
                return BadRequest(new { message = string.Join(" ", passwordErrors) });

            if (dto.Password != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            // ── 2. Email verification check (non-Google users) ─────────────────
            if (!dto.IsGoogleUser)
            {
                var verification = await _context.EmailVerifications
                    .FirstOrDefaultAsync(v => v.Email == dto.Email && v.IsVerified);

                if (verification == null)
                    return BadRequest(new { message = "Please verify your email address first." });

                _context.EmailVerifications.Remove(verification);
            }

            // ── 3. Duplicate email check ───────────────────────────────────────
            var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (existing != null)
                return BadRequest(new { message = "An account with this email already exists." });

            // ── 4. Professional-specific required field validation ─────────────
            if (dto.Role == "Professional")
            {
                var profErrors = new List<string>();

                if (string.IsNullOrWhiteSpace(dto.FirstName))
                    profErrors.Add("First name is required.");
                if (string.IsNullOrWhiteSpace(dto.LastName))
                    profErrors.Add("Last name is required.");
                if (string.IsNullOrWhiteSpace(dto.PhoneNumber))
                    profErrors.Add("Phone number is required for professionals.");
                if (string.IsNullOrWhiteSpace(dto.LicenseNumber))
                    profErrors.Add("License/Certification number is required.");
                if (string.IsNullOrWhiteSpace(dto.Specialization))
                    profErrors.Add("Specialization is required.");
                if (string.IsNullOrWhiteSpace(dto.YearsOfExperience))
                    profErrors.Add("Years of experience is required.");
                if (string.IsNullOrWhiteSpace(dto.Bio))
                    profErrors.Add("Bio is required.");
                if (string.IsNullOrWhiteSpace(dto.Education))
                    profErrors.Add("Education & Qualifications is required.");
                if (!string.IsNullOrWhiteSpace(dto.ExternalProfileUrl) && !IsValidUrl(dto.ExternalProfileUrl))
                    profErrors.Add("External Profile URL must be a valid URL (e.g. https://linkedin.com/in/yourprofile).");

                if (profErrors.Any())
                    return BadRequest(new { message = string.Join(" ", profErrors) });
            }

            // ── 5. Create user ─────────────────────────────────────────────────
            var user = new User
            {
                FirstName      = dto.FirstName,
                LastName       = dto.LastName,
                Email          = dto.Email,
                PasswordHash   = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role           = dto.Role,
                DateRegistered = DateTime.UtcNow,
                PhoneNumber    = dto.PhoneNumber ?? "",
                ProfilePicture = null
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // ── 6. Create role-specific profile ───────────────────────────────
            if (dto.Role == "Client")
            {
                _context.ClientProfiles.Add(new ClientProfile { UserId = user.Id });
                await _context.SaveChangesAsync();
            }
            else if (dto.Role == "Professional")
            {
                _context.ProfessionalProfiles.Add(new ProfessionalProfile
                {
                    UserId             = user.Id,
                    Bio                = dto.Bio               ?? "",
                    Specialization     = dto.Specialization    ?? "",
                    YearsOfExperience  = dto.YearsOfExperience ?? "",
                    Education          = dto.Education         ?? "",
                    Certifications     = dto.Certifications    ?? "",
                    LicenseNumber      = dto.LicenseNumber     ?? "",
                    ExternalProfileUrl = NormaliseUrl(dto.ExternalProfileUrl)
                });
                await _context.SaveChangesAsync();
            }
            else if (dto.Role == "Admin")
            {
                _context.Admins.Add(new Admin { UserId = user.Id });
                await _context.SaveChangesAsync();
            }

            var token   = GenerateToken(user);
            string fullName = $"{user.FirstName} {user.LastName}".Trim();

            return Ok(new
            {
                token,
                role      = user.Role,
                firstName = user.FirstName,
                lastName  = user.LastName,
                fullName,
                message   = "Account created successfully!"
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
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized("Invalid email or password.");

            var token   = GenerateToken(user);
            string fullName = $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrEmpty(fullName)) fullName = user.FirstName ?? user.LastName ?? "User";

            return Ok(new
            {
                token,
                role           = user.Role,
                firstName      = user.FirstName      ?? "",
                lastName       = user.LastName       ?? "",
                fullName,
                profilePicture = user.ProfilePicture ?? ""
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

            var errs = ValidatePassword(dto.NewPassword);
            if (errs.Any()) return BadRequest(new { message = string.Join(" ", errs) });

            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password set successfully." });
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
                    email     = payload.Email,
                    firstName = payload.GivenName ?? payload.Name?.Split(' ')[0] ?? "",
                    lastName  = payload.FamilyName ?? (payload.Name?.Contains(' ') == true
                                    ? payload.Name.Substring(payload.Name.IndexOf(' ') + 1) : ""),
                    googleId  = payload.Subject,
                    message   = "Please complete your profile to finish registration."
                });
            }

            var token   = GenerateToken(user);
            string fullName = $"{user.FirstName} {user.LastName}".Trim();

            return Ok(new
            {
                token,
                role             = user.Role,
                firstName        = user.FirstName      ?? "",
                lastName         = user.LastName       ?? "",
                fullName,
                requiresPassword = false,
                profilePicture   = user.ProfilePicture ?? ""
            });
        }

        // PUT: api/auth/update-profile
        [HttpPut("update-profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfessionalProfileDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized(new { message = "User not authenticated" });

            int userId = int.Parse(userIdClaim);
            Console.WriteLine($"UpdateProfile: userId={userId}");

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            try
            {
                if (!string.IsNullOrWhiteSpace(dto.FirstName))   user.FirstName   = dto.FirstName;
                if (!string.IsNullOrWhiteSpace(dto.LastName))    user.LastName    = dto.LastName;
                if (!string.IsNullOrWhiteSpace(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber;

                if (user.Role == "Professional")
                {
                    var prof = await _context.ProfessionalProfiles
                        .FirstOrDefaultAsync(p => p.UserId == userId);

                    if (prof == null)
                    {
                        prof = new ProfessionalProfile
                        {
                            UserId             = userId,
                            Bio                = dto.Bio               ?? "",
                            Specialization     = dto.Specialization    ?? "",
                            YearsOfExperience  = dto.YearsOfExperience ?? "",
                            Education          = dto.Education         ?? "",
                            Certifications     = dto.Certifications    ?? "",
                            LicenseNumber      = dto.LicenseNumber     ?? "",
                            ExternalProfileUrl = NormaliseUrl(dto.ExternalProfileUrl),
                            PaymentMethod      = "Mpesa",
                            PaymentAccount     = ""
                        };
                        _context.ProfessionalProfiles.Add(prof);
                    }
                    else
                    {
                        if (dto.Bio               != null) prof.Bio               = dto.Bio;
                        if (dto.Specialization    != null) prof.Specialization    = dto.Specialization;
                        if (dto.YearsOfExperience != null) prof.YearsOfExperience = dto.YearsOfExperience;
                        if (dto.Education         != null) prof.Education         = dto.Education;
                        if (dto.Certifications    != null) prof.Certifications    = dto.Certifications;
                        if (dto.LicenseNumber     != null) prof.LicenseNumber     = dto.LicenseNumber;
                        if (dto.ExternalProfileUrl != null)
                            prof.ExternalProfileUrl = NormaliseUrl(dto.ExternalProfileUrl);
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message        = "Profile updated successfully.",
                    firstName      = user.FirstName,
                    lastName       = user.LastName,
                    fullName       = $"{user.FirstName} {user.LastName}".Trim(),
                    phoneNumber    = user.PhoneNumber,
                    profilePicture = user.ProfilePicture ?? ""
                });
            }
            catch (DbUpdateException dbEx)
            {
                Console.WriteLine($"DB error: {dbEx.InnerException?.Message ?? dbEx.Message}");
                return StatusCode(500, new { message = $"Database error: {dbEx.InnerException?.Message ?? dbEx.Message}" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"UpdateProfile error: {ex.Message}");
                return StatusCode(500, new { message = $"Failed to update profile: {ex.Message}" });
            }
        }

        // GET: api/auth/profile-picture/{userId}
        [HttpGet("profile-picture/{userId}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProfilePicture(int userId)
        {
            try
            {
                var user = await _context.Users.FindAsync(userId);
                if (user == null || string.IsNullOrEmpty(user.ProfilePicture))
                    return NotFound(new { message = "Profile picture not found" });

                var wwwroot  = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var filePath = Path.Combine(wwwroot, user.ProfilePicture.TrimStart('/'));

                if (!System.IO.File.Exists(filePath))
                    return NotFound(new { message = "Profile picture file not found" });

                var bytes       = await System.IO.File.ReadAllBytesAsync(filePath);
                var contentType = GetContentType(Path.GetExtension(filePath));
                return File(bytes, contentType);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetProfilePicture error: {ex.Message}");
                return NotFound(new { message = "Profile picture not found" });
            }
        }

        private static string GetContentType(string ext) => ext.ToLower() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png"            => "image/png",
            ".gif"            => "image/gif",
            _                 => "application/octet-stream"
        };

        // POST: api/auth/upload-profile-picture
        [HttpPost("upload-profile-picture")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadProfilePicture([FromForm] IFormFile file)
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized(new { message = "User not authenticated" });
                int userId = int.Parse(userIdClaim);

                if (file == null || file.Length == 0)
                    return BadRequest(new { message = "No file uploaded." });

                var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                var ext     = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowed.Contains(ext))
                    return BadRequest(new { message = "Only JPG, PNG, and GIF files are allowed." });

                if (file.Length > 5 * 1024 * 1024)
                    return BadRequest(new { message = "File size must be less than 5MB." });

                var user = await _context.Users.FindAsync(userId);
                if (user == null) return NotFound(new { message = "User not found." });

                var wwwroot       = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var uploadsFolder = Path.Combine(wwwroot, "uploads", "profiles");

                if (!Directory.Exists(uploadsFolder))
                    Directory.CreateDirectory(uploadsFolder);

                if (!string.IsNullOrEmpty(user.ProfilePicture))
                {
                    var oldPath = Path.Combine(wwwroot, user.ProfilePicture.TrimStart('/'));
                    if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
                }

                var fileName = $"{userId}_{DateTime.Now.Ticks}{ext}";
                var filePath = Path.Combine(uploadsFolder, fileName);

                using (var stream = new FileStream(filePath, FileMode.Create))
                    await file.CopyToAsync(stream);

                user.ProfilePicture = $"/uploads/profiles/{fileName}";
                await _context.SaveChangesAsync();

                return Ok(new { success = true, profilePictureUrl = user.ProfilePicture, message = "Profile picture uploaded successfully!" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Upload error: {ex.Message}");
                return StatusCode(500, new { message = $"Upload failed: {ex.Message}" });
            }
        }

        // DELETE: api/auth/remove-profile-picture
        [HttpDelete("remove-profile-picture")]
        [Authorize]
        public async Task<IActionResult> RemoveProfilePicture()
        {
            try
            {
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null) return Unauthorized(new { message = "User not authenticated" });
                int userId = int.Parse(userIdClaim);

                var user = await _context.Users.FindAsync(userId);
                if (user == null) return NotFound(new { message = "User not found." });

                if (!string.IsNullOrEmpty(user.ProfilePicture))
                {
                    var wwwroot  = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    var filePath = Path.Combine(wwwroot, user.ProfilePicture.TrimStart('/'));
                    if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);

                    user.ProfilePicture = null;
                    await _context.SaveChangesAsync();
                }

                return Ok(new { success = true, message = "Profile picture removed successfully." });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Remove error: {ex.Message}");
                return StatusCode(500, new { message = $"Failed to remove profile picture: {ex.Message}" });
            }
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

            if (user == null) return NotFound(new { message = "User not found." });

            bool isGoogle = string.IsNullOrEmpty(user.PasswordHash) || user.PasswordHash.StartsWith("google_");
            if (!isGoogle)
            {
                if (string.IsNullOrEmpty(dto.Password) || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                    return BadRequest(new { message = "Incorrect password. Account deletion cancelled." });
            }

            if (!string.IsNullOrEmpty(user.ProfilePicture))
            {
                var wwwroot  = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var filePath = Path.Combine(wwwroot, user.ProfilePicture.TrimStart('/'));
                if (System.IO.File.Exists(filePath)) System.IO.File.Delete(filePath);
            }

            if (user.Role == "Admin")
            {
                var count = await _context.Users.CountAsync(u => u.Role == "Admin");
                if (count <= 1) return BadRequest(new { message = "Cannot delete the only admin account." });
            }

            if (user.Role == "Professional" && user.ProfessionalProfile != null)
            {
                var sessions  = await _context.Sessions.Where(s => s.ProfessionalId == userId || s.ClientId == userId).ToListAsync();
                var ratings   = await _context.Ratings.Where(r => r.ProfessionalId == userId || r.ClientId == userId).ToListAsync();
                var resources = await _context.Resources.Where(r => r.UploadedBy == userId).ToListAsync();
                _context.Sessions.RemoveRange(sessions);
                _context.Ratings.RemoveRange(ratings);
                _context.Resources.RemoveRange(resources);
                _context.ProfessionalProfiles.Remove(user.ProfessionalProfile);
            }
            else if (user.Role == "Client" && user.ClientProfile != null)
            {
                var sessions    = await _context.Sessions.Where(s => s.ClientId == userId).ToListAsync();
                var assessments = await _context.SelfAssessments.Where(a => a.UserId == userId).ToListAsync();
                var journals    = await _context.JournalEntries.Where(j => j.UserId == userId).ToListAsync();
                var ratings     = await _context.Ratings.Where(r => r.ClientId == userId).ToListAsync();
                _context.Sessions.RemoveRange(sessions);
                _context.SelfAssessments.RemoveRange(assessments);
                _context.JournalEntries.RemoveRange(journals);
                _context.Ratings.RemoveRange(ratings);
                _context.ClientProfiles.Remove(user.ClientProfile);
            }
            else if (user.Role == "Admin")
            {
                var sessions    = await _context.Sessions.Where(s => s.ClientId == userId || s.ProfessionalId == userId).ToListAsync();
                var adminRecord = await _context.Admins.FirstOrDefaultAsync(a => a.UserId == userId);
                _context.Sessions.RemoveRange(sessions);
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
                    return Unauthorized(new { message = "User not authenticated" });

                int userId = int.Parse(userIdClaim);
                var user   = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

                if (user == null) return NotFound(new { message = "User not found" });

                ProfessionalProfile? prof = null;
                if (user.Role == "Professional")
                {
                    prof = await _context.ProfessionalProfiles.FirstOrDefaultAsync(p => p.UserId == userId);

                    if (prof == null)
                    {
                        prof = new ProfessionalProfile
                        {
                            UserId             = user.Id,
                            Bio                = "",
                            Specialization     = "",
                            YearsOfExperience  = "",
                            Education          = "",
                            Certifications     = "",
                            LicenseNumber      = "",
                            PaymentMethod      = "Mpesa",
                            PaymentAccount     = "",
                            ExternalProfileUrl = null
                        };
                        _context.ProfessionalProfiles.Add(prof);
                        await _context.SaveChangesAsync();
                    }
                }

                return Ok(new
                {
                    id             = user.Id,
                    firstName      = user.FirstName      ?? "",
                    lastName       = user.LastName       ?? "",
                    fullName       = $"{user.FirstName} {user.LastName}".Trim(),
                    email          = user.Email          ?? "",
                    role           = user.Role           ?? "",
                    phoneNumber    = user.PhoneNumber    ?? "",
                    dateRegistered = user.DateRegistered,
                    profilePicture = user.ProfilePicture ?? "",
                    professionalProfile = prof != null ? new
                    {
                        bio                = prof.Bio               ?? "",
                        specialization     = prof.Specialization    ?? "",
                        yearsOfExperience  = prof.YearsOfExperience ?? "",
                        education          = prof.Education         ?? "",
                        certifications     = prof.Certifications    ?? "",
                        licenseNumber      = prof.LicenseNumber     ?? "",
                        externalProfileUrl = prof.ExternalProfileUrl
                    } : null
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"GetProfile error: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
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
                return BadRequest(new { message = "You don't have a password set. Please use 'Set Password' instead." });

            if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
                return BadRequest(new { message = "Current password is incorrect." });

            var errs = ValidatePassword(dto.NewPassword);
            if (errs.Any()) return BadRequest(new { message = string.Join(" ", errs) });

            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(new { message = "New passwords do not match." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully." });
        }

        private string GenerateToken(User user)
        {
            var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            string fullName = $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrEmpty(fullName)) fullName = user.FirstName ?? user.LastName ?? "User";

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email,          user.Email),
                new Claim(ClaimTypes.Name,           fullName),
                new Claim("FirstName",               user.FirstName ?? ""),
                new Claim("LastName",                user.LastName  ?? ""),
                new Claim(ClaimTypes.Role,           user.Role)
            };

            var token = new JwtSecurityToken(
                issuer:             _config["Jwt:Issuer"],
                audience:           _config["Jwt:Audience"],
                claims:             claims,
                expires:            DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private static List<string> ValidatePassword(string password)
        {
            var errors = new List<string>();
            if (string.IsNullOrEmpty(password)) { errors.Add("Password is required."); return errors; }
            if (password.Length < 8)                            errors.Add("Password must be at least 8 characters long.");
            if (!password.Any(char.IsUpper))                    errors.Add("Password must contain at least 1 uppercase letter.");
            if (!password.Any(char.IsLower))                    errors.Add("Password must contain at least 1 lowercase letter.");
            if (!password.Any(ch => !char.IsLetterOrDigit(ch))) errors.Add("Password must contain at least 1 special character.");
            return errors;
        }
    }
}