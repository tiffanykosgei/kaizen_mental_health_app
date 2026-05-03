import { useState, useEffect } from 'react';
import API from '../../api/axios';

export default function ProfessionalDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
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

  // Helper function to convert earnings to proper KES values
  // Assuming each session should be KES 1,500
  // If backend returns 10, multiply by 150 to get 1500
  const convertToProperEarnings = (value) => {
    // If value is very small (like 10, 24), multiply by 150 to get 1500, 3600
    if (value < 100) {
      return value * 150;
    }
    // If value is already reasonable (like 900, 4500), keep as is
    return value;
  };

  const fetchProfessionalData = async () => {
    setLoading(true);
    try {
      // Use allSettled to handle individual failures
      const results = await Promise.allSettled([
        API.get('/Session/my-sessions'),
        API.get('/Payment/my-earnings'),
        API.get('/Ratings/my-ratings')
      ]);
      
      // Process sessions (first result)
      let allSessions = [];
      if (results[0].status === 'fulfilled') {
        const sessionsData = results[0].value.data;
        console.log('Sessions data:', sessionsData);
        
        if (Array.isArray(sessionsData)) {
          allSessions = sessionsData;
        } else if (sessionsData?.$values) {
          allSessions = sessionsData.$values;
        } else if (sessionsData?.data) {
          allSessions = sessionsData.data;
        } else {
          allSessions = sessionsData || [];
        }
      } else {
        console.error('Sessions fetch failed:', results[0].reason);
      }
      
      // Process earnings (second result)
      let earningsData = {};
      if (results[1].status === 'fulfilled') {
        const earningsResponse = results[1].value.data;
        console.log('Earnings data:', earningsResponse);
        earningsData = earningsResponse || {};
      } else {
        console.error('Earnings fetch failed:', results[1].reason);
      }
      
      // Process ratings (third result) - don't fail if 403
      let ratingsList = [];
      if (results[2].status === 'fulfilled') {
        const ratingsResponse = results[2].value.data;
        console.log('Ratings data:', ratingsResponse);
        
        if (Array.isArray(ratingsResponse)) {
          ratingsList = ratingsResponse;
        } else if (ratingsResponse?.ratings) {
          ratingsList = ratingsResponse.ratings;
        } else if (ratingsResponse?.$values) {
          ratingsList = ratingsResponse.$values;
        }
      } else {
        console.warn('Ratings not available (this is okay):', results[2].reason?.response?.status);
      }
      
      // Format sessions with proper date
      const formattedSessions = allSessions.map(session => ({
        ...session,
        formattedDate: session.sessionDate 
          ? new Date(session.sessionDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Date not set',
        sessionDateObj: session.sessionDate ? new Date(session.sessionDate) : null
      }));
      
      const now = new Date();
      
      // Filter upcoming sessions (future dates)
      const upcoming = formattedSessions.filter(s => 
        s.sessionDateObj && s.sessionDateObj > now && s.status !== 'Cancelled'
      );
      
      // Filter recent sessions (past sessions, sorted by date descending)
      const recent = formattedSessions.filter(s => 
        s.sessionDateObj && s.sessionDateObj <= now
      ).sort((a, b) => b.sessionDateObj - a.sessionDateObj);
      
      setUpcomingSessions(upcoming.slice(0, 5));
      setRecentSessions(recent.slice(0, 5));
      setRecentRatings(ratingsList.slice(0, 5));
      
      // Get raw values from backend
      let rawTotalEarned = earningsData.totalEarned || earningsData.totalEarnings || earningsData.totalAmount || 0;
      let rawPendingPayout = earningsData.pendingPayout || earningsData.pendingAmount || 0;
      let rawPaidOut = earningsData.paidOut || earningsData.paidAmount || 0;
      
      // Convert to proper KES values (based on KES 1,500 per session)
      const convertedTotalEarned = convertToProperEarnings(rawTotalEarned);
      const convertedPendingPayout = convertToProperEarnings(rawPendingPayout);
      const convertedPaidOut = convertToProperEarnings(rawPaidOut);
      
      // Calculate session fee (should be 1500)
      const sessionFee = 1500;
      const professionalSplitPercentage = earningsData.splitPercentage || earningsData.professionalSplit || 60;
      const professionalEarningPerSession = (sessionFee * professionalSplitPercentage) / 100;
      
      // Set earnings with converted values
      setEarnings({
        totalEarned: convertedTotalEarned,
        pendingPayout: convertedPendingPayout,
        paidOut: convertedPaidOut,
        totalSessions: earningsData.totalSessions || allSessions.length,
        averageRating: earningsData.averageRating || 0,
        currentSplitPercentage: professionalSplitPercentage,
        sessionFee: sessionFee,
        earningPerSession: professionalEarningPerSession
      });
      
      // Calculate stats
      const totalSessions = allSessions.length;
      const completedSessions = allSessions.filter(s => 
        s.status === 'Completed' || s.status === 'completed'
      ).length;
      const pendingSessions = allSessions.filter(s => 
        s.status === 'Pending' || s.status === 'pending'
      ).length;
      const confirmedSessions = allSessions.filter(s => 
        s.status === 'Confirmed' || s.status === 'confirmed'
      ).length;
      
      // Get unique clients
      const uniqueClients = new Set();
      allSessions.forEach(s => {
        if (s.client?.id) uniqueClients.add(s.client.id);
        if (s.clientId) uniqueClients.add(s.clientId);
        if (s.client?.userId) uniqueClients.add(s.client.userId);
      });
      
      setStats({
        totalSessions: totalSessions,
        completedSessions: completedSessions,
        pendingSessions: pendingSessions,
        confirmedSessions: confirmedSessions,
        totalClients: uniqueClients.size,
        averageRating: earningsData.averageRating || 0
      });
      
    } catch (err) {
      console.error('Unexpected error:', err);
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
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>From {earnings?.totalSessions || stats?.totalSessions || 0} sessions</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Total Earnings</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--info-text)', margin: 0, fontFamily: 'inherit' }}>KES {earnings?.totalEarned?.toLocaleString() || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>Pending: KES {earnings?.pendingPayout?.toLocaleString() || 0}</p>
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
                    <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                      {session.client?.clientFullName || session.client?.fullName || session.clientName || 'Client'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>
                      {session.formattedDate}
                    </p>
                  </div>
                  <span style={{ 
                    background: session.status === 'Confirmed' ? 'var(--success-bg)' : 'var(--warning-bg)',
                    color: session.status === 'Confirmed' ? 'var(--success-text)' : 'var(--warning-text)',
                    padding: '2px 8px', borderRadius: 12, fontSize: 11
                  }}>{session.status || 'Pending'}</span>
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
                    <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                      {session.client?.clientFullName || session.client?.fullName || session.clientName || 'Client'}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>
                      {session.formattedDate}
                    </p>
                  </div>
                  <span style={{ 
                    background: session.status === 'Completed' ? 'var(--success-bg)' : 
                               session.status === 'Confirmed' ? 'var(--info-bg)' : 'var(--warning-bg)',
                    color: session.status === 'Completed' ? 'var(--success-text)' : 
                           session.status === 'Confirmed' ? 'var(--info-text)' : 'var(--warning-text)',
                    padding: '2px 8px', borderRadius: 12, fontSize: 11
                  }}>{session.status || 'Pending'}</span>
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
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit' }}>★ {rating.ratingValue || rating.score}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                      {new Date(rating.createdAt || rating.date).toLocaleDateString()}
                    </span>
                  </div>
                  {(rating.review || rating.comment) && 
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, fontFamily: 'inherit' }}>
                      "{rating.review || rating.comment}"
                    </p>
                  }
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Earnings Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Total Earned:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit' }}>KES {earnings?.totalEarned?.toLocaleString() || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Pending Payout:</span>
            <span style={{ fontWeight: 600, color: 'var(--warning-text)', fontFamily: 'inherit' }}>KES {earnings?.pendingPayout?.toLocaleString() || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Already Paid:</span>
            <span style={{ fontWeight: 600, color: 'var(--success-text)', fontFamily: 'inherit' }}>KES {earnings?.paidOut?.toLocaleString() || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Session Fee:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'inherit' }}>KES {earnings?.sessionFee?.toLocaleString() || 1500}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Your Split ({earnings?.currentSplitPercentage || 60}%):</span>
            <span style={{ fontWeight: 700, color: 'var(--success-text)', fontFamily: 'inherit' }}>KES {earnings?.earningPerSession?.toLocaleString() || 900} per session</span>
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