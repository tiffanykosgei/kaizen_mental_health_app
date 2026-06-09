using Microsoft.EntityFrameworkCore;
using kaizenbackend.Data;

namespace kaizenbackend.Services
{
    public class SessionStatusService : ISessionStatusService
    {
        private readonly AppDbContext _context;

        public SessionStatusService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<int> CancelExpiredUnpaidSessionsAsync(CancellationToken cancellationToken = default)
        {
            var cutoffUtc = DateTime.UtcNow.AddHours(-1);

            var expiredSessions = await _context.Sessions
                .Where(s => (s.Status == "Pending" || s.Status == "Confirmed")
                    && s.PaymentStatus != "Paid"
                    && s.SessionDate <= cutoffUtc)
                .ToListAsync(cancellationToken);

            foreach (var session in expiredSessions)
            {
                session.Status = "Cancelled";
                session.UpdatedAt = DateTime.UtcNow;
                if (string.IsNullOrWhiteSpace(session.Notes))
                {
                    session.Notes = "Automatically cancelled after the unpaid session window elapsed.";
                }
                else if (!session.Notes.Contains("Automatically cancelled after the unpaid session window elapsed."))
                {
                    session.Notes += " [Automatically cancelled after the unpaid session window elapsed.]";
                }
            }

            if (expiredSessions.Count > 0)
                await _context.SaveChangesAsync(cancellationToken);

            return expiredSessions.Count;
        }
    }
}
