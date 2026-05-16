import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import { LegalLinks } from '../../components/LegalConsent';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [revenueData, setRevenueData] = useState(null);
  
  const firstName = localStorage.getItem('firstName') || '';
  const fullName = localStorage.getItem('fullName') || '';
  const displayName = firstName.trim() || fullName.split(' ')[0].trim() || '';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const convertToProperEarnings = (value) => (value < 100 ? value * 150 : value);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, sessionsRes, revenueRes] = await Promise.all([
        API.get('/Admin/stats'),
        API.get('/Admin/sessions'),
        API.get('/Payment/platform-revenue')
      ]);
      setStats(statsRes.data);
      setRecentSessions(sessionsRes.data || []);
      const revenueDataRaw = revenueRes.data || {};
      setRevenueData({
        summary: {
          totalPlatformFees: convertToProperEarnings(revenueDataRaw.summary?.totalPlatformFees || 0),
          totalRevenue: convertToProperEarnings(revenueDataRaw.summary?.totalRevenue || 0)
        }
      });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const getSessionTrends = () => {
    const daysInWeek = [];
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));

    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + offset);
      daysInWeek.push({
        date,
        label: date.toLocaleDateString('en-KE', { weekday: 'short' }),
        tooltipLabel: date.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' })
      });
    }

    const sameDay = (left, right) =>
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate();

    const completed = daysInWeek.map(({ date }) => recentSessions.filter(s => {
      const sessionDate = new Date(s.sessionDate);
      return sameDay(sessionDate, date) && s.status === 'Completed';
    }).length);
    const pending = daysInWeek.map(({ date }) => recentSessions.filter(s => {
      const sessionDate = new Date(s.sessionDate);
      return sameDay(sessionDate, date) && s.status === 'Pending';
    }).length);
    const confirmed = daysInWeek.map(({ date }) => recentSessions.filter(s => {
      const sessionDate = new Date(s.sessionDate);
      return sameDay(sessionDate, date) && s.status === 'Confirmed';
    }).length);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return {
      labels: daysInWeek.map(d => d.label),
      tooltipLabels: daysInWeek.map(d => d.tooltipLabel),
      completed,
      pending,
      confirmed,
      rangeLabel: `${weekStart.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`
    };
  };

  const sessionTrends = getSessionTrends();

  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--text-primary)', usePointStyle: true } },
      tooltip: { callbacks: { title: (items) => sessionTrends.tooltipLabels[items[0].dataIndex] } }
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0, color: 'var(--text-secondary)' }, grid: { color: 'var(--border)' }, title: { display: true, text: 'Number of sessions', color: 'var(--text-muted)' } },
      x: { ticks: { color: 'var(--text-secondary)', maxRotation: 0, autoSkip: false }, grid: { color: 'var(--border)' }, title: { display: true, text: sessionTrends.rangeLabel, color: 'var(--text-muted)' } }
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading dashboard...</div>;

  const statCards = [
    { label: 'Total Users', value: (stats?.totalClients || 0) + (stats?.totalProfessionals || 0), detail: `${stats?.totalClients || 0} Clients · ${stats?.totalProfessionals || 0} Pros`, color: 'var(--accent)', path: '/admin/users' },
    { label: 'Total Sessions', value: stats?.totalSessions || 0, detail: `${stats?.sessions?.completed || 0} Completed`, color: 'var(--secondary)', path: '/admin/sessions' },
    { label: 'Total Revenue', value: `KES ${revenueData?.summary?.totalPlatformFees?.toLocaleString() || 0}`, detail: 'Platform Fees', color: 'var(--warning-text)', path: '/admin/revenue' },
    { label: 'Self Assessments', value: stats?.totalAssessments || 0, detail: 'Mental Health Check-ins', color: 'var(--info-text)', path: '/admin/assessments' }
  ];

  return (
    <>
      <div style={{ fontFamily: 'inherit', padding: '0 24px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Greeting Card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', borderRadius: 16, padding: '16px 24px', marginBottom: 20, border: '1px solid var(--border)' }}>
          <div><p style={{ fontSize: 12, color: 'var(--primary)', marginBottom: 4 }}>{getGreeting()}</p><h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{displayName ? `${getGreeting()}, ${displayName}!` : `${getGreeting()}!`}</h2><p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Platform overview</p></div>
          <div style={{ width: 60, height: 60, borderRadius: 12, overflow: 'hidden' }}><img src="/brain-wellness.jpeg" alt="Wellness" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} /></div>
        </div>

        {/* Stats Cards – clickable */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {statCards.map(card => (
            <div key={card.label} onClick={() => navigate(card.path)} style={{ background: 'var(--bg-card)', padding: '16px 12px', borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{card.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{card.detail}</p>
            </div>
          ))}
        </div>

        {/* Two charts side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>Sessions This Week</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Daily completed, confirmed, and pending sessions for {sessionTrends.rangeLabel}</p>
            <div style={{ height: 200 }}>
              <Line data={{ labels: sessionTrends.labels, datasets: [
                { label: 'Completed', data: sessionTrends.completed, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.12)', fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 },
                { label: 'Confirmed', data: sessionTrends.confirmed, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.10)', fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 },
                { label: 'Pending', data: sessionTrends.pending, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.12)', fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 }
              ] }} options={lineOptions} />
            </div>
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px', border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>Wellbeing Levels</h3>
            <div style={{ height: 200 }}>
              <Pie data={{ labels: ['Good', 'Mild', 'Moderate', 'Severe'], datasets: [{
                data: [stats?.assessmentsByLevel?.good||0, stats?.assessmentsByLevel?.mild||0, stats?.assessmentsByLevel?.moderate||0, stats?.assessmentsByLevel?.severe||0],
                backgroundColor: ['#16a34a', '#2563eb', '#f59e0b', '#dc2626'],
                hoverBackgroundColor: ['#15803d', '#1d4ed8', '#d97706', '#b91c1c'],
                borderColor: 'var(--bg-card)',
                borderWidth: 3
              }]}} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'var(--text-primary)' } } } }} />
            </div>
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
