using System.ComponentModel.DataAnnotations;

namespace kaizenbackend.DTOs
{
    public class ReportProfessionalDto
    {
        [Required]
        public int ProfessionalId { get; set; }

        [Required]
        [MinLength(5)]
        [MaxLength(2000)]
        public string Complaint { get; set; }
    }
}