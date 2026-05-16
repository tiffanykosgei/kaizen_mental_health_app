using Microsoft.AspNetCore.DataProtection;

namespace kaizenbackend.Services
{
    public class JournalEncryptionService : IJournalEncryptionService
    {
        private const string Prefix = "KaizenJournal:v1:";
        private readonly IDataProtector _protector;

        public JournalEncryptionService(IDataProtectionProvider dataProtectionProvider)
        {
            _protector = dataProtectionProvider.CreateProtector("Kaizen.JournalEntries.v1");
        }

        public string Encrypt(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            if (IsEncrypted(value)) return value;
            return Prefix + _protector.Protect(value);
        }

        public string Decrypt(string value)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            if (!IsEncrypted(value)) return value;
            return _protector.Unprotect(value.Substring(Prefix.Length));
        }

        public bool IsEncrypted(string value)
        {
            return value.StartsWith(Prefix, StringComparison.Ordinal);
        }
    }
}
