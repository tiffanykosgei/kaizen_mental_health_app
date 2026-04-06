using System;

namespace kaizenbackend.Models
{
    public class PlatformSetting
    {
        public int Id { get; set; }
        public int DefaultPlatformPercentage { get; set; } = 40;   // Platform gets 40%
        public int DefaultProfessionalPercentage { get; set; } = 60;  // Professional gets 60%
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}