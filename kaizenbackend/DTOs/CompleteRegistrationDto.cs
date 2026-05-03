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

        // Optional for all roles
        public string? PhoneNumber { get; set; }

        // ── Professional-only fields ─────────────────────────────────────────
        // These are validated manually in the controller so that Client/Admin
        // registrations are never rejected for missing professional data.
        public string? Bio                { get; set; }
        public string? Specialization     { get; set; }
        public string? YearsOfExperience  { get; set; }
        public string? Education          { get; set; }
        public string? Certifications     { get; set; }   // optional
        public string? LicenseNumber      { get; set; }
        public string? ExternalProfileUrl { get; set; }
    }
}