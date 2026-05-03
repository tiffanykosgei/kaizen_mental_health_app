namespace kaizenbackend.Models
{
    public class User
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; } = string.Empty;
        public string Role { get; set; } = "Client";
        public DateTime DateRegistered { get; set; } = DateTime.UtcNow;

        // Computed property for full name (read-only)
        public string FullName => $"{FirstName} {LastName}".Trim();

        public ClientProfile? ClientProfile { get; set; }
        public ProfessionalProfile? ProfessionalProfile { get; set; }
        public string? ProfilePicture { get; set; }
    }
}