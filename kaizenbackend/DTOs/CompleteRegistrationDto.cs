using System.Collections.Generic;

namespace kaizenbackend.DTOs
{
    public class CompleteRegistrationDto
    {
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public bool IsGoogleUser { get; set; }
        
        // Professional fields
        public string? Bio { get; set; }
        public string? Specialization { get; set; }
        public string? YearsOfExperience { get; set; }
        public string? Education { get; set; }
        public string? Certifications { get; set; }
        public string? LicenseNumber { get; set; }
        public ProfessionalLinksDto? ProfessionalLinks { get; set; }
        // REMOVED: public List<string>? Languages { get; set; }
    }
}