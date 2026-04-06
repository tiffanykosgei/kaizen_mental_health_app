import { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    uniqueUsers: 0,
    averageAnxiety: 0,
    averageDepression: 0,
    averageLoneliness: 0,
    averageOverall: 0,
    levelDistribution: {
      Good: 0,
      Mild: 0,
      Moderate: 0,
      Severe: 0
    },
    primaryConcerns: {
      Anxiety: 0,
      Depression: 0,
      Loneliness: 0
    }
  });

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      // Updated endpoint to match your backend
      const response = await API.get('/Admin/assessments');
      const allAssessments = response.data;
      setAssessments(allAssessments);
      
      const total = allAssessments.length;
      const uniqueUsers = new Set(allAssessments.map(a => a.userId)).size;
      
      let sumAnxiety = 0, sumDepression = 0, sumLoneliness = 0, sumOverall = 0;
      let levelCounts = { Good: 0, Mild: 0, Moderate: 0, Severe: 0 };
      let concernCounts = { Anxiety: 0, Depression: 0, Loneliness: 0 };
      
      allAssessments.forEach(a => {
        sumAnxiety += a.anxietyScore;
        sumDepression += a.depressionScore;
        sumLoneliness += a.lonelinessScore;
        sumOverall += a.overallScore;
        
        if (a.overallLevel) levelCounts[a.overallLevel]++;
        if (a.primaryConcern) concernCounts[a.primaryConcern]++;
      });
      
      setStats({
        total,
        uniqueUsers,
        averageAnxiety: total > 0 ? (sumAnxiety / total).toFixed(2) : 0,
        averageDepression: total > 0 ? (sumDepression / total).toFixed(2) : 0,
        averageLoneliness: total > 0 ? (sumLoneliness / total).toFixed(2) : 0,
        averageOverall: total > 0 ? (sumOverall / total).toFixed(2) : 0,
        levelDistribution: levelCounts,
        primaryConcerns: concernCounts
      });
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
      setError('Could not load assessments.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLevelColor = (level) => {
    switch(level) {
      case 'Good':     return { bg: '#E1F5EE', color: '#085041' };
      case 'Mild':     return { bg: '#FAEEDA', color: '#633806' };
      case 'Moderate': return { bg: '#FAECE7', color: '#712B13' };
      case 'Severe':   return { bg: '#FCEBEB', color: '#791F1F' };
      default:         return { bg: '#F1EFE8', color: '#444441' };
    }
  };

  const getConcernStyle = (concern) => {
    switch(concern) {
      case 'Anxiety':
        return { bg: '#EEEDFE', color: '#3C3489', icon: '😰' };
      case 'Depression':
        return { bg: '#E1F5EE', color: '#085041', icon: '😔' };
      default:
        return { bg: '#FAECE7', color: '#712B13', icon: '🫂' };
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Loading assessment statistics...</div>;
  }

  if (error) {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>Assessment Statistics</h2>
        <p style={{ color: '#718096', marginBottom: 24 }}>System-wide mental health assessment data</p>
        <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '20px', borderRadius: 12, textAlign: 'center' }}>
          {error}
          <br />
          <button 
            onClick={fetchAssessments}
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
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>Assessment Statistics</h2>
      <p style={{ color: '#718096', marginBottom: 24 }}>System-wide mental health assessment data</p>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Total Assessments" value={stats.total} color="purple" icon="📊" />
        <StatsCard title="Unique Users" value={stats.uniqueUsers} color="green" icon="👥" />
        <StatsCard title="Avg Overall Score" value={stats.averageOverall} color="orange" icon="🎯" />
        <StatsCard title="Avg Anxiety" value={stats.averageAnxiety} color="red" icon="😰" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Avg Depression" value={stats.averageDepression} color="blue" icon="😔" />
        <StatsCard title="Avg Loneliness" value={stats.averageLoneliness} color="teal" icon="🫂" />
      </div>

      {/* Level Distribution */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Wellbeing Level Distribution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {Object.entries(stats.levelDistribution).map(([level, count]) => {
            const levelStyle = getLevelColor(level);
            const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
            return (
              <div key={level} style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 500,
                  background: levelStyle.bg,
                  color: levelStyle.color,
                  marginBottom: 12
                }}>
                  {level}
                </span>
                <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: '#1a202c' }}>{count}</p>
                <p style={{ fontSize: 12, color: '#718096', margin: 0 }}>{percentage}% of assessments</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Concerns */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Primary Areas of Concern</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {Object.entries(stats.primaryConcerns).map(([concern, count]) => {
            const style = getConcernStyle(concern);
            const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
            return (
              <div key={concern} style={{ background: 'white', borderRadius: 12, padding: 16, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <span style={{ fontSize: 32 }}>{style.icon}</span>
                <h4 style={{ fontSize: 16, fontWeight: 600, margin: '8px 0 4px', color: '#1a202c' }}>{concern}</h4>
                <p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: style.color }}>{count}</p>
                <p style={{ fontSize: 12, color: '#718096', margin: 0 }}>{percentage}% of assessments</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Assessments Table */}
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Recent Assessments</h3>
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Anxiety</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Depression</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Loneliness</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Overall</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Level</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Primary Concern</th>
                </tr>
              </thead>
              <tbody>
                {assessments.slice(0, 20).map(assessment => {
                  const levelStyle = getLevelColor(assessment.overallLevel);
                  return (
                    <tr key={assessment.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a202c' }}>{formatDate(assessment.dateCompleted)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a202c' }}>{assessment.user?.fullName || `User ${assessment.userId}`}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500 }}>{assessment.anxietyScore}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500 }}>{assessment.depressionScore}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500 }}>{assessment.lonelinessScore}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{assessment.overallScore}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 500,
                          background: levelStyle.bg,
                          color: levelStyle.color
                        }}>
                          {assessment.overallLevel}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a202c' }}>{assessment.primaryConcern}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}