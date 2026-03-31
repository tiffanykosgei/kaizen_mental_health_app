using System.Text.Json.Serialization;

namespace kaizenbackend.DTOs
{
    public class CreateSessionDto
    {
        [JsonPropertyName("professionalId")]
        public int ProfessionalId { get; set; }
        
        [JsonPropertyName("sessionDate")]
        public DateTime SessionDate { get; set; }
        
        [JsonPropertyName("notes")]
        public string? Notes { get; set; }
    }

    public class UpdateSessionDto
    {
        public string Status { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    public class PaymentCallbackDto
    {
        public string PaymentReference { get; set; } = string.Empty;
        public int SessionId { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}