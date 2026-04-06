using System;

namespace kaizenbackend.Models
{
    public class Rating
    {
        public int Id { get; set; }
        public int SessionId { get; set; }
        public int ClientId { get; set; }
        public int ProfessionalId { get; set; }
        public int RatingValue { get; set; }  // 1 to 5
        public string? Review { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Session Session { get; set; } = null!;
        public User Client { get; set; } = null!;
        public User Professional { get; set; } = null!;
    }
}