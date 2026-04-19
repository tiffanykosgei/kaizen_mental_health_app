// src/pages/AssessmentHistory.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const levelColors = {
  Good:     { bg: 'var(--success-bg)', text: 'var(--success-text)', icon: '😊' },
  Mild:     { bg: 'var(--warning-bg)', text: 'var(--warning-text)', icon: '😐' },
  Moderate: { bg: 'var(--warning-bg)', text: 'var(--warning-text)', icon: '😟' },
  Severe:   { bg: 'var(--error-bg)', text: 'var(--error-text)', icon: '😰' },
};

export default function AssessmentHistory() {
  const navigate = useNavigate();
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssessmentHistory();
  }, []);

  const fetchAssessmentHistory = async () => {
    setLoading(true);
    try {
      const response = await API.get('/selfassessment/history');
      setAssessmentHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch assessment history:', err);
      setError('Could not load assessment history.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreChange = (current, previous) => {
    if (!previous) return null;
    const diff = current - previous;
    if (diff < 0) return { text: `Improved by ${Math.abs(diff)} points`, color: 'var(--success-text)', icon: '📉' };
    if (diff > 0) return { text: `Declined by ${diff} points`, color: 'var(--error-text)', icon: '📈' };
    return { text: 'No change', color: 'var(--text-muted)', icon: '➡️' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 50, height: 50, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading assessment history...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '20px', borderRadius: 12 }}>
          <p>{error}</p>
          <button 
            onClick={() => navigate('/assessment')}
            style={{ marginTop: 16, width: 'auto', padding: '10px 24px' }}
          >
            Take an Assessment
          </button>
        </div>
      </div>
    );
  }

  if (assessmentHistory.length === 0) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: 48,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ fontSize: 64, display: 'block', marginBottom: 16 }}>📊</span>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            No Assessment History Yet
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            You haven't completed any assessments. Take your first assessment to start tracking your wellbeing journey.
          </p>
          <button 
            onClick={() => navigate('/assessment')}
            style={{ width: 'auto', padding: '12px 28px' }}
          >
            Take Your First Assessment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Assessment History
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
              Track your mental wellbeing progress over time
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => navigate('/assessment')}
              style={{
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: 10,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#5a52d5'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
            >
              + New Assessment
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                border: '1.5px solid var(--accent)',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: 10,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--accent)';
              }}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
        <div style={{ height: 3, width: 60, background: 'var(--gradient-primary)', marginTop: 16, borderRadius: 3 }} />
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 20,
          textAlign: 'center'
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Total Assessments</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{assessmentHistory.length}</p>
        </div>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 20,
          textAlign: 'center'
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Latest Score</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{assessmentHistory[0]?.overallScore}/5</p>
        </div>
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 20,
          textAlign: 'center'
        }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Best Score</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--success-text)', margin: 0 }}>
            {Math.min(...assessmentHistory.map(a => a.overallScore))}/5
          </p>
        </div>
      </div>

      {/* Progress Chart */}
      {assessmentHistory.length >= 2 && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: 24,
          marginBottom: 28,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
            📈 Progress Over Time
          </h3>
          <div style={{ height: 200, position: 'relative', padding: '20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: '100%' }}>
        {assessmentHistory.slice().reverse().map((assessment) => {
                const height = (assessment.overallScore / 5) * 100;
                return (
                  <div key={assessment.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: '100%',
                      height: `${height}%`,
                      background: 'var(--gradient-primary)',
                      borderRadius: 8,
                      transition: 'height 0.3s ease',
                      minHeight: 20
                    }} />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                      {new Date(assessment.dateCompleted).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* History Table */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: 24,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
          📋 All Assessments
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Overall</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Anxiety</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Depression</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Loneliness</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Level</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Change</th>
              </tr>
            </thead>
            <tbody>
              {assessmentHistory.map((assessment, index) => {
               // const date = new Date(assessment.dateCompleted);
                const isLatest = index === 0;
                const previousAssessment = assessmentHistory[index + 1];
                const scoreChange = getScoreChange(assessment.overallScore, previousAssessment?.overallScore);
                
                return (
                  <tr key={assessment.id} style={{ 
                    borderBottom: '1px solid var(--border)', 
                    background: isLatest ? 'var(--bg-secondary)' : 'transparent'
                  }}>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: isLatest ? 600 : 400 }}>
                      {formatDate(assessment.dateCompleted)}
                      {isLatest && (
                        <span style={{ 
                          marginLeft: 8, 
                          fontSize: 10, 
                          padding: '2px 8px', 
                          background: 'var(--accent)', 
                          color: 'white', 
                          borderRadius: 12 
                        }}>
                          Latest
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {assessment.overallScore}/5
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>
                      {assessment.anxietyScore}/5
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>
                      {assessment.depressionScore}/5
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>
                      {assessment.lonelinessScore}/5
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        background: levelColors[assessment.overallLevel]?.bg,
                        color: levelColors[assessment.overallLevel]?.text,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {levelColors[assessment.overallLevel]?.icon} {assessment.overallLevel}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {scoreChange && (
                        <span style={{ fontSize: 12, color: scoreChange.color, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          {scoreChange.icon} {scoreChange.text}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Progress Summary */}
        {assessmentHistory.length >= 2 && (
          <div style={{ 
            marginTop: 24, 
            padding: 16, 
            background: assessmentHistory[0].overallScore < assessmentHistory[1].overallScore ? 'var(--success-bg)' : 
                        assessmentHistory[0].overallScore > assessmentHistory[1].overallScore ? 'var(--error-bg)' : 'var(--bg-secondary)',
            borderRadius: 12
          }}>
            <p style={{ 
              fontSize: 13, 
              color: assessmentHistory[0].overallScore < assessmentHistory[1].overallScore ? 'var(--success-text)' : 
                     assessmentHistory[0].overallScore > assessmentHistory[1].overallScore ? 'var(--error-text)' : 'var(--text-muted)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {assessmentHistory[0].overallScore < assessmentHistory[1].overallScore ? '🎉' : 
               assessmentHistory[0].overallScore > assessmentHistory[1].overallScore ? '📉' : '➡️'}
              <strong>Progress Summary:</strong> Your overall wellbeing has {
                assessmentHistory[0].overallScore < assessmentHistory[1].overallScore ? 'improved' :
                assessmentHistory[0].overallScore > assessmentHistory[1].overallScore ? 'declined' : 'remained the same'
              } since your last assessment.
              {assessmentHistory[0].overallScore < assessmentHistory[1].overallScore && ' Keep up the great work! 🌟'}
              {assessmentHistory[0].overallScore > assessmentHistory[1].overallScore && ' Remember, reaching out for support is a sign of strength. 💪'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}