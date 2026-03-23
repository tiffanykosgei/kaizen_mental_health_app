namespace kaizenbackend.Models
{
    public class ProfessionalProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Bio { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;

        public User User { get; set; } = null!;
    }
}