using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace kaizenbackend.Models
{
    public class Rating
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int SessionId { get; set; }

        [Required]
        public int ClientId { get; set; }

        [Required]
        public int ProfessionalId { get; set; }

        [Required]
        [Range(1, 5)]
        public int RatingValue { get; set; }

        public string? Review { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? UpdatedAt { get; set; }

        // Navigation properties
        [ForeignKey("SessionId")]
        public virtual Session? Session { get; set; }

        [ForeignKey("ClientId")]
        public virtual User? Client { get; set; }

        [ForeignKey("ProfessionalId")]
        public virtual User? Professional { get; set; }
    }
}