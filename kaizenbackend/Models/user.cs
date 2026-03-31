namespace kaizenbackend.Models
{
    public class User
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; } = string.Empty;
        public string Role { get; set; } = "Client";
        public DateTime DateRegistered { get; set; } = DateTime.UtcNow;

        public ClientProfile? ClientProfile { get; set; }
        public ProfessionalProfile? ProfessionalProfile { get; set; }
    }
}