using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
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
            if (string.IsNullOrWhiteSpace(url)) return true;
            url = url.Trim();
            if (!url.StartsWith("http://",  StringComparison.OrdinalIgnoreCase) &&
                !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                url = "https://" + url;
            return Uri.TryCreate(url, UriKind.Absolute, out var uriResult)
                   && (uriResult.Scheme == Uri.UriSchemeHttp || uriResult.Scheme == Uri.UriSchemeHttps);
        }

        private const string PhoneNumberFormatMessage = "Phone number is required and must use the format 0712345678 or 0112345678.";
        private const string EmergencyPhoneNumberFormatMessage = "Emergency contact phone must use the format 0712345678 or 0112345678.";
        private const string WorkEmailFormatMessage = "Professionals and admins must use a Kenyatta University student email in the format 0957.2022@students.ku.ac.ke or 11909.2022@students.ku.ac.ke.";

        private static string NormalizePhoneNumber(string? phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber)) return string.Empty;

            var digits = new string(phoneNumber.Where(char.IsDigit).ToArray());
            if (digits.Length == 12 && digits.StartsWith("254"))
                return "0" + digits.Substring(3);

            return digits;
        }

        private static bool IsValidPhoneNumber(string? phoneNumber)
        {
            var normalized = NormalizePhoneNumber(phoneNumber);
            return System.Text.RegularExpressions.Regex.IsMatch(normalized, @"^(07|01)\d{8}$");
        }

        private static string NormalizeEmail(string? email)
        {
            return (email ?? string.Empty).Trim().ToLowerInvariant();
        }

        private static bool RequiresWorkEmail(string? role)
        {
            return string.Equals(role, "Professional", StringComparison.OrdinalIgnoreCase)
                || string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);
        }

        private static bool IsValidWorkEmail(string? email)
        {
            return Regex.IsMatch(NormalizeEmail(email), @"^\d{4,5}\.\d{4}@students\.ku\.ac\.ke$");
        }

        // POST: api/auth/send-verification
        [HttpPost("send-verification")]
        public async Task<IActionResult> SendVerification([FromBody] SendVerificationDto dto)
        {
            var email = NormalizeEmail(dto.Email);
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (existingUser != null)
                return BadRequest(new { message = "An account with this email already exists. Please login instead." });

            var code = new Random().Next(100000, 999999).ToString();

            var verification = new EmailVerification
            {
                Email                = email,
                Code                 = code,
                CreatedAt            = DateTime.UtcNow,
                ExpiresAt            = DateTime.UtcNow.AddMinutes(10),
                IsVerified           = false,
                TempRegistrationData = null
            };

            _context.EmailVerifications.Add(verification);

            var old = _context.EmailVerifications
                .Where(v => v.Email == email && !v.IsVerified && v.ExpiresAt < DateTime.UtcNow);
            _context.EmailVerifications.RemoveRange(old);

            await _context.SaveChangesAsync();

            var sent = await _emailService.SendVerificationCodeAsync(email, code);
            if (!sent)
                return StatusCode(500, new { message = "Failed to send verification email. Please try again." });

            return Ok(new { message = "Verification code sent to your email.", expiresIn = 10 });
        }

        // POST: api/auth/verify-code
        [HttpPost("verify-code")]
        public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeDto dto)
        {
            var email = NormalizeEmail(dto.Email);
            var verification = await _context.EmailVerifications
                .FirstOrDefaultAsync(v => v.Email == email && v.Code == dto.Code && !v.IsVerified);

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
            var email = NormalizeEmail(dto.Email);
            Console.WriteLine($"CompleteRegistration: {email}, Role: {dto.Role}");

            if (RequiresWorkEmail(dto.Role) && !IsValidWorkEmail(email))
                return BadRequest(new { message = WorkEmailFormatMessage });

            var passwordErrors = ValidatePassword(dto.Password);
            if (passwordErrors.Any())
                return BadRequest(new { message = string.Join(" ", passwordErrors) });

            if (dto.Password != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            if (!IsValidPhoneNumber(dto.PhoneNumber))
                return BadRequest(new { message = PhoneNumberFormatMessage });

            var phoneNumber = NormalizePhoneNumber(dto.PhoneNumber);

            if (!dto.IsGoogleUser)
            {
                var verification = await _context.EmailVerifications
                    .FirstOrDefaultAsync(v => v.Email == email && v.IsVerified);

                if (verification == null)
                    return BadRequest(new { message = "Please verify your email address first." });

                _context.EmailVerifications.Remove(verification);
            }

            var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (existing != null)
                return BadRequest(new { message = "An account with this email already exists." });

            if (dto.Role == "Professional")
            {
                var profErrors = new List<string>();
                if (string.IsNullOrWhiteSpace(dto.FirstName))        profErrors.Add("First name is required.");
                if (string.IsNullOrWhiteSpace(dto.LastName))         profErrors.Add("Last name is required.");
                if (string.IsNullOrWhiteSpace(dto.LicenseNumber))    profErrors.Add("License/Certification number is required.");
                if (string.IsNullOrWhiteSpace(dto.Specialization))   profErrors.Add("Specialization is required.");
                if (string.IsNullOrWhiteSpace(dto.YearsOfExperience)) profErrors.Add("Years of experience is required.");
                if (string.IsNullOrWhiteSpace(dto.Bio))              profErrors.Add("Bio is required.");
                if (string.IsNullOrWhiteSpace(dto.Education))        profErrors.Add("Education & Qualifications is required.");
                if (!string.IsNullOrWhiteSpace(dto.ExternalProfileUrl) && !IsValidUrl(dto.ExternalProfileUrl))
                    profErrors.Add("External Profile URL must be a valid URL.");

                if (profErrors.Any())
                    return BadRequest(new { message = string.Join(" ", profErrors) });
            }

            if (dto.Role == "Client")
            {
                var clientErrors = new List<string>();
                if (string.IsNullOrWhiteSpace(dto.EmergencyContact))
                    clientErrors.Add("Emergency contact name is required.");
                if (!IsValidPhoneNumber(dto.EmergencyContactPhone))
                    clientErrors.Add(EmergencyPhoneNumberFormatMessage);
                if (string.IsNullOrWhiteSpace(dto.EmergencyContactEmail))
                    clientErrors.Add("Emergency contact email is required.");
                else if (!Regex.IsMatch(NormalizeEmail(dto.EmergencyContactEmail), @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                    clientErrors.Add("Emergency contact email must be a valid email address.");

                if (clientErrors.Any())
                    return BadRequest(new { message = string.Join(" ", clientErrors) });
            }

            var user = new User
            {
                FirstName      = dto.FirstName,
                LastName       = dto.LastName,
                Email          = email,
                PasswordHash   = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role           = dto.Role,
                DateRegistered = DateTime.UtcNow,
                PhoneNumber    = phoneNumber,
                ProfilePicture = null,
                IsActive       = true
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            if (dto.Role == "Client")
            {
                _context.ClientProfiles.Add(new ClientProfile
                {
                    UserId = user.Id,
                    EmergencyContact = dto.EmergencyContact?.Trim() ?? "",
                    EmergencyContactPhone = NormalizePhoneNumber(dto.EmergencyContactPhone),
                    EmergencyContactEmail = NormalizeEmail(dto.EmergencyContactEmail)
                });
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

            if (dto.Role == "Professional")
                await NotifyAdminsOfProfessionalRegistrationAsync(user, dto);

            var token   = GenerateToken(user);
            string fullName = $"{user.FirstName} {user.LastName}".Trim();

            return Ok(new { token, role = user.Role, firstName = user.FirstName, lastName = user.LastName, fullName, message = "Account created successfully!" });
        }

        private async Task NotifyAdminsOfProfessionalRegistrationAsync(User professional, CompleteRegistrationDto dto)
        {
            try
            {
                var adminEmails = await _context.Users
                    .Where(u => u.Role == "Admin" && u.IsActive && !string.IsNullOrEmpty(u.Email))
                    .Select(u => u.Email)
                    .ToListAsync();

                if (!adminEmails.Any()) return;

                string fullName = $"{professional.FirstName} {professional.LastName}".Trim();
                string subject = $"New professional registration: {fullName}";
                string body = $@"
                    <h2>New Kaizen Professional Registration</h2>
                    <p>A new professional has registered and may need admin review.</p>
                    <table cellpadding=""6"" cellspacing=""0"" style=""border-collapse:collapse;"">
                        <tr><td><strong>Name</strong></td><td>{WebUtility.HtmlEncode(fullName)}</td></tr>
                        <tr><td><strong>Email</strong></td><td>{WebUtility.HtmlEncode(professional.Email)}</td></tr>
                        <tr><td><strong>Phone</strong></td><td>{WebUtility.HtmlEncode(professional.PhoneNumber ?? "")}</td></tr>
                        <tr><td><strong>Specialization</strong></td><td>{WebUtility.HtmlEncode(dto.Specialization ?? "")}</td></tr>
                        <tr><td><strong>License/Certification</strong></td><td>{WebUtility.HtmlEncode(dto.LicenseNumber ?? "")}</td></tr>
                        <tr><td><strong>Years of Experience</strong></td><td>{WebUtility.HtmlEncode(dto.YearsOfExperience ?? "")}</td></tr>
                        <tr><td><strong>Education</strong></td><td>{WebUtility.HtmlEncode(dto.Education ?? "")}</td></tr>
                        <tr><td><strong>Certifications</strong></td><td>{WebUtility.HtmlEncode(dto.Certifications ?? "")}</td></tr>
                        <tr><td><strong>External Profile</strong></td><td>{WebUtility.HtmlEncode(NormaliseUrl(dto.ExternalProfileUrl) ?? "Not provided")}</td></tr>
                        <tr><td><strong>Registered At</strong></td><td>{DateTime.UtcNow:dd MMM yyyy, HH:mm} UTC</td></tr>
                    </table>
                    <p>Please review the account from the admin users page and deactivate it if unauthorized.</p>";

                foreach (var adminEmail in adminEmails)
                    await _emailService.SendEmailAsync(adminEmail, subject, body, true);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Professional registration admin email failed: {ex.Message}");
            }
        }

        // POST: api/auth/forgot-password
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
        {
            var email = NormalizeEmail(dto.Email);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email && u.IsActive);

            if (user != null)
            {
                var resetToken = GeneratePasswordResetToken(user);
                var frontendBaseUrl = (_config["Frontend:BaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
                var resetLink = $"{frontendBaseUrl}/reset-password?token={Uri.EscapeDataString(resetToken)}";
                string fullName = $"{user.FirstName} {user.LastName}".Trim();
                if (string.IsNullOrWhiteSpace(fullName)) fullName = "there";

                string body = $@"
                    <h2>Reset Your Kaizen Password</h2>
                    <p>Hello {WebUtility.HtmlEncode(fullName)},</p>
                    <p>Click the link below to reset your password. This link expires in 30 minutes.</p>
                    <p><a href=""{WebUtility.HtmlEncode(resetLink)}"">Reset password</a></p>
                    <p>If you did not request this, you can safely ignore this email.</p>";

                await _emailService.SendEmailAsync(user.Email, "Reset your Kaizen password", body, true);
            }

            return Ok(new { message = "If an active account exists for that email, a password reset link has been sent." });
        }

        // POST: api/auth/reset-password
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
        {
            if (dto.NewPassword != dto.ConfirmPassword)
                return BadRequest(new { message = "Passwords do not match." });

            var passwordErrors = ValidatePassword(dto.NewPassword);
            if (passwordErrors.Any())
                return BadRequest(new { message = string.Join(" ", passwordErrors) });

            ClaimsPrincipal principal;
            try
            {
                principal = ValidatePasswordResetToken(dto.Token);
            }
            catch
            {
                return BadRequest(new { message = "Invalid or expired reset link." });
            }

            if (principal.FindFirst("purpose")?.Value != "password_reset")
                return BadRequest(new { message = "Invalid or expired reset link." });

            var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId))
                return BadRequest(new { message = "Invalid or expired reset link." });

            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
                return BadRequest(new { message = "Invalid or expired reset link." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password reset successfully.", role = user.Role });
        }

        // POST: api/auth/check-email
        [HttpPost("check-email")]
        public async Task<IActionResult> CheckEmail([FromBody] CheckEmailDto dto)
        {
            var email = NormalizeEmail(dto.Email);
            var exists = await _context.Users.AnyAsync(u => u.Email == email);
            return Ok(new { exists });
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var email = NormalizeEmail(dto.Email);
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized("Invalid email or password.");

            if (!user.IsActive)
                return Unauthorized("Your account has been deactivated. Please contact support.");

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

            if (!user.IsActive)
                return Unauthorized(new { message = "Your account has been deactivated. Please contact support." });

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
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound(new { message = "User not found." });

            try
            {
                if (!string.IsNullOrWhiteSpace(dto.FirstName))   user.FirstName   = dto.FirstName;
                if (!string.IsNullOrWhiteSpace(dto.LastName))    user.LastName    = dto.LastName;
                if (dto.PhoneNumber != null)
                {
                    if (!IsValidPhoneNumber(dto.PhoneNumber))
                        return BadRequest(new { message = PhoneNumberFormatMessage });

                    user.PhoneNumber = NormalizePhoneNumber(dto.PhoneNumber);
                }

                if (user.Role == "Professional")
                {
                    if (!dto.ClearAvailabilityWindow
                        && dto.AvailableFromUtc.HasValue
                        && dto.AvailableUntilUtc.HasValue
                        && dto.AvailableUntilUtc.Value.ToUniversalTime() <= dto.AvailableFromUtc.Value.ToUniversalTime())
                    {
                        return BadRequest(new { message = "Availability end time must be after the start time." });
                    }

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
                            PaymentAccount     = "",
                            IsAcceptingSessions = dto.IsAcceptingSessions ?? true,
                            AvailableFromUtc = dto.AvailableFromUtc?.ToUniversalTime(),
                            AvailableUntilUtc = dto.AvailableUntilUtc?.ToUniversalTime()
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
                        if (dto.IsAcceptingSessions.HasValue) prof.IsAcceptingSessions = dto.IsAcceptingSessions.Value;
                        if (dto.ClearAvailabilityWindow)
                        {
                            prof.AvailableFromUtc = null;
                            prof.AvailableUntilUtc = null;
                        }
                        else
                        {
                            if (dto.AvailableFromUtc.HasValue) prof.AvailableFromUtc = dto.AvailableFromUtc.Value.ToUniversalTime();
                            if (dto.AvailableUntilUtc.HasValue) prof.AvailableUntilUtc = dto.AvailableUntilUtc.Value.ToUniversalTime();
                        }
                    }
                }
                else if (user.Role == "Client")
                {
                    if (dto.EmergencyContactName != null || dto.EmergencyContactPhone != null || dto.EmergencyContactEmail != null)
                    {
                        var clientProfile = await _context.ClientProfiles
                            .FirstOrDefaultAsync(c => c.UserId == userId);

                        if (clientProfile == null)
                        {
                            clientProfile = new ClientProfile { UserId = userId };
                            _context.ClientProfiles.Add(clientProfile);
                        }

                        if (dto.EmergencyContactName != null)
                        {
                            if (string.IsNullOrWhiteSpace(dto.EmergencyContactName))
                                return BadRequest(new { message = "Emergency contact name is required." });

                            clientProfile.EmergencyContact = dto.EmergencyContactName.Trim();
                        }

                        if (dto.EmergencyContactPhone != null)
                        {
                            if (!IsValidPhoneNumber(dto.EmergencyContactPhone))
                                return BadRequest(new { message = EmergencyPhoneNumberFormatMessage });

                            clientProfile.EmergencyContactPhone = NormalizePhoneNumber(dto.EmergencyContactPhone);
                        }

                        if (dto.EmergencyContactEmail != null)
                        {
                            var email = NormalizeEmail(dto.EmergencyContactEmail);
                            if (string.IsNullOrWhiteSpace(email))
                                return BadRequest(new { message = "Emergency contact email is required." });
                            if (!Regex.IsMatch(email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                                return BadRequest(new { message = "Emergency contact email must be a valid email address." });

                            clientProfile.EmergencyContactEmail = email;
                        }
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
                    profilePicture = user.ProfilePicture ?? "",
                    emergencyContactName = user.Role == "Client"
                        ? (await _context.ClientProfiles
                            .Where(c => c.UserId == userId)
                            .Select(c => c.EmergencyContact)
                            .FirstOrDefaultAsync()) ?? ""
                        : "",
                    emergencyContactPhone = user.Role == "Client"
                        ? (await _context.ClientProfiles
                            .Where(c => c.UserId == userId)
                            .Select(c => c.EmergencyContactPhone)
                            .FirstOrDefaultAsync()) ?? ""
                        : "",
                    emergencyContactEmail = user.Role == "Client"
                        ? (await _context.ClientProfiles
                            .Where(c => c.UserId == userId)
                            .Select(c => c.EmergencyContactEmail)
                            .FirstOrDefaultAsync()) ?? ""
                        : ""
                });
            }
            catch (DbUpdateException dbEx)
            {
                return StatusCode(500, new { message = $"Database error: {dbEx.InnerException?.Message ?? dbEx.Message}" });
            }
            catch (Exception ex)
            {
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

        // ════════════════════════════════════════════════════════════════════
        // DELETE: api/auth/account
        //
        // SOFT-DELETE STRATEGY — preserves all financial & session history
        // for admin reporting while preventing the user from logging in.
        //
        // What happens:
        //   1. Password is verified (non-Google users).
        //   2. IsActive is set to false  →  login is blocked immediately.
        //   3. Personal identifiers are anonymised:
        //        - Email        → deleted_{userId}@deleted.kaizen
        //        - FirstName    → [Deleted]
        //        - LastName     → User
        //        - PhoneNumber  → cleared
        //        - ProfilePicture file is deleted from disk; DB field cleared.
        //   4. The User row, Sessions, Ratings, Resources, Assessments,
        //      Journals and profile rows are ALL KEPT in the database so
        //      that admin revenue / session / payout reports remain accurate.
        //   5. Active (pending/confirmed) sessions are cancelled so
        //      professionals are not waiting for a ghost client.
        // ════════════════════════════════════════════════════════════════════
        [HttpDelete("account")]
        [Authorize]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountDto? dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized(new { message = "User not authenticated." });
            int userId = int.Parse(userIdClaim);

            var user = await _context.Users
                .Include(u => u.ClientProfile)
                .Include(u => u.ProfessionalProfile)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null) return NotFound(new { message = "User not found." });

            // ── 1. Password verification ──────────────────────────────────────
            bool isGoogle = string.IsNullOrEmpty(user.PasswordHash)
                         || user.PasswordHash.StartsWith("google_");

            if (!isGoogle)
            {
                var password = dto?.Password;
                if (string.IsNullOrWhiteSpace(password))
                    return BadRequest(new { message = "Please enter your password to delete your account." });

                if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
                    return BadRequest(new { message = "Incorrect password. Account deletion cancelled." });
            }

            // ── 2. Admin guard — must not delete the last admin ───────────────
            if (user.Role == "Admin")
            {
                var count = await _context.Users
                    .CountAsync(u => u.Role == "Admin" && u.IsActive);
                if (count <= 1)
                    return BadRequest(new { message = "Cannot delete the only active admin account." });
            }

            // ── 3. Delete profile picture from disk (personal data) ───────────
            if (!string.IsNullOrEmpty(user.ProfilePicture))
            {
                var wwwroot  = _environment.WebRootPath
                            ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                var filePath = Path.Combine(wwwroot, user.ProfilePicture.TrimStart('/'));
                if (System.IO.File.Exists(filePath))
                    System.IO.File.Delete(filePath);
            }

            // ── 4. Anonymise personal identifiers ────────────────────────────
            //    The user row stays; only PII is wiped.
            user.IsActive       = false;
            user.Email          = $"deleted_{userId}_{DateTime.UtcNow.Ticks}@deleted.kaizen";
            user.FirstName      = "[Deleted]";
            user.LastName       = "User";
            user.PhoneNumber    = "";
            user.ProfilePicture = null;
            user.PasswordHash   = "";   // prevents login even if IsActive check is bypassed

            // ── 5. Cancel any still-active sessions so counterparts are notified
            //    (Completed / Cancelled sessions are left untouched for reporting)
            var activeSessions = await _context.Sessions
                .Where(s => (s.ClientId == userId || s.ProfessionalId == userId)
                         && (s.Status == "Pending" || s.Status == "Confirmed"))
                .ToListAsync();

            foreach (var s in activeSessions)
            {
                s.Status    = "Cancelled";
                s.UpdatedAt = DateTime.UtcNow;
                s.Notes     = (s.Notes ?? "") + " [Account deleted by user]";
            }

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException dbEx)
            {
                return StatusCode(500, new { message = $"Could not delete account: {dbEx.InnerException?.Message ?? dbEx.Message}" });
            }

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
                var user   = await _context.Users
                    .Include(u => u.ClientProfile)
                    .FirstOrDefaultAsync(u => u.Id == userId);

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
                            ExternalProfileUrl = null,
                            IsAcceptingSessions = true
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
                    isGoogleUser = string.IsNullOrEmpty(user.PasswordHash)
                        || user.PasswordHash.StartsWith("google_"),
                    emergencyContactName = user.ClientProfile?.EmergencyContact ?? "",
                    emergencyContactPhone = user.ClientProfile?.EmergencyContactPhone ?? "",
                    emergencyContactEmail = user.ClientProfile?.EmergencyContactEmail ?? "",
                    professionalProfile = prof != null ? new
                    {
                        bio                = prof.Bio               ?? "",
                        specialization     = prof.Specialization    ?? "",
                        yearsOfExperience  = prof.YearsOfExperience ?? "",
                        education          = prof.Education         ?? "",
                        certifications     = prof.Certifications    ?? "",
                        licenseNumber      = prof.LicenseNumber     ?? "",
                        externalProfileUrl = prof.ExternalProfileUrl,
                        isAcceptingSessions = prof.IsAcceptingSessions,
                        availableFromUtc = prof.AvailableFromUtc,
                        availableUntilUtc = prof.AvailableUntilUtc
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

        private string GeneratePasswordResetToken(User user)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim("purpose", "password_reset")
            };

            var token = new JwtSecurityToken(
                issuer: _config["Jwt:Issuer"],
                audience: _config["Jwt:Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(30),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        private ClaimsPrincipal ValidatePasswordResetToken(string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_config["Jwt:Key"]!);

            return tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _config["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = _config["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2)
            }, out _);
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
