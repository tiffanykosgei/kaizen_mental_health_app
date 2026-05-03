import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const PINK   = '#e91e8c';
const PURPLE = '#9c27b0';

const levelColors = {
  Good:     { bg: '#d1fae5', text: '#065f46', icon: '😊' },
  Mild:     { bg: '#fef3c7', text: '#92400e', icon: '😐' },
  Moderate: { bg: '#fed7aa', text: '#9a3412', icon: '😟' },
  Severe:   { bg: '#fee2e2', text: '#dc2626', icon: '😰' },
};

export default function AssessmentHistory() {
  const navigate = useNavigate();
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => { fetchAssessmentHistory(); }, []);

  const fetchAssessmentHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.get('/selfassessment/my-history');
      setAssessmentHistory(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to fetch assessment history:', err);
      setError('Could not load assessment history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

  const getScoreChange = (current, previous) => {
    if (previous == null) return null;
    const diff = current - previous;
    if (diff < 0) return { text: `Improved by ${Math.abs(diff)}`, color: '#065f46', icon: '📉' };
    if (diff > 0) return { text: `Declined by ${diff}`,           color: '#dc2626', icon: '📈' };
    return             { text: 'No change',                                   color: '#6b7280', icon: '➡️' };
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 50, height: 50, border: `3px solid var(--border)`, borderTopColor: PINK, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Loading assessment history...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ background: '#fee2e2', color: '#dc2626', padding: 24, borderRadius: 16, border: '1px solid #fecaca' }}>
        <p style={{ marginBottom: 16 }}>{error}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={fetchAssessmentHistory}
            style={{ padding: '10px 24px', background: PINK, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            Try Again
          </button>
          <button onClick={() => navigate('/assessment')}
            style={{ padding: '10px 24px', background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            Take an Assessment
          </button>
        </div>
      </div>
    </div>
  );

  if (assessmentHistory.length === 0) return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 48 }}>
        <span style={{ fontSize: 64, display: 'block', marginBottom: 16 }}>📊</span>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No Assessment History Yet</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          You haven't completed any assessments. Take your first assessment to start tracking your wellbeing journey.
        </p>
        <button onClick={() => navigate('/assessment')}
          style={{ padding: '12px 28px', background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Take Your First Assessment
        </button>
      </div>
    </div>
  );

  const bestScore = Math.min(...assessmentHistory.map(a => a.overallScore));

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
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
            <button onClick={() => navigate('/assessment')}
              style={{ background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', borderRadius: 10 }}>
              + New Assessment
            </button>
            <button onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', borderRadius: 10 }}
              onMouseEnter={e => { e.currentTarget.style.background = PINK; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PINK; }}>
              ← Back to Dashboard
            </button>
          </div>
        </div>
        <div style={{ height: 3, width: 60, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, marginTop: 16, borderRadius: 3 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Assessments', value: assessmentHistory.length,             color: 'var(--text-primary)' },
          { label: 'Latest Score',      value: `${assessmentHistory[0].overallScore}/5`, color: 'var(--text-primary)' },
          { label: 'Best Score',        value: `${bestScore}/5`,                     color: '#065f46' }
        ].map(card => (
          <div key={card.label} style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{card.label}</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {assessmentHistory.length >= 2 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>📈 Progress Over Time</h3>
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '20px 0 0' }}>
            {[...assessmentHistory].reverse().map(a => (
              <div key={a.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: PINK }}>{a.overallScore}</span>
                <div style={{ width: '100%', height: `${(a.overallScore / 5) * 100}%`, minHeight: 12, background: `linear-gradient(180deg, ${PINK}, ${PURPLE})`, borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease' }} />
                <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                  {new Date(a.dateCompleted).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>📋 All Assessments</h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                {['Date', 'Overall', 'Anxiety', 'Depression', 'Loneliness', 'Level', 'Change'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Date' ? 'left' : 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessmentHistory.map((a, idx) => {
                const isLatest    = idx === 0;
                const prev        = assessmentHistory[idx + 1];
                const scoreChange = getScoreChange(a.overallScore, prev?.overallScore);
                const lc          = levelColors[a.overallLevel] ?? {};

                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', background: isLatest ? 'var(--bg-secondary)' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = isLatest ? 'var(--bg-secondary)' : 'transparent'}>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: isLatest ? 600 : 400 }}>
                      {formatDate(a.dateCompleted)}
                      {isLatest && (
                        <span style={{ marginLeft: 8, fontSize: 10, padding: '2px 8px', background: PINK, color: 'white', borderRadius: 12 }}>Latest</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{a.overallScore}/5</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>{a.anxietyScore}/5</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>{a.depressionScore}/5</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>{a.lonelinessScore}/5</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: lc.bg, color: lc.text, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        {lc.icon} {a.overallLevel}
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

        {assessmentHistory.length >= 2 && (() => {
          const latest = assessmentHistory[0];
          const prev   = assessmentHistory[1];
          const improved = latest.overallScore < prev.overallScore;
          const declined = latest.overallScore > prev.overallScore;
          const bg    = improved ? '#d1fae5' : declined ? '#fee2e2' : 'var(--bg-secondary)';
          const color = improved ? '#065f46' : declined ? '#dc2626' : 'var(--text-muted)';
          const icon  = improved ? '🎉' : declined ? '📉' : '➡️';
          const text  = improved ? 'improved' : declined ? 'declined' : 'remained the same';
          const extra = improved ? ' Keep up the great work! 🌟' : declined ? ' Remember, reaching out for support is a sign of strength. 💪' : '';

          return (
            <div style={{ marginTop: 24, padding: 16, background: bg, borderRadius: 12 }}>
              <p style={{ fontSize: 13, color, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {icon} <strong>Progress Summary:</strong>&nbsp;Your overall wellbeing has {text} since your last assessment.{extra}
              </p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}