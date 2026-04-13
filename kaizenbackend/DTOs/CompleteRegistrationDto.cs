namespace kaizenbackend.DTOs
{
    public class CompleteRegistrationDto
    {
        public string Email { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string ConfirmPassword { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Bio { get; set; }
        public string? Specialization { get; set; }
        public bool IsGoogleUser { get; set; } = false;
    }
}