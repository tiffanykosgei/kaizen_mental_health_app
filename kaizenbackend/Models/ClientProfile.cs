namespace kaizenbackend.Models
{
    public class ClientProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string EmergencyContact { get; set; } = string.Empty;
        public string EmergencyContactPhone { get; set; } = string.Empty;
        public string EmergencyContactEmail { get; set; } = string.Empty;

        public User User { get; set; } = null!;
    }
}
