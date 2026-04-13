using System.ComponentModel.DataAnnotations;

namespace kaizenbackend.DTOs
{
    public class RegisterDto
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;
        
        [Required]
        public string LastName { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters long.")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$", 
            ErrorMessage = "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 special character.")]
        public string Password { get; set; } = string.Empty;
        
        [Required]
        [Compare("Password", ErrorMessage = "Passwords do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;
        
        [Required]
        public string Role { get; set; } = "Client";
        
        public string? PhoneNumber { get; set; }
        
        // Professional-specific fields
        public string? Bio { get; set; }
        public string? Specialization { get; set; }
    }
}