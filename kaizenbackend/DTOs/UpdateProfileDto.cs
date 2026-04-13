namespace kaizenbackend.DTOs
{
    public class UpdateProfileDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Password { get; set; }
        public string? Bio { get; set; }
        public string? Specialization { get; set; }
    }
}