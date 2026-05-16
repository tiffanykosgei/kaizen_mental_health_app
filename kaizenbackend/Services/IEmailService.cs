namespace kaizenbackend.Services
{
    public interface IEmailService
    {
        /// <summary>
        /// Sends a verification code email to the user.
        /// </summary>
        Task<bool> SendVerificationCodeAsync(string email, string code);

        /// <summary>
        /// Sends a test email (for debugging or admin testing).
        /// </summary>
        Task<bool> SendTestEmailAsync(string email, string subject, string body);

        /// <summary>
        /// Generic method to send any email (HTML or plain text).
        /// </summary>
        /// <param name="to">Recipient email address</param>
        /// <param name="subject">Email subject</param>
        /// <param name="body">Email body (HTML or plain text)</param>
        /// <param name="isHtml">If true, body is treated as HTML; otherwise plain text</param>
        /// <returns>True if sent successfully, otherwise false</returns>
        Task<bool> SendEmailAsync(string to, string subject, string body, bool isHtml = true);
    }
}