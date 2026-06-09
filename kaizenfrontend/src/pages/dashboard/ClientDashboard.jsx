import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { LegalLinks } from '../../components/LegalConsent';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [latestAssessment, setLatestAssessment] = useState(null);
  
  const firstName = localStorage.getItem('firstName') || '';
  const fullName = localStorage.getItem('fullName') || '';
  const displayName = firstName.trim() || fullName.split(' ')[0].trim() || '';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => { fetchClientData(); }, []);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, assessmentsRes, journalRes] = await Promise.all([
        API.get('/Session/my-sessions'),
        API.get('/SelfAssessment/my-history'),
        API.get('/journal')
      ]);
      const allSessions = sessionsRes.data || [];
      const journalEntries = journalRes.data || [];
      const now = new Date();
      setUpcomingSessions(allSessions.filter(s => new Date(s.sessionDate) > now && s.status !== 'Cancelled').slice(0, 3));
      setLatestAssessment(assessmentsRes.data?.[0] || null);
      setStats({
        totalSessions: allSessions.length,
        completedSessions: allSessions.filter(s => s.status === 'Completed').length,
        upcomingSessions: allSessions.filter(s => new Date(s.sessionDate) > now && s.status !== 'Cancelled').length,
        totalAssessments: assessmentsRes.data?.length || 0,
        totalJournalEntries: journalEntries.length
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getWellbeingColor = (level) => {
    switch(level) {
      case 'Good': return { bg: '#fce4ec', text: '#c2185b' };
      case 'Mild': return { bg: '#f8bbd0', text: '#ad1457' };
      case 'Moderate': return { bg: '#e1bee7', text: '#6a1b9a' };
      case 'Severe': return { bg: '#ce93d8', text: '#4a148c' };
      default: return { bg: 'var(--bg-muted)', text: 'var(--text-muted)' };
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading dashboard...</div>;

  const statCards = [
    { label: 'Sessions', value: stats?.totalSessions || 0, detail: `${stats?.completedSessions || 0} Completed`, color: 'var(--accent)', path: '/sessions' },
    { label: 'Upcoming', value: stats?.upcomingSessions || 0, detail: 'Sessions scheduled', color: 'var(--secondary)', path: '/sessions' },
    { label: 'Self Assessments', value: stats?.totalAssessments || 0, detail: 'Wellness check-ins', color: 'var(--warning-text)', path: '/assessment-history' },
    { label: 'Journal', value: stats?.totalJournalEntries || 0, detail: 'Entries', color: 'var(--info-text)', path: '/journal' }
  ];

  return (
    <>
      <div style={{ fontFamily: 'inherit', padding: '0 24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Greeting */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', borderRadius: 16, padding: '16px 24px', marginBottom: 20, border: '1px solid var(--border)' }}>
          <div><p style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 4 }}>{getGreeting()}</p><h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{displayName ? `${getGreeting()}, ${displayName}!` : `${getGreeting()}!`}</h2><p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Your wellness journey</p></div>
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

        {/* Latest Assessment & Upcoming Sessions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Latest Assessment</h3>
            {latestAssessment ? (
              <div><div style={{ textAlign: 'center', marginBottom: 12 }}><p style={{ fontSize: 32, fontWeight: 700, color: getWellbeingColor(latestAssessment.overallLevel).text, margin: 0 }}>{latestAssessment.overallLevel}</p><p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Overall Level</p></div>
              <p style={{ fontSize: 12, textAlign: 'center', color: 'var(--text-secondary)' }}>Primary: {latestAssessment.primaryConcern}</p>
              <p style={{ fontSize: 10, textAlign: 'center', marginTop: 8, color: 'var(--text-muted)' }}>{new Date(latestAssessment.dateCompleted).toLocaleDateString()}</p></div>
            ) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontSize: 13 }}>Take your first self‑assessment</p>}
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Upcoming Sessions</h3>
            {upcomingSessions.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontSize: 13 }}>No upcoming sessions</p> :
              <div>{upcomingSessions.map(s => (<div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}><div><p style={{ fontWeight: 600, margin: 0, fontSize: 13, color: 'var(--text-primary)' }}>{s.professional?.professionalFullName || 'Professional'}</p><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{s.formattedDate}</p></div><span style={{ background: s.status==='Confirmed'?'var(--success-bg)':'var(--warning-bg)', color: s.status==='Confirmed'?'var(--success-text)':'var(--warning-text)', padding: '2px 8px', borderRadius: 12, fontSize: 10 }}>{s.status}</span></div>))}</div>}
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
