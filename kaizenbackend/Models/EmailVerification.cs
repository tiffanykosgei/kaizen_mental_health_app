using System;

namespace kaizenbackend.Models
{
    public class EmailVerification
    {
        public int Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Code { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
        public bool IsVerified { get; set; } = false;
        public string? TempRegistrationData { get; set; } // JSON of registration data
    }
}