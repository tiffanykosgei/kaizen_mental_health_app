using System.Collections.Generic;

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
        
        public ProfessionalLinks? ProfessionalLinks { get; set; }
        // REMOVED: public List<string> Languages { get; set; } = new List<string>();
        
        public string PaymentMethod { get; set; } = "Mpesa";
        public string PaymentAccount { get; set; } = "";
        public decimal AverageRating { get; set; } = 0;
        public int? CustomSplitPercentage { get; set; } = null;
        public decimal TotalEarnings { get; set; } = 0;
        public decimal PendingPayout { get; set; } = 0;
        public decimal PaidOut { get; set; } = 0;
        
        public User User { get; set; } = null!;
    }

    public class ProfessionalLinks
    {
        public string Linkedin { get; set; } = "";
        public string Website { get; set; } = "";
        public string Portfolio { get; set; } = "";
    }
}