namespace kaizenbackend.Services
{
    public interface ISessionStatusService
    {
        Task<int> CancelExpiredUnpaidSessionsAsync(CancellationToken cancellationToken = default);
    }
}
