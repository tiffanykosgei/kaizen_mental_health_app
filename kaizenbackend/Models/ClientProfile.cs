namespace kaizenbackend.Models
{
    public class ClientProfile
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string EmergencyContact { get; set; } = string.Empty;
        public string EmergencyContactPhone { get; set; } = string.Empty;
        public string Diagnoses { get; set; } = string.Empty;
        public string CurrentMedications { get; set; } = string.Empty;
        public bool PreviousTherapy { get; set; } = false;
        public string KnownTriggers { get; set; } = string.Empty;
        public string MedicalNotes { get; set; } = string.Empty;

        public User User { get; set; } = null!;
    }
}