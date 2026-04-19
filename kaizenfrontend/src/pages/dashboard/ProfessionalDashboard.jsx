import { useState, useEffect } from 'react';
import API from '../../api/axios';

export default function ProfessionalDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentRatings, setRecentRatings] = useState([]);
  const [earnings, setEarnings] = useState(null);
  
  const firstName = localStorage.getItem('firstName') || '';
  const fullName = localStorage.getItem('fullName') || '';
  const displayName = firstName.trim() || fullName.split(' ')[0].trim() || '';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    fetchProfessionalData();
  }, []);

  const fetchProfessionalData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, earningsRes, ratingsRes] = await Promise.all([
        API.get('/Session/my-sessions'),
        API.get('/Professional/earnings'),
        API.get('/Ratings/my-ratings')
      ]);
      
      const allSessions = sessionsRes.data || [];
      const now = new Date();
      
      setRecentSessions(allSessions.slice(0, 5));
      setUpcomingSessions(allSessions.filter(s => new Date(s.sessionDate) > now).slice(0, 5));
      setEarnings(earningsRes.data);
      setRecentRatings(ratingsRes.data?.ratings?.slice(0, 5) || []);
      setStats({
        totalSessions: allSessions.length,
        completedSessions: allSessions.filter(s => s.status === 'Completed').length,
        pendingSessions: allSessions.filter(s => s.status === 'Pending').length,
        confirmedSessions: allSessions.filter(s => s.status === 'Confirmed').length,
        totalClients: [...new Set(allSessions.map(s => s.client?.id))].length,
        averageRating: earningsRes.data?.averageRating || 0
      });
    } catch (err) {
      console.error('Failed to fetch professional data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container" style={{ fontFamily: 'inherit' }}>
      {/* Greeting Card */}
      <div className="dashboard-greeting-card">
        <div style={{ flex: 1 }}>
          <p className="dashboard-greeting-badge">{getGreeting()}</p>
          <h2 className="dashboard-greeting-title">
            {displayName ? `${getGreeting()}, ${displayName}!` : `${getGreeting()}!`}
          </h2>
          <p className="dashboard-greeting-message">
            Your clients are counting on you. Make today count.
          </p>
        </div>
        <div className="dashboard-image-container">
          <img
            src="/brain-wellness.jpeg"
            alt="Take care of your mind"
            className="dashboard-image"
            onError={e => e.target.style.display = 'none'}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Total Sessions</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', margin: 0, fontFamily: 'inherit' }}>{stats?.totalSessions || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>{stats?.completedSessions || 0} Completed</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Active Clients</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--secondary)', margin: 0, fontFamily: 'inherit' }}>{stats?.totalClients || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>Unique clients served</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Your Rating</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning-text)', margin: 0, fontFamily: 'inherit' }}>★ {stats?.averageRating?.toFixed(1) || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>From {earnings?.totalSessions || 0} sessions</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Total Earnings</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--info-text)', margin: 0, fontFamily: 'inherit' }}>KSh {earnings?.totalEarned?.toLocaleString() || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>Pending: KSh {earnings?.pendingPayout?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Upcoming & Recent Sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Upcoming Sessions</h3>
          {upcomingSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontFamily: 'inherit' }}>No upcoming sessions</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingSessions.map(session => (
                <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{session.client?.clientFullName || 'Client'}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>{session.formattedDate}</p>
                  </div>
                  <span style={{ 
                    background: session.status === 'Confirmed' ? 'var(--success-bg)' : 'var(--warning-bg)',
                    color: session.status === 'Confirmed' ? 'var(--success-text)' : 'var(--warning-text)',
                    padding: '2px 8px', borderRadius: 12, fontSize: 11
                  }}>{session.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Recent Sessions</h3>
          {recentSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontFamily: 'inherit' }}>No recent sessions</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentSessions.map(session => (
                <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{session.client?.clientFullName || 'Client'}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>{session.formattedDate}</p>
                  </div>
                  <span style={{ 
                    background: session.status === 'Completed' ? 'var(--success-bg)' : session.status === 'Confirmed' ? 'var(--info-bg)' : 'var(--warning-bg)',
                    color: session.status === 'Completed' ? 'var(--success-text)' : session.status === 'Confirmed' ? 'var(--info-text)' : 'var(--warning-text)',
                    padding: '2px 8px', borderRadius: 12, fontSize: 11
                  }}>{session.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Ratings & Earnings Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Recent Client Reviews</h3>
          {recentRatings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontFamily: 'inherit' }}>No reviews yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentRatings.map(rating => (
                <div key={rating.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit' }}>★ {rating.ratingValue}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit' }}>{new Date(rating.createdAt).toLocaleDateString()}</span>
                  </div>
                  {rating.review && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, fontFamily: 'inherit' }}>"{rating.review}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Earnings Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Total Earned:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit' }}>KSh {earnings?.totalEarned?.toLocaleString() || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Pending Payout:</span>
            <span style={{ fontWeight: 600, color: 'var(--warning-text)', fontFamily: 'inherit' }}>KSh {earnings?.pendingPayout?.toLocaleString() || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Already Paid:</span>
            <span style={{ fontWeight: 600, color: 'var(--success-text)', fontFamily: 'inherit' }}>KSh {earnings?.paidOut?.toLocaleString() || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Your Split:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'inherit' }}>{earnings?.currentSplitPercentage || 60}% of session fees</span>
          </div>
        </div>
      </div>

      {/* Session Status Summary */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Session Status Overview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, textAlign: 'center' }}>
          <div style={{ padding: 12, background: 'var(--info-bg)', borderRadius: 10 }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--info-text)', margin: 0, fontFamily: 'inherit' }}>{stats?.pendingSessions || 0}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>Pending</p>
          </div>
          <div style={{ padding: 12, background: 'var(--warning-bg)', borderRadius: 10 }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning-text)', margin: 0, fontFamily: 'inherit' }}>{stats?.confirmedSessions || 0}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>Confirmed</p>
          </div>
          <div style={{ padding: 12, background: 'var(--success-bg)', borderRadius: 10 }}>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--success-text)', margin: 0, fontFamily: 'inherit' }}>{stats?.completedSessions || 0}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>Completed</p>
          </div>
        </div>
      </div>

      {/* Quote Card */}
      <div className="dashboard-quote-card">
        <p className="dashboard-quote-label">Daily reminder</p>
        <p className="dashboard-quote-text">"The greatest healing therapy is friendship and love."</p>
        <p className="dashboard-quote-author">— Hubert H. Humphrey</p>
      </div>
    </div>
  );
}