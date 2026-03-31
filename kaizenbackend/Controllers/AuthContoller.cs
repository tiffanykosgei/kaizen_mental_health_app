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

namespace kaizenbackend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthController(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(RegisterDto dto)
        {
            if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
                return BadRequest("A user with this email already exists.");

            var allowedRoles = new[] { "Client", "Professional", "Admin" };
            if (!allowedRoles.Contains(dto.Role))
                return BadRequest("Invalid role. Must be Client, Professional or Admin.");

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                DateRegistered = DateTime.UtcNow,
                PhoneNumber = dto.PhoneNumber
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
                _context.ProfessionalProfiles.Add(new ProfessionalProfile
                {
                    UserId = user.Id,
                    Bio = dto.Bio,
                    Specialization = dto.Specialization
                });
                await _context.SaveChangesAsync();
            }
            else if (dto.Role == "Admin")
            {
                _context.Admins.Add(new Admin { UserId = user.Id });
                await _context.SaveChangesAsync();
            }

            return Ok(new { message = "Registration successful.", role = user.Role });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginDto dto)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == dto.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Unauthorized("Invalid email or password.");

            var token = GenerateToken(user);
            return Ok(new { token, role = user.Role, fullName = user.FullName });
        }

        [HttpPut("update-profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile(UpdateProfileDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null) return Unauthorized();
            int userId = int.Parse(userIdClaim);

            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("User not found.");

            // Update fields only if provided
            if (!string.IsNullOrWhiteSpace(dto.FullName))
                user.FullName = dto.FullName;
            
            if (!string.IsNullOrWhiteSpace(dto.PhoneNumber))
                user.PhoneNumber = dto.PhoneNumber;

            // Optional: Update password if provided
            if (!string.IsNullOrWhiteSpace(dto.Password))
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

            await _context.SaveChangesAsync();

            return Ok(new 
            { 
                message = "Profile updated successfully.",
                fullName = user.FullName,
                phoneNumber = user.PhoneNumber
            });
        }

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

            return Ok(new
            {
                user.Id,
                user.FullName,
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
                    user.ProfessionalProfile.Specialization
                } : null
            });
        }

        private string GenerateToken(User user)
        {
            var key = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
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
    }
}