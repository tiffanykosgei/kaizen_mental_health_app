namespace kaizenbackend.Services
{
    public interface IEmailService
    {
        Task<bool> SendVerificationCodeAsync(string email, string code);
        Task<bool> SendTestEmailAsync(string email, string subject, string body);
    }
}