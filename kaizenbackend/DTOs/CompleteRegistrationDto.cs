using System.ComponentModel.DataAnnotations;

namespace kaizenbackend.DTOs
{
    public class CompleteRegistrationDto
    {
        [Required(ErrorMessage = "First name is required.")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Last name is required.")]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email is required.")]
        [EmailAddress(ErrorMessage = "Invalid email address.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Please confirm your password.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Role is required.")]
        public string Role { get; set; } = string.Empty;

        public bool IsGoogleUser { get; set; }

        // All roles
        public string? PhoneNumber { get; set; }
        
        // Client-specific
        public string? EmergencyContact { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? EmergencyContactEmail { get; set; }

        // Professional-specific
        public string? Bio                { get; set; }
        public string? Specialization     { get; set; }
        public string? YearsOfExperience  { get; set; }
        public string? Education          { get; set; }
        public string? Certifications     { get; set; }
        public string? LicenseNumber      { get; set; }
        public string? ExternalProfileUrl { get; set; }
    }
}
