import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function ProfessionalSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await API.get('/session/my-sessions');
      // Normalize casing — backend may return Pascal or camel case
      const normalized = response.data.map(s => ({
        id: s.id ?? s.Id,
        sessionDate: s.sessionDate ?? s.SessionDate,
        formattedDate: s.formattedDate ?? s.FormattedDate,
        status: s.status ?? s.Status,
        paymentStatus: s.paymentStatus ?? s.PaymentStatus,
        amount: s.amount ?? s.Amount,
        notes: s.notes ?? s.Notes,
        createdAt: s.createdAt ?? s.CreatedAt,
        client: (() => {
          const c = s.client ?? s.Client;
          if (!c) return null;
          return {
            id: c.id ?? c.Id,
            fullName: c.fullName ?? c.FullName,
            email: c.email ?? c.Email
          };
        })()
      }));
      setSessions(normalized);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Could not load sessions.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (sessionId, newStatus) => {
    setUpdatingId(sessionId);
    setError('');
    setSuccess('');
    try {
      await API.put(`/session/${sessionId}/status`, { status: newStatus });
      setSuccess(`Session ${newStatus.toLowerCase()} successfully.`);
      fetchSessions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data ?? 'Update failed.';
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return { bg: '#E1F5EE', color: '#085041' };
      case 'Pending':   return { bg: '#FAEEDA', color: '#633806' };
      case 'Completed': return { bg: '#EAF3DE', color: '#27500A' };
      case 'Cancelled': return { bg: '#FCEBEB', color: '#791F1F' };
      default:          return { bg: '#F1EFE8', color: '#444441' };
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid':    return { bg: '#E1F5EE', color: '#085041' };
      case 'Pending': return { bg: '#FAEEDA', color: '#633806' };
      case 'Failed':  return { bg: '#FCEBEB', color: '#791F1F' };
      default:        return { bg: '#F1EFE8', color: '#444441' };
    }
  };

  const pendingSessions  = sessions.filter(s => s.status === 'Pending');
  const upcomingSessions = sessions.filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date());
  const pastSessions     = sessions.filter(s => s.status === 'Completed' || (s.status === 'Confirmed' && new Date(s.sessionDate) <= new Date()));

  const SessionCard = ({ session, showActions = false, showComplete = false }) => {
    const statusStyle  = getStatusColor(session.status);
    const paymentStyle = getPaymentStatusColor(session.paymentStatus);
    return (
      <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0', marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a202c' }}>
              {session.client?.fullName || 'Client'}
            </h3>
            <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
              {session.client?.email || ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color, fontWeight: 500 }}>
              {session.status}
            </span>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: paymentStyle.bg, color: paymentStyle.color, fontWeight: 500 }}>
              {session.paymentStatus}
            </span>
          </div>
        </div>

        <p style={{ fontSize: 14, color: '#1a202c', marginBottom: 8 }}>
          Date: {session.formattedDate || formatDate(session.sessionDate)}
        </p>
        <p style={{ fontSize: 14, color: '#1a202c', marginBottom: 12 }}>
          Amount: KSh {session.amount?.toLocaleString()}
        </p>

        {session.notes && (
          <p style={{ fontSize: 13, color: '#718096', marginBottom: 12, fontStyle: 'italic' }}>
            "{session.notes}"
          </p>
        )}

        {showActions && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              onClick={() => handleStatusUpdate(session.id, 'Confirmed')}
              disabled={updatingId === session.id}
              style={{ background: '#E1F5EE', color: '#085041', border: '1px solid #1D9E75', width: 'auto', padding: '8px 16px', fontSize: 13, borderRadius: 8, cursor: 'pointer' }}
            >
              {updatingId === session.id ? 'Confirming...' : 'Confirm'}
            </button>
            <button
              onClick={() => handleStatusUpdate(session.id, 'Cancelled')}
              disabled={updatingId === session.id}
              style={{ background: '#FCEBEB', color: '#791F1F', border: '1px solid #F09595', width: 'auto', padding: '8px 16px', fontSize: 13, borderRadius: 8, cursor: 'pointer' }}
            >
              {updatingId === session.id ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        )}

        {showComplete && (
          <button
            onClick={() => handleStatusUpdate(session.id, 'Completed')}
            disabled={updatingId === session.id}
            style={{ background: '#EAF3DE', color: '#27500A', border: '1px solid #4A7C2C', width: 'auto', padding: '8px 16px', fontSize: 13, borderRadius: 8, cursor: 'pointer', marginTop: 16 }}
          >
            {updatingId === session.id ? 'Updating...' : 'Mark as Completed'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#f0f4f8' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: '#1a202c' }}>My Sessions</h2>
            <p style={{ color: '#718096', fontSize: 14, marginTop: 4 }}>Manage your client appointments</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff', width: 'auto', padding: '8px 16px', fontSize: 13, borderRadius: 8, cursor: 'pointer' }}
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#E1F5EE', color: '#085041', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {success}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#718096' }}>
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: '48px 24px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#1a202c' }}>No sessions yet</h3>
            <p style={{ color: '#718096' }}>Clients will appear here when they book sessions with you.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {pendingSessions.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: '#633806', marginBottom: 12 }}>
                  Pending Requests ({pendingSessions.length})
                </h3>
                {pendingSessions.map(session => (
                  <SessionCard key={session.id} session={session} showActions={true} />
                ))}
              </div>
            )}

            {upcomingSessions.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: '#085041', marginBottom: 12 }}>
                  Upcoming Sessions ({upcomingSessions.length})
                </h3>
                {upcomingSessions.map(session => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            )}

            {pastSessions.length > 0 && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 500, color: '#718096', marginBottom: 12 }}>
                  Past Sessions ({pastSessions.length})
                </h3>
                {pastSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    showComplete={session.status === 'Confirmed' && new Date(session.sessionDate) <= new Date()}
                  />
                ))}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}