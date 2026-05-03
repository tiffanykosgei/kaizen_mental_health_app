import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../api/axios';

const PINK   = '#e91e8c';
const PURPLE = '#9c27b0';

const levelColors = {
  Good:     { bg: '#d1fae5', text: '#065f46', icon: '😊' },
  Mild:     { bg: '#fef3c7', text: '#92400e', icon: '😐' },
  Moderate: { bg: '#fed7aa', text: '#9a3412', icon: '😟' },
  Severe:   { bg: '#fee2e2', text: '#dc2626', icon: '😰' },
};

export default function ProfessionalAssessmentHistory() {
  const navigate  = useNavigate();
  const { clientId } = useParams();

  const [client,      setClient]      = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => { 
    console.log('ProfessionalAssessmentHistory mounted. clientId from URL:', clientId);
    
    if (clientId) {
      console.log('Fetching assessments for client ID:', clientId);
      fetchClientAssessments();
    } else {
      console.error('No clientId provided in URL params');
      setError('Invalid client ID. Please go back and try again.');
      setLoading(false);
    }
  }, [clientId]);

  const fetchClientAssessments = async () => {
    setLoading(true);
    setError('');
    try {
      console.log(`Fetching assessments from: /selfassessment/client/${clientId}/history`);
      
      const response = await API.get(`/selfassessment/client/${clientId}/history`);
      console.log('Assessment history API response:', response.data);
      
      if (response.data) {
        setClient(response.data.client);
        const assessmentsData = Array.isArray(response.data.assessments) ? response.data.assessments : [];
        setAssessments(assessmentsData);
        console.log(`Loaded ${assessmentsData.length} assessments for client`);
      } else {
        console.warn('Empty response data');
        setAssessments([]);
      }
    } catch (err) {
      console.error('Failed to fetch client assessments:', err);
      console.error('Error details:', err.response?.data);
      
      const status = err.response?.status;
      const message = err.response?.data?.message || err.response?.data || err.message;
      
      if (status === 403) {
        setError('You can only view assessments for clients who have booked sessions with you.');
      } else if (status === 404) {
        setError('Client not found or no assessments available.');
      } else if (status === 401) {
        setError('Please log in again to continue.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(message || 'Could not load client assessment history. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getScoreTrend = (current, previous) => {
    if (previous == null) return null;
    const diff = current - previous;
    if (diff < 0) return { text: 'Improved', color: '#065f46', icon: '📉' };
    if (diff > 0) return { text: 'Declined', color: '#dc2626', icon: '📈' };
    return { text: 'Stable', color: '#6b7280', icon: '➡️' };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 50, height: 50, border: `3px solid var(--border)`, borderTopColor: PINK, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading client assessment history...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: 24, borderRadius: 16, border: '1px solid #fecaca' }}>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>⚠️</span>
          <p style={{ marginBottom: 16, fontSize: 14 }}>{error}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={fetchClientAssessments}
              style={{ padding: '10px 24px', background: PINK, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/sessions')}
              style={{ padding: '10px 24px', background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
            >
              Back to Sessions
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 48, textAlign: 'center' }}>
          <span style={{ fontSize: 64, display: 'block', marginBottom: 16 }}>📊</span>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>No Assessments Yet</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
            {client?.firstName || client?.name || 'This client'} hasn't completed any assessments yet.
          </p>
          <button
            onClick={() => navigate('/sessions')}
            style={{ padding: '12px 28px', background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  const avgScore = (assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length).toFixed(1);
  const clientName = client?.firstName || client?.name || 'Client';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Client Assessment History
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
              {clientName}
              {client?.email && <span style={{ marginLeft: 8, opacity: 0.7 }}>· {client.email}</span>}
            </p>
          </div>
          <button
            onClick={() => navigate('/sessions')}
            style={{ background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', borderRadius: 10 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = PINK; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PINK; }}
          >
            ← Back to Sessions
          </button>
        </div>
        <div style={{ height: 3, width: 60, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, marginTop: 16, borderRadius: 3 }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Assessments', value: assessments.length, color: 'var(--text-primary)' },
          { label: 'Latest Score', value: `${assessments[0].overallScore}/5`, color: 'var(--text-primary)' },
          { label: 'Average Score', value: `${avgScore}/5`, color: '#065f46' }
        ].map((card) => (
          <div key={card.label} style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{card.label}</p>
            <p style={{ fontSize: 32, fontWeight: 700, color: card.color, margin: 0 }}>{card.value}</p>
          </div>
        ))}
      </div>

      {assessments.length >= 2 && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 24, marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>📈 Progress Over Time</h3>
          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '20px 0 0' }}>
            {[...assessments].reverse().map((a) => (
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
                {['Date', 'Overall', 'Anxiety', 'Depression', 'Loneliness', 'Level', 'Trend'].map((h) => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Date' ? 'left' : 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assessments.map((a, idx) => {
                const isLatest = idx === 0;
                const prev = assessments[idx + 1];
                const trend = getScoreTrend(a.overallScore, prev?.overallScore);
                const lc = levelColors[a.overallLevel] || { bg: 'var(--bg-secondary)', text: 'var(--text-muted)', icon: '📊' };

                return (
                  <tr
                    key={a.id}
                    style={{ borderBottom: '1px solid var(--border)', background: isLatest ? 'var(--bg-secondary)' : 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = isLatest ? 'var(--bg-secondary)' : 'transparent'; }}
                  >
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
                        {lc.icon} {a.overallLevel || 'N/A'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {trend && (
                        <span style={{ fontSize: 12, color: trend.color, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                          {trend.icon} {trend.text}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {assessments.length >= 2 && (() => {
          const latest = assessments[0];
          const prev = assessments[1];
          const improved = latest.overallScore < prev.overallScore;
          const declined = latest.overallScore > prev.overallScore;
          const bg = improved ? '#d1fae5' : declined ? '#fee2e2' : 'var(--bg-secondary)';
          const color = improved ? '#065f46' : declined ? '#dc2626' : 'var(--text-muted)';
          const icon = improved ? '🎉' : declined ? '📉' : '➡️';
          const text = improved ? 'improved' : declined ? 'declined' : 'remained the same';
          const extra = improved
            ? ' This is positive progress! 🌟'
            : declined
              ? ` Consider checking in with ${clientName} to offer additional support. 💪`
              : '';

          return (
            <div style={{ marginTop: 24, padding: 16, background: bg, borderRadius: 12 }}>
              <p style={{ fontSize: 13, color: color, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {icon} <strong>Progress Summary:</strong>&nbsp;
                {clientName}'s overall wellbeing has {text} since their last assessment.{extra}
              </p>
            </div>
          );
        })()}

        {/* Clinical Notes Section - Without action buttons */}
        <div style={{ marginTop: 24, padding: 20, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>📝 Clinical Notes</h4>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 0, lineHeight: 1.6 }}>
            Based on {assessments.length} assessment{assessments.length !== 1 ? 's' : ''}, {clientName} has shown{' '}
            {assessments.length > 1 && assessments[0].overallScore < assessments[1].overallScore
              ? 'improvement'
              : assessments.length > 1 && assessments[0].overallScore > assessments[1].overallScore
                ? 'some challenges'
                : 'stable results'} in their mental wellbeing.
            {assessments[0]?.primaryConcern && (
              <span> Their primary area of concern is <strong>{assessments[0].primaryConcern}</strong>.</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}