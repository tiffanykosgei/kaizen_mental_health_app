using System.Collections.Generic;

namespace kaizenbackend.DTOs
{
    public class UpdateProfileDto
    {
        // Basic User Information
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Password { get; set; }
        
        // Professional Profile Information
        public string? Bio { get; set; }
        public string? Specialization { get; set; }
        public string? YearsOfExperience { get; set; }
        public string? Education { get; set; }
        public string? Certifications { get; set; }
        public string? LicenseNumber { get; set; }
        
        // Professional Links
        public ProfessionalLinksDto? ProfessionalLinks { get; set; }
        
        // REMOVED: public List<string>? Languages { get; set; }
    }
    
    public class ProfessionalLinksDto
    {
        public string? Linkedin { get; set; }
        public string? Website { get; set; }
        public string? Portfolio { get; set; }
    }
}