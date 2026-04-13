using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;

namespace kaizenbackend.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task<bool> SendVerificationCodeAsync(string email, string code)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(
                    _config["Email:FromName"],
                    _config["Email:FromEmail"]
                ));
                message.To.Add(new MailboxAddress("", email));
                message.Subject = "Verify Your Email - Kaizen Mental Health";

                var bodyBuilder = new BodyBuilder
                {
                    HtmlBody = $@"
                        <!DOCTYPE html>
                        <html>
                        <head><meta charset='UTF-8'></head>
                        <body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
                            <div style='text-align: center; margin-bottom: 30px;'>
                                <h1 style='color: #7c63ff;'>Kaizen</h1>
                                <h2>Mental Health Support</h2>
                            </div>
                            <div style='background: #f5f5f5; padding: 20px; border-radius: 10px; text-align: center;'>
                                <p style='font-size: 16px;'>Your verification code is:</p>
                                <div style='font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #7c63ff; padding: 15px; background: white; border-radius: 8px; display: inline-block;'>
                                    {code}
                                </div>
                                <p style='margin-top: 20px; font-size: 14px; color: #666;'>This code expires in 10 minutes.</p>
                                <p style='font-size: 12px; color: #999;'>If you didn't request this, please ignore this email.</p>
                            </div>
                        </body>
                        </html>
                    "
                };

                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(
                    _config["Email:SmtpServer"],
                    int.Parse(_config["Email:SmtpPort"]),
                    SecureSocketOptions.StartTls
                );
                await client.AuthenticateAsync(
                    _config["Email:SmtpUsername"],
                    _config["Email:SmtpPassword"]
                );
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                _logger.LogInformation($"Verification code sent to {email}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send verification email to {email}");
                return false;
            }
        }

        public async Task<bool> SendTestEmailAsync(string email, string subject, string body)
        {
            try
            {
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(
                    _config["Email:FromName"],
                    _config["Email:FromEmail"]
                ));
                message.To.Add(new MailboxAddress("", email));
                message.Subject = subject;

                var bodyBuilder = new BodyBuilder { HtmlBody = body };
                message.Body = bodyBuilder.ToMessageBody();

                using var client = new SmtpClient();
                await client.ConnectAsync(
                    _config["Email:SmtpServer"],
                    int.Parse(_config["Email:SmtpPort"]),
                    SecureSocketOptions.StartTls
                );
                await client.AuthenticateAsync(
                    _config["Email:SmtpUsername"],
                    _config["Email:SmtpPassword"]
                );
                await client.SendAsync(message);
                await client.DisconnectAsync(true);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {email}");
                return false;
            }
        }
    }
}