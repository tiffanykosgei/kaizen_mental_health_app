using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace kaizenbackend.Models
{
    public class ProfessionalProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        
        public string Bio { get; set; } = "";
        public string Specialization { get; set; } = "";
        public string YearsOfExperience { get; set; } = "";
        public string Education { get; set; } = "";
        public string Certifications { get; set; } = "";
        public string LicenseNumber { get; set; } = "";
        public string Experience { get; set; } = "";
        
        // External profile link (e.g., government registry, LinkedIn, official website)
        [Url(ErrorMessage = "Please enter a valid URL")]
        public string? ExternalProfileUrl { get; set; }
        
        public string PaymentMethod { get; set; } = "Mpesa";
        public string PaymentAccount { get; set; } = "";
        public decimal AverageRating { get; set; } = 0;
        public int? CustomSplitPercentage { get; set; } = null;
        public decimal TotalEarnings { get; set; } = 0;
        public decimal PendingPayout { get; set; } = 0;
        public decimal PaidOut { get; set; } = 0;
        
        public User User { get; set; } = null!;
    }
}