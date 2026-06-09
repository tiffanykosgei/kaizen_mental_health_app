namespace kaizenbackend.Services
{
    public class SessionStatusBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<SessionStatusBackgroundService> _logger;

        public SessionStatusBackgroundService(
            IServiceScopeFactory scopeFactory,
            ILogger<SessionStatusBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));

            while (!stoppingToken.IsCancellationRequested)
            {
                await CancelExpiredSessions(stoppingToken);

                try
                {
                    await timer.WaitForNextTickAsync(stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }

        private async Task CancelExpiredSessions(CancellationToken stoppingToken)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var sessionStatusService = scope.ServiceProvider.GetRequiredService<ISessionStatusService>();
                var cancelledCount = await sessionStatusService.CancelExpiredUnpaidSessionsAsync(stoppingToken);

                if (cancelledCount > 0)
                    _logger.LogInformation("Auto-cancelled {Count} expired unpaid sessions.", cancelledCount);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to auto-cancel expired unpaid sessions.");
            }
        }
    }
}
