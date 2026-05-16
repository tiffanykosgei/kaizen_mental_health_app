namespace kaizenbackend.Services
{
    public interface IJournalEncryptionService
    {
        string Encrypt(string value);
        string Decrypt(string value);
        bool IsEncrypted(string value);
    }
}
