namespace kaizenbackend.Models
{
    public class Session
    {
        public int Id { get; set; }
        public int ClientId { get; set; }
        public int ProfessionalId { get; set; }
        public DateTime SessionDate { get; set; }
        public string Status { get; set; } = "Pending";
        public string PaymentStatus { get; set; } = "Pending";
        public string? PaymentReference { get; set; }
        public decimal Amount { get; set; } = 1500;
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public User Client { get; set; } = null!;
        public User Professional { get; set; } = null!;
    }
}