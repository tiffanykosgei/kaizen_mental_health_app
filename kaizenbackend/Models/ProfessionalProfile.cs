namespace kaizenbackend.Models
{
    public class ProfessionalProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string Bio { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
        
        // NEW FIELDS FOR PAYMENTS & RATINGS
        public string PaymentMethod { get; set; } = "Mpesa";  // Mpesa, Bank
        public string PaymentAccount { get; set; } = string.Empty;  // Phone number or bank account
        public decimal AverageRating { get; set; } = 0;
        public int? CustomSplitPercentage { get; set; } = null;  // NULL means use default 60%
        public decimal TotalEarnings { get; set; } = 0;
        public decimal PendingPayout { get; set; } = 0;
        public decimal PaidOut { get; set; } = 0;

        public User User { get; set; } = null!;
    }
}