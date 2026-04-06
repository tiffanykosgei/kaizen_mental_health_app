using System;

namespace kaizenbackend.Models
{
    public class ResourceRating
    {
        public int Id { get; set; }
        public int ResourceId { get; set; }
        public int UserId { get; set; }
        public int Rating { get; set; } // 1 to 5
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Resource Resource { get; set; } = null!;
        public User User { get; set; } = null!;
    }
}