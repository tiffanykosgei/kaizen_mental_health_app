import { useState, useEffect } from 'react';
import API from '../../api/axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';

// Register all plugins including Filler
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement, Filler);

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, sessionsRes, assessmentsRes, revenueRes] = await Promise.all([
        API.get('/Admin/stats'),
        API.get('/Admin/sessions'),
        API.get('/Admin/assessments'),
        API.get('/Payment/platform-revenue')
      ]);
      
      setStats(statsRes.data);
      setRecentSessions(sessionsRes.data.slice(0, 5));
      setRecentAssessments(assessmentsRes.data.slice(0, 5));
      setRevenueData(revenueRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSessionTrends = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }));
    }
    
    const completed = last7Days.map(day => {
      return recentSessions.filter(s => {
        const sessionDate = new Date(s.sessionDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
        return sessionDate === day && s.status === 'Completed';
      }).length;
    });
    
    const pending = last7Days.map(day => {
      return recentSessions.filter(s => {
        const sessionDate = new Date(s.sessionDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
        return sessionDate === day && s.status === 'Pending';
      }).length;
    });
    
    return { labels: last7Days, completed, pending };
  };

  const sessionTrends = getSessionTrends();

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--text-primary)', font: { family: 'inherit' } } },
    },
    scales: {
      y: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'var(--border)' } },
      x: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'var(--border)' } }
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
            Oversee the platform and ensure everything runs smoothly. Here's your platform overview.
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
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Total Users</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', margin: 0, fontFamily: 'inherit' }}>{stats?.totalClients + stats?.totalProfessionals || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>{stats?.totalClients || 0} Clients · {stats?.totalProfessionals || 0} Pros</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Total Sessions</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--secondary)', margin: 0, fontFamily: 'inherit' }}>{stats?.totalSessions || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>{stats?.sessions?.completed || 0} Completed</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Total Revenue</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning-text)', margin: 0, fontFamily: 'inherit' }}>KSh {revenueData?.summary?.totalPlatformFees?.toLocaleString() || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>Platform Fees</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Self Assessments</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--info-text)', margin: 0, fontFamily: 'inherit' }}>{stats?.totalAssessments || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>Mental Health Check-ins</p>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Session Trends (Last 7 Days)</h3>
          <div style={{ height: 250 }}>
            <Line 
              data={{
                labels: sessionTrends.labels,
                datasets: [
                  { label: 'Completed', data: sessionTrends.completed, borderColor: 'var(--secondary)', backgroundColor: 'rgba(29, 158, 117, 0.1)', fill: true, tension: 0.4 },
                  { label: 'Pending', data: sessionTrends.pending, borderColor: 'var(--warning-text)', backgroundColor: 'rgba(245, 158, 11, 0.1)', fill: true, tension: 0.4 }
                ]
              }}
              options={lineOptions}
            />
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Wellbeing Levels Distribution</h3>
          <div style={{ height: 250 }}>
            <Pie 
              data={{
                labels: ['Good', 'Mild', 'Moderate', 'Severe'],
                datasets: [{
                  data: [
                    stats?.assessmentsByLevel?.good || 0,
                    stats?.assessmentsByLevel?.mild || 0,
                    stats?.assessmentsByLevel?.moderate || 0,
                    stats?.assessmentsByLevel?.severe || 0
                  ],
                  backgroundColor: ['var(--secondary)', 'var(--warning-text)', 'var(--warning-text)', 'var(--error-text)'],
                  borderWidth: 0
                }]
              }}
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                  legend: { position: 'bottom', labels: { color: 'var(--text-primary)', font: { family: 'inherit' } } } 
                } 
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Recent Sessions</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, fontFamily: 'inherit' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>Client</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>Professional</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map(session => (
                  <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>{session.client?.clientName || 'N/A'}</td>
                    <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>{session.professional?.professionalName || 'N/A'}</td>
                    <td style={{ padding: '8px 0' }}>
                      <span style={{ 
                        background: session.status === 'Completed' ? 'var(--success-bg)' : session.status === 'Pending' ? 'var(--warning-bg)' : 'var(--info-bg)',
                        color: session.status === 'Completed' ? 'var(--success-text)' : session.status === 'Pending' ? 'var(--warning-text)' : 'var(--info-text)',
                        padding: '2px 8px', borderRadius: 12, fontSize: 11
                      }}>{session.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Recent Assessments</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, fontFamily: 'inherit' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>User</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>Overall Level</th>
                  <th style={{ textAlign: 'left', padding: '8px 0', color: 'var(--text-muted)' }}>Primary Concern</th>
                </tr>
              </thead>
              <tbody>
                {recentAssessments.map(assessment => (
                  <tr key={assessment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>{assessment.user?.userName || 'N/A'}</td>
                    <td style={{ padding: '8px 0' }}>
                      <span style={{ 
                        background: assessment.overallLevel === 'Good' ? 'var(--success-bg)' : assessment.overallLevel === 'Mild' ? 'var(--info-bg)' : assessment.overallLevel === 'Moderate' ? 'var(--warning-bg)' : 'var(--error-bg)',
                        color: assessment.overallLevel === 'Good' ? 'var(--success-text)' : assessment.overallLevel === 'Mild' ? 'var(--info-text)' : assessment.overallLevel === 'Moderate' ? 'var(--warning-text)' : 'var(--error-text)',
                        padding: '2px 8px', borderRadius: 12, fontSize: 11
                      }}>{assessment.overallLevel}</span>
                    </td>
                    <td style={{ padding: '8px 0', color: 'var(--text-primary)' }}>{assessment.primaryConcern || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Primary Concerns & Revenue Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Primary Concerns (All Assessments)</h3>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', margin: 0, fontFamily: 'inherit' }}>{stats?.primaryConcerns?.anxiety || 0}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit' }}>Anxiety</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', margin: 0, fontFamily: 'inherit' }}>{stats?.primaryConcerns?.depression || 0}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit' }}>Depression</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', margin: 0, fontFamily: 'inherit' }}>{stats?.primaryConcerns?.loneliness || 0}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit' }}>Loneliness</p>
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Revenue Summary</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Platform Fees:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit' }}>KSh {revenueData?.summary?.totalPlatformFees?.toLocaleString() || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'inherit' }}>Professional Earnings:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit' }}>KSh {revenueData?.summary?.totalProfessionalEarnings?.toLocaleString() || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Total Revenue:</span>
            <span style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'inherit' }}>KSh {revenueData?.summary?.totalRevenue?.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>

      {/* Quote Card */}
      <div className="dashboard-quote-card">
        <p className="dashboard-quote-label">Daily reminder</p>
        <p className="dashboard-quote-text">"A healthy mind is the foundation of a healthy life."</p>
        <p className="dashboard-quote-author">— Anonymous</p>
      </div>
    </div>
  );
}