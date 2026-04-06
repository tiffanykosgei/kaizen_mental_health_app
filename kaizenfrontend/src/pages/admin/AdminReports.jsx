import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

export default function AdminReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reportData, setReportData] = useState({
    assessments: [],
    sessions: [],
    users: [],
    revenue: []
  });

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      // Fetch all necessary data for reports
      const [assessmentsRes, sessionsRes, usersRes, revenueRes] = await Promise.all([
        API.get('/Admin/assessments'),
        API.get('/Session/all-sessions'),
        API.get('/Admin/users'),
        API.get('/Payment/professional-breakdown')
      ]);

      setReportData({
        assessments: assessmentsRes.data,
        sessions: sessionsRes.data,
        users: usersRes.data,
        revenue: revenueRes.data
      });
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      setError('Could not load report data. Please ensure all endpoints are available.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate assessment trends (last 7 days)
  const getAssessmentTrends = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }));
    }
    
    const counts = last7Days.map(day => {
      return reportData.assessments.filter(a => {
        const assessmentDate = new Date(a.dateCompleted).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
        return assessmentDate === day;
      }).length;
    });
    
    return { labels: last7Days, counts };
  };

  // Calculate session trends (last 7 days)
  const getSessionTrends = () => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      last7Days.push(date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }));
    }
    
    const booked = last7Days.map(day => {
      return reportData.sessions.filter(s => {
        const sessionDate = new Date(s.sessionDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
        return sessionDate === day;
      }).length;
    });
    
    const completed = last7Days.map(day => {
      return reportData.sessions.filter(s => {
        const sessionDate = new Date(s.sessionDate).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
        return sessionDate === day && s.status === 'Completed';
      }).length;
    });
    
    return { labels: last7Days, booked, completed };
  };

  // User distribution data for pie chart
  const getUserDistribution = () => {
    const clients = reportData.users.filter(u => u.role === 'Client').length;
    const professionals = reportData.users.filter(u => u.role === 'Professional').length;
    const admins = reportData.users.filter(u => u.role === 'Admin').length;
    
    return {
      labels: ['Clients', 'Professionals', 'Admins'],
      data: [clients, professionals, admins],
      colors: ['#6c63ff', '#1D9E75', '#EF9F27']
    };
  };

  // Assessment level distribution for pie chart
  const getLevelDistribution = () => {
    const levels = { Good: 0, Mild: 0, Moderate: 0, Severe: 0 };
    reportData.assessments.forEach(a => {
      if (a.overallLevel) levels[a.overallLevel]++;
    });
    
    return {
      labels: ['Good', 'Mild', 'Moderate', 'Severe'],
      data: [levels.Good, levels.Mild, levels.Moderate, levels.Severe],
      colors: ['#1D9E75', '#EF9F27', '#D85A30', '#791F1F']
    };
  };

  // Session status distribution
  const getSessionStatus = () => {
    const statuses = { Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0 };
    reportData.sessions.forEach(s => {
      if (s.status) statuses[s.status]++;
    });
    
    return {
      labels: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
      data: [statuses.Pending, statuses.Confirmed, statuses.Completed, statuses.Cancelled],
      colors: ['#EF9F27', '#6c63ff', '#1D9E75', '#791F1F']
    };
  };

  // Calculate totals
  const totalUsers = reportData.users.length;
  const totalAssessments = reportData.assessments.length;
  const totalSessions = reportData.sessions.length;
  const completedSessions = reportData.sessions.filter(s => s.status === 'Completed').length;
  const completionRate = totalSessions > 0 ? ((completedSessions / totalSessions) * 100).toFixed(1) : 0;

  const assessmentTrends = getAssessmentTrends();
  const sessionTrends = getSessionTrends();
  const userDistribution = getUserDistribution();
  const levelDistribution = getLevelDistribution();
  const sessionStatus = getSessionStatus();

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: false }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' }
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Loading reports...</div>;
  }

  if (error) {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>Reports & Analytics</h2>
        <p style={{ color: '#718096', marginBottom: 24 }}>Visual insights and platform analytics</p>
        <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '20px', borderRadius: 12, textAlign: 'center' }}>
          {error}
          <br />
          <button 
            onClick={fetchReportData}
            style={{ marginTop: 12, background: '#6c63ff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>Reports & Analytics</h2>
      <p style={{ color: '#718096', marginBottom: 24 }}>Visual insights and platform analytics</p>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Total Users" value={totalUsers} color="purple" icon="👥" />
        <StatsCard title="Total Assessments" value={totalAssessments} color="green" icon="📊" />
        <StatsCard title="Total Sessions" value={totalSessions} color="orange" icon="📅" />
        <StatsCard title="Completion Rate" value={`${completionRate}%`} color="blue" icon="✅" />
      </div>

      {/* Charts Row 1 - Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 32 }}>
        {/* Assessment Trends */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Assessment Trends (Last 7 Days)</h3>
          <div style={{ height: 300 }}>
            <Line 
              data={{
                labels: assessmentTrends.labels,
                datasets: [{
                  label: 'Assessments',
                  data: assessmentTrends.counts,
                  borderColor: '#6c63ff',
                  backgroundColor: 'rgba(108, 99, 255, 0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={lineOptions}
            />
          </div>
        </div>

        {/* Session Trends */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Session Trends (Last 7 Days)</h3>
          <div style={{ height: 300 }}>
            <Line 
              data={{
                labels: sessionTrends.labels,
                datasets: [
                  {
                    label: 'Booked',
                    data: sessionTrends.booked,
                    borderColor: '#6c63ff',
                    backgroundColor: 'rgba(108, 99, 255, 0.1)',
                    fill: true,
                    tension: 0.4
                  },
                  {
                    label: 'Completed',
                    data: sessionTrends.completed,
                    borderColor: '#1D9E75',
                    backgroundColor: 'rgba(29, 158, 117, 0.1)',
                    fill: true,
                    tension: 0.4
                  }
                ]
              }}
              options={lineOptions}
            />
          </div>
        </div>
      </div>

      {/* Charts Row 2 - Distributions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        {/* User Distribution */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>User Distribution</h3>
          <div style={{ height: 250 }}>
            <Pie 
              data={{
                labels: userDistribution.labels,
                datasets: [{
                  data: userDistribution.data,
                  backgroundColor: userDistribution.colors,
                  borderWidth: 0
                }]
              }}
              options={pieOptions}
            />
          </div>
        </div>

        {/* Assessment Level Distribution */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Wellbeing Levels</h3>
          <div style={{ height: 250 }}>
            <Pie 
              data={{
                labels: levelDistribution.labels,
                datasets: [{
                  data: levelDistribution.data,
                  backgroundColor: levelDistribution.colors,
                  borderWidth: 0
                }]
              }}
              options={pieOptions}
            />
          </div>
        </div>

        {/* Session Status Distribution */}
        <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Session Status</h3>
          <div style={{ height: 250 }}>
            <Pie 
              data={{
                labels: sessionStatus.labels,
                datasets: [{
                  data: sessionStatus.data,
                  backgroundColor: sessionStatus.colors,
                  borderWidth: 0
                }]
              }}
              options={pieOptions}
            />
          </div>
        </div>
      </div>

      {/* Key Insights Section */}
      <div style={{ background: 'linear-gradient(135deg, #f7f9fc, #ffffff)', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Key Insights</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div style={{ padding: 12, background: '#EEEDFE', borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: '#3C3489', marginBottom: 4 }}>Most Common Primary Concern</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#3C3489', margin: 0 }}>
              {reportData.assessments.reduce((max, a) => {
                const count = reportData.assessments.filter(x => x.primaryConcern === a.primaryConcern).length;
                return count > max.count ? { concern: a.primaryConcern, count } : max;
              }, { concern: 'None', count: 0 }).concern || 'N/A'}
            </p>
          </div>
          <div style={{ padding: 12, background: '#E1F5EE', borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: '#085041', marginBottom: 4 }}>Most Active Professional</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#085041', margin: 0 }}>
              {reportData.sessions.reduce((max, s) => {
                const count = reportData.sessions.filter(x => x.professional?.fullName === s.professional?.fullName).length;
                return count > max.count ? { name: s.professional?.fullName, count } : max;
              }, { name: 'N/A', count: 0 }).name}
            </p>
          </div>
          <div style={{ padding: 12, background: '#FAEEDA', borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: '#633806', marginBottom: 4 }}>Average Session Completion Rate</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#633806', margin: 0 }}>{completionRate}%</p>
          </div>
          <div style={{ padding: 12, background: '#FAECE7', borderRadius: 10 }}>
            <p style={{ fontSize: 13, color: '#712B13', marginBottom: 4 }}>Total Platform Revenue</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#712B13', margin: 0 }}>
              KSh {reportData.revenue.summary?.totalPlatformFees?.toLocaleString() || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}