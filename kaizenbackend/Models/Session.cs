namespace kaizenbackend.Models
{
    public class Session
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public int ProfessionalId { get; set; }
        public DateTime SessionDate { get; set; }
        public string Status { get; set; } = "Pending";  // Pending, Confirmed, Completed, Cancelled
        public string PaymentStatus { get; set; } = "Pending";  // Pending, Paid, Failed
        public string? PaymentReference { get; set; }
        public decimal Amount { get; set; } = 1500;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        
        // NEW FIELDS FOR REVENUE SPLIT
        public decimal PlatformFee { get; set; } = 600;      // 40% of 1500
        public decimal ProfessionalEarnings { get; set; } = 900;  // 60% of 1500
        public string PayoutStatus { get; set; } = "Pending";  // Pending, PaidOut

        public User Client { get; set; } = null!;
        public User Professional { get; set; } = null!;
    }
}