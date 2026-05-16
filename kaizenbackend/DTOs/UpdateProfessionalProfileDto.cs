using System;

namespace kaizenbackend.DTOs
{
    public class UpdateProfessionalProfileDto
    {
        // Basic user info (shared by all roles)
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }

        // Professional fields (used only when role = Professional)
        public string? Bio { get; set; }
        public string? Specialization { get; set; }
        public string? YearsOfExperience { get; set; }
        public string? Education { get; set; }
        public string? Certifications { get; set; }
        public string? LicenseNumber { get; set; }
        public string? ExternalProfileUrl { get; set; }
        public bool? IsAcceptingSessions { get; set; }
        public bool ClearAvailabilityWindow { get; set; }
        public DateTime? AvailableFromUtc { get; set; }
        public DateTime? AvailableUntilUtc { get; set; }

        // Client emergency contact fields (used only when role = Client)
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? EmergencyContactEmail { get; set; }
        public string? Experience { get; set; }
    }
}
