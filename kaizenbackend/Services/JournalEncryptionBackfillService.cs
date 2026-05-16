using kaizenbackend.Data;
using Microsoft.EntityFrameworkCore;

namespace kaizenbackend.Services
{
    public class JournalEncryptionBackfillService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<JournalEncryptionBackfillService> _logger;

        public JournalEncryptionBackfillService(
            IServiceScopeFactory scopeFactory,
            ILogger<JournalEncryptionBackfillService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var encryption = scope.ServiceProvider.GetRequiredService<IJournalEncryptionService>();

                var entries = await context.JournalEntries.ToListAsync(stoppingToken);
                var changed = 0;

                foreach (var entry in entries)
                {
                    var encryptedTitle = encryption.Encrypt(entry.Title);
                    var encryptedContent = encryption.Encrypt(entry.Content);

                    if (entry.Title != encryptedTitle || entry.Content != encryptedContent)
                    {
                        entry.Title = encryptedTitle;
                        entry.Content = encryptedContent;
                        entry.UpdatedAt ??= DateTime.UtcNow;
                        changed++;
                    }
                }

                if (changed > 0)
                {
                    await context.SaveChangesAsync(stoppingToken);
                    _logger.LogInformation("Encrypted {Count} existing journal entries.", changed);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Journal encryption backfill failed.");
            }
        }
    }
}
