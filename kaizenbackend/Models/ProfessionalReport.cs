using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace kaizenbackend.Models
{
    public class ProfessionalReport
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int ProfessionalId { get; set; }

        [Required]
        public int ClientId { get; set; }

        [Required]
        [MaxLength(2000)]
        public string Complaint { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Optional: status for admin workflow
        public string Status { get; set; } = "Pending"; // Pending, Resolved, Dismissed

        // Navigation properties
        [ForeignKey("ProfessionalId")]
        public virtual User Professional { get; set; }

        [ForeignKey("ClientId")]
        public virtual User Client { get; set; }
    }
}