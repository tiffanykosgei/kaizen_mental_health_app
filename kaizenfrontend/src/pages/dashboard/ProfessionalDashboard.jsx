import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { LegalLinks } from '../../components/LegalConsent';

export default function ProfessionalDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
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

  useEffect(() => { fetchProfessionalData(); }, []);

  const convertToProperEarnings = (value) => (value < 100 ? value * 150 : value);

  const fetchProfessionalData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        API.get('/Session/my-sessions'),
        API.get('/Payment/my-earnings')
      ]);
      let allSessions = [];
      if (results[0].status === 'fulfilled') {
        const data = results[0].value.data;
        allSessions = Array.isArray(data) ? data : (data?.$values || data?.data || []);
      }
      let earningsData = {};
      if (results[1].status === 'fulfilled') earningsData = results[1].value.data || {};
      
      const formattedSessions = allSessions.map(s => ({
        ...s,
        formattedDate: s.sessionDate ? new Date(s.sessionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date not set',
        sessionDateObj: s.sessionDate ? new Date(s.sessionDate) : null
      }));
      const now = new Date();
      setUpcomingSessions(formattedSessions.filter(s => s.sessionDateObj && s.sessionDateObj > now && s.status !== 'Cancelled').slice(0, 3));
      
      const rawTotal = convertToProperEarnings(earningsData.totalEarned || earningsData.totalEarnings || 0);
      const rawPending = convertToProperEarnings(earningsData.pendingPayout || earningsData.pendingAmount || 0);
      const sessionFee = 1500;
      const split = earningsData.splitPercentage || earningsData.professionalSplit || 60;
      setEarnings({
        totalEarned: rawTotal, pendingPayout: rawPending,
        sessionFee: sessionFee, currentSplitPercentage: split,
        earningPerSession: (sessionFee * split) / 100,
        platformSplitPercentage: 100 - split,
        platformFeePerSession: (sessionFee * (100 - split)) / 100,
        totalPlatformRevenue: split > 0 ? (rawTotal * (100 - split)) / split : 0
      });
      
      const completed = allSessions.filter(s => s.status === 'Completed').length;
      const uniqueClients = new Set(allSessions.map(s => s.client?.id || s.clientId).filter(Boolean));
      setStats({
        totalSessions: allSessions.length, completedSessions: completed,
        totalClients: uniqueClients.size, averageRating: earningsData.averageRating || 0
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading dashboard...</div>;

  const statCards = [
    { label: 'Total Sessions', value: stats?.totalSessions || 0, detail: `${stats?.completedSessions || 0} Completed`, color: 'var(--accent)', path: '/sessions' },
    { label: 'Active Clients', value: stats?.totalClients || 0, detail: 'Unique clients', color: 'var(--secondary)', path: '/sessions' },
    { label: 'Your Rating', value: `★ ${stats?.averageRating?.toFixed(1) || 0}`, detail: `From ${stats?.totalSessions || 0} sessions`, color: 'var(--warning-text)', path: '/profile' },
    { label: 'My Personal Earnings', value: `KES ${earnings?.totalEarned?.toLocaleString() || 0}`, detail: `Pending: KES ${earnings?.pendingPayout?.toLocaleString() || 0}`, color: 'var(--info-text)', path: '/professional-payment' }
  ];

  return (
    <>
      <div style={{ fontFamily: 'inherit', padding: '0 24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', borderRadius: 16, padding: '16px 24px', marginBottom: 20, border: '1px solid var(--border)' }}>
          <div><p style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 4 }}>{getGreeting()}</p><h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{displayName ? `${getGreeting()}, ${displayName}!` : `${getGreeting()}!`}</h2><p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Your practice at a glance</p></div>
          <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden' }}><img src="/brain-wellness.jpeg" alt="Wellness" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} /></div>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {statCards.map(card => (
            <div key={card.label} onClick={() => navigate(card.path)} style={{ background: 'var(--bg-card)', padding: '16px 12px', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{card.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{card.detail}</p>
            </div>
          ))}
        </div>

        {/* Upcoming Sessions & Earnings Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Upcoming Sessions</h3>
            {upcomingSessions.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontSize: 13 }}>No upcoming sessions</p> :
              <div>{upcomingSessions.map(s => (<div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}><div><p style={{ fontWeight: 600, margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>{s.client?.clientFullName || s.client?.fullName || 'Client'}</p><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{s.formattedDate}</p></div><span style={{ background: s.status==='Confirmed'?'var(--success-bg)':'var(--warning-bg)', color: s.status==='Confirmed'?'var(--success-text)':'var(--warning-text)', padding: '2px 8px', borderRadius: 12, fontSize: 10 }}>{s.status || 'Pending'}</span></div>))}</div>}
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Earnings Summary</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Earned:</span><span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>KES {earnings?.totalEarned?.toLocaleString() || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Platform Revenue:</span><span style={{ fontWeight: 600, color: 'var(--accent)' }}>KES {earnings?.totalPlatformRevenue?.toLocaleString() || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pending Payout:</span><span style={{ fontWeight: 600, color: 'var(--warning-text)' }}>KES {earnings?.pendingPayout?.toLocaleString() || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your Split ({earnings?.currentSplitPercentage || 60}%):</span><span style={{ fontWeight: 700, color: 'var(--success-text)' }}>KES {earnings?.earningPerSession?.toLocaleString() || 900} per session</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Platform Split ({earnings?.platformSplitPercentage || 40}%):</span><span style={{ fontWeight: 700, color: 'var(--accent)' }}>KES {earnings?.platformFeePerSession?.toLocaleString() || 600} per session</span></div>
          </div>
        </div>
      </div>

      {/* Footer – full width, flush bottom */}
      <footer style={{ background: 'var(--bg-card)', borderTop: '3px solid var(--primary)', margin: '40px -32px -24px', padding: '32px 24px 24px', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)', width: 'calc(100% + 64px)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32, textAlign: 'center' }}>
          <div><h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Contact</h4><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📞 +254 729 604375</div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>✉️ <a href="mailto:kosgeitiffany@gmail.com" style={{ color: 'var(--primary)', textDecoration: 'none' }}>kosgeitiffany@gmail.com</a></div></div>
          <div><h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Services</h4><ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}><li><a href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>Home</a></li><li><a href="/our-story" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>Our Story</a></li><li><a href="/careers" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13 }}>Careers</a></li></ul></div>
          <div><h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Legal Terms</h4><LegalLinks color="var(--primary)" style={{ fontSize: 13 }} /></div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 32, paddingTop: 16, borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>© 2025 Kaizen Mental Health Platform — A safe space for mental wellness</div>
      </footer>
    </>
  );
}