namespace kaizenbackend.DTOs
{
    public class RegisterDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Role { get; set; } = "Client";
        public string Bio { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty;
    }
}