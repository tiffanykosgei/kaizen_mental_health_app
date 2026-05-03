namespace kaizenbackend.DTOs
{
    public class UpdateProfessionalProfileDto
    {
        public string? FirstName          { get; set; }
        public string? LastName           { get; set; }
        public string? PhoneNumber        { get; set; }
        public string? Bio                { get; set; }
        public string? Specialization     { get; set; }
        public string? YearsOfExperience  { get; set; }
        public string? Education          { get; set; }
        public string? Certifications     { get; set; }
        public string? LicenseNumber      { get; set; }
        public string? Password           { get; set; }
        public string? Experience         { get; set; }

        // No [Url] attribute here — validation done in controller
        // so partial URLs like "linkedin.com/..." get fixed automatically
        public string? ExternalProfileUrl { get; set; }
    }
}