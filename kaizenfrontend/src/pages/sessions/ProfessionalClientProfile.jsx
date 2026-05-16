import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../api/axios';

const PINK   = '#e91e8c';
const PURPLE = '#9c27b0';

const levelColors = {
  Good:     { bg: '#d1fae5', text: '#065f46', icon: '😊' },
  Mild:     { bg: '#fef3c7', text: '#92400e', icon: '😐' },
  Moderate: { bg: '#fed7aa', text: '#9a3412', icon: '😟' },
  Severe:   { bg: '#fee2e2', text: '#dc2626', icon: '😰' },
};

export default function ProfessionalClientProfile() {
  const navigate = useNavigate();
  const { clientId } = useParams();

  const [client, setClient] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientId) {
      setError('Invalid client ID.');
      setLoading(false);
      return;
    }
    fetchClientData();
    fetchClientAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const fetchClientData = async () => {
    try {
      // Endpoint: GET /professional/client/:clientId
      const response = await API.get(`/professional/client/${clientId}`);
      setClient(response.data);
    } catch (err) {
      console.error('Error fetching client data:', err);
      setError('Could not load client information.');
    }
  };

  const fetchClientAssessments = async () => {
    try {
      const response = await API.get(`/selfassessment/client/${clientId}/history`);
      if (response.data) {
        const assessmentsData = Array.isArray(response.data.assessments) ? response.data.assessments : [];
        setAssessments(assessmentsData);
        // If the API doesn't return client info, keep the one from fetchClientData
        if (response.data.client) {
          setClient(prev => prev ? { ...response.data.client, ...prev } : response.data.client);
        }
      }
    } catch (err) {
      console.error('Error fetching assessments:', err);
      // Don't overwrite client error; just log
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
          <p style={{ color: 'var(--text-secondary)' }}>Loading client profile...</p>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: 24, borderRadius: 16, border: '1px solid #fecaca' }}>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>⚠️</span>
          <p style={{ marginBottom: 16, fontSize: 14 }}>{error}</p>
          <button
            onClick={() => navigate('/sessions')}
            style={{ padding: '10px 24px', background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500 }}
          >
            Back to Sessions
          </button>
        </div>
      </div>
    );
  }

  const clientName = client?.firstName && client?.lastName 
    ? `${client.firstName} ${client.lastName}` 
    : client?.fullName || client?.name || 'Client';
  const clientEmail = client?.email || client?.Email || '';
  const clientPhone = client?.phoneNumber || client?.PhoneNumber || '';
  const clientRegisteredDate = client?.dateRegistered || client?.DateRegistered || '';
  const emergencyContactName = client?.emergencyContactName
    || client?.EmergencyContactName
    || client?.emergencyContact
    || client?.EmergencyContact
    || client?.clientProfile?.emergencyContact
    || client?.clientProfile?.emergencyContactName
    || '';
  const emergencyContactPhone = client?.emergencyContactPhone
    || client?.EmergencyContactPhone
    || client?.clientProfile?.emergencyContactPhone
    || '';
  const emergencyContactEmail = client?.emergencyContactEmail
    || client?.EmergencyContactEmail
    || client?.clientProfile?.emergencyContactEmail
    || '';
  const infoItems = [
    { label: 'Full Name', value: clientName },
    { label: 'Email', value: clientEmail },
    { label: 'Phone', value: clientPhone },
    {
      label: 'Member Since',
      value: clientRegisteredDate ? formatDate(clientRegisteredDate).split(',')[0] : ''
    }
  ].filter(item => item.value);
  const emergencyItems = [
    { label: 'Name', value: emergencyContactName },
    { label: 'Phone', value: emergencyContactPhone },
    { label: 'Email', value: emergencyContactEmail }
  ];
  const hasEmergencyContact = emergencyItems.some(item => item.value);

  const hasAssessments = assessments.length > 0;
  const avgScore = hasAssessments 
    ? (assessments.reduce((sum, a) => sum + a.overallScore, 0) / assessments.length).toFixed(1)
    : null;
  const latestScore = hasAssessments ? assessments[0].overallScore : null;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Client Profile
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

      {/* Client Information Card (including emergency contact) */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: 28,
        marginBottom: 28,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
          📋 Client Information
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {infoItems.map(item => (
            <div key={item.label}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
              <p style={{ fontSize: item.label === 'Full Name' ? 15 : 14, fontWeight: item.label === 'Full Name' ? 500 : 400, margin: '4px 0 0', color: 'var(--text-primary)' }}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Emergency Contact Section */}
        {hasEmergencyContact && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#e91e8c', display: 'flex', alignItems: 'center', gap: 8 }}>
              🚨 Emergency Contact
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {emergencyItems.map(item => (
                <div key={item.label}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: '4px 0 0', color: 'var(--text-primary)' }}>{item.value || 'Not provided'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Assessment History Section */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: 28,
        marginBottom: 28
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
          📊 Assessment History
        </h3>

        {!hasAssessments ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📋</span>
            <p style={{ color: 'var(--text-muted)' }}>No assessments completed yet.</p>
          </div>
        ) : (
          <>
            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Assessments', value: assessments.length },
                { label: 'Latest Score', value: `${latestScore}/5` },
                { label: 'Average Score', value: `${avgScore}/5` }
              ].map(card => (
                <div key={card.label} style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{card.label}</p>
                  <p style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Simple trend chart (if enough data) */}
            {assessments.length >= 2 && (
              <div style={{ marginBottom: 28 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Progress Trend</h4>
                <div style={{ height: 140, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '8px 0' }}>
                  {[...assessments].reverse().map(a => (
                    <div key={a.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: PINK }}>{a.overallScore}</span>
                      <div style={{ width: '100%', height: `${(a.overallScore / 5) * 100}%`, minHeight: 8, background: `linear-gradient(180deg, ${PINK}, ${PURPLE})`, borderRadius: '4px 4px 0 0' }} />
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                        {new Date(a.dateCompleted).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                    {['Date', 'Overall', 'Anxiety', 'Depression', 'Loneliness', 'Level', 'Trend'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Date' ? 'left' : 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assessments.map((a, idx) => {
                    const prev = assessments[idx + 1];
                    const trend = getScoreTrend(a.overallScore, prev?.overallScore);
                    const lc = levelColors[a.overallLevel] || { bg: 'var(--bg-secondary)', text: 'var(--text-muted)', icon: '📊' };
                    const isLatest = idx === 0;
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', background: isLatest ? 'var(--bg-hover)' : 'transparent' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>
                          {formatDate(a.dateCompleted)}
                          {isLatest && <span style={{ marginLeft: 8, padding: '2px 8px', background: PINK, color: 'white', borderRadius: 12, fontSize: 10 }}>Latest</span>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{a.overallScore}/5</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{a.anxietyScore}/5</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{a.depressionScore}/5</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13 }}>{a.lonelinessScore}/5</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, background: lc.bg, color: lc.text }}>
                            {lc.icon} {a.overallLevel || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {trend && <span style={{ fontSize: 12, color: trend.color }}>{trend.icon} {trend.text}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Clinical insight summary */}
            {assessments.length >= 2 && (() => {
              const latest = assessments[0];
              const prev = assessments[1];
              const improved = latest.overallScore < prev.overallScore;
              const declined = latest.overallScore > prev.overallScore;
              return (
                <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    <strong>📌 Clinical Note:</strong> {clientName}'s wellbeing has{' '}
                    {improved ? 'improved' : declined ? 'declined' : 'remained stable'} since their last assessment.
                    {improved && ' Positive trend! 🌟'}
                    {declined && ' Consider checking in to offer support.'}
                  </p>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
