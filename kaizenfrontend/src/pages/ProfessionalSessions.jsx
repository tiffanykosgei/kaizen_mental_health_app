import { useState, useEffect } from 'react';
//import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import VideoCall from '../components/VideoCall';

export default function ProfessionalSessions() {
 // const navigate = useNavigate();
  const [sessions, setSessions]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [updatingId, setUpdatingId]   = useState(null);
  const [showVideoCall, setShowVideoCall]         = useState(false);
  const [selectedMeetingUrl, setSelectedMeetingUrl] = useState('');
  //const [selectedClientName, setSelectedClientName] = useState('');

  const firstName = localStorage.getItem('firstName') || '';
  const lastName  = localStorage.getItem('lastName')  || '';
  const myName    = `${firstName} ${lastName}`.trim() || 'Professional';

  useEffect(() => {
    fetchSessions();
  }, []);

  const isSessionActive = (sessionDateStr) => {
    const start    = new Date(sessionDateStr);
    const end      = new Date(start.getTime() + 60 * 60 * 1000);
    const joinFrom = new Date(start.getTime() - 10 * 60 * 1000);
    const now      = new Date();
    return now >= joinFrom && now <= end;
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await API.get('/session/my-sessions');
      const normalized = response.data.map(s => ({
        id:              s.id              ?? s.Id,
        sessionDate:     s.sessionDate     ?? s.SessionDate,
        formattedDate:   s.formattedDate   ?? s.FormattedDate,
        status:          s.status          ?? s.Status,
        paymentStatus:   s.paymentStatus   ?? s.PaymentStatus,
        amount:          s.amount          ?? s.Amount,
        notes:           s.notes           ?? s.Notes,
        createdAt:       s.createdAt       ?? s.CreatedAt,
        meetingUrl:      s.meetingUrl      ?? s.MeetingUrl,
        meetingRoomName: s.meetingRoomName ?? s.MeetingRoomName,
        client: (() => {
          const c = s.client ?? s.Client;
          if (!c) return null;
          return {
            id:        c.id        ?? c.Id,
            firstName: c.firstName ?? c.FirstName ?? '',
            lastName:  c.lastName  ?? c.LastName  ?? '',
            fullName:  c.fullName  ?? c.FullName  ?? `${c.firstName ?? c.FirstName ?? ''} ${c.lastName ?? c.LastName ?? ''}`,
            email:     c.email     ?? c.Email
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
      const response = await API.put(`/session/${sessionId}/status`, { status: newStatus });
      const meetingCreated = newStatus === 'Confirmed' && response.data?.meetingUrl;
      setSuccess(meetingCreated
        ? 'Session confirmed! Video meeting room has been created.'
        : `Session ${newStatus.toLowerCase()} successfully.`);
      fetchSessions();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data ?? 'Update failed.';
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const statusColor = (s) => ({
    Confirmed: { bg: '#E1F5EE', color: '#085041' },
    Pending:   { bg: '#FAEEDA', color: '#633806' },
    Completed: { bg: '#EAF3DE', color: '#27500A' },
    Cancelled: { bg: '#FCEBEB', color: '#791F1F' },
  }[s] || { bg: '#F1EFE8', color: '#444441' });

  const paymentColor = (s) => ({
    Paid:    { bg: '#E1F5EE', color: '#085041' },
    Pending: { bg: '#FAEEDA', color: '#633806' },
    Failed:  { bg: '#FCEBEB', color: '#791F1F' },
  }[s] || { bg: '#F1EFE8', color: '#444441' });

  const pendingSessions  = sessions.filter(s => s.status === 'Pending');
  const upcomingSessions = sessions.filter(s => s.status === 'Confirmed' && new Date(s.sessionDate) > new Date());
  const pastSessions     = sessions.filter(s =>
    s.status === 'Completed' ||
    (s.status === 'Confirmed' && new Date(s.sessionDate) <= new Date())
  );

  const SessionCard = ({ session, showActions = false, showComplete = false }) => {
    const ss = statusColor(session.status);
    const ps = paymentColor(session.paymentStatus);
    const hasMeetingUrl  = !!session.meetingUrl;
    const clientFirst    = session.client?.firstName || '';
    const clientLast     = session.client?.lastName  || '';
    const canJoinVideo   = session.status === 'Confirmed' && hasMeetingUrl;
    const active         = isSessionActive(session.sessionDate);

    return (
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1.5px solid var(--border)', marginBottom: 12 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              {clientFirst} {clientLast}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {session.client?.email || ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: ss.bg, color: ss.color, fontWeight: 500 }}>
              {session.status}
            </span>
            <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: ps.bg, color: ps.color, fontWeight: 500 }}>
              {session.paymentStatus}
            </span>
          </div>
        </div>

        <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>
          📅 {session.formattedDate || formatDate(session.sessionDate)}
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>
          💳 KSh {session.amount?.toLocaleString()}
        </p>

        {session.notes && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, fontStyle: 'italic' }}>
            "{session.notes}"
          </p>
        )}

        {/* Confirm / Cancel actions */}
        {showActions && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button onClick={() => handleStatusUpdate(session.id, 'Confirmed')} disabled={updatingId === session.id}
              style={{ background: '#E1F5EE', color: '#085041', border: '1px solid #1D9E75', width: 'auto', padding: '8px 16px', fontSize: 13, borderRadius: 8, cursor: 'pointer' }}>
              {updatingId === session.id ? 'Confirming...' : 'Confirm'}
            </button>
            <button onClick={() => handleStatusUpdate(session.id, 'Cancelled')} disabled={updatingId === session.id}
              style={{ background: '#FCEBEB', color: '#791F1F', border: '1px solid #F09595', width: 'auto', padding: '8px 16px', fontSize: 13, borderRadius: 8, cursor: 'pointer' }}>
              {updatingId === session.id ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        )}

        {/* Mark as completed */}
        {showComplete && (
          <button onClick={() => handleStatusUpdate(session.id, 'Completed')} disabled={updatingId === session.id}
            style={{ background: '#EAF3DE', color: '#27500A', border: '1px solid #4A7C2C', width: 'auto', padding: '8px 16px', fontSize: 13, borderRadius: 8, cursor: 'pointer', marginTop: 16 }}>
            {updatingId === session.id ? 'Updating...' : 'Mark as Completed'}
          </button>
        )}

        {/* Join Video Call — time-aware */}
        {canJoinVideo && (
          <button
            onClick={() => {
              if (!active) return;
              setSelectedMeetingUrl(session.meetingUrl);
              //setSelectedClientName(clientFirst);
              setShowVideoCall(true);
            }}
            disabled={!active}
            title={active ? 'Join session' : 'Opens 10 minutes before the session starts'}
            style={{
              background: active ? '#00c98d' : '#e2e8f0',
              color: active ? 'white' : 'var(--text-secondary)',
              border: 'none', borderRadius: 8,
              padding: '10px 16px', fontSize: 14, fontWeight: 500,
              cursor: active ? 'pointer' : 'not-allowed',
              width: '100%', marginTop: 16
            }}
          >
            {active
              ? `📹 Join Video Call with ${clientFirst}`
              : `📹 Join Call — opens 10 min before session`}
          </button>
        )}

        {/* Room being prepared */}
        {session.status === 'Confirmed' && !hasMeetingUrl && session.paymentStatus === 'Paid' && (
          <div style={{ background: '#FAEEDA', color: '#633806', padding: '8px 12px', borderRadius: 8, fontSize: 13, textAlign: 'center', marginTop: 12 }}>
            ⏳ Video room is being set up. Refresh in a moment.
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>My Sessions</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Manage your client appointments</p>
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
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
          Loading sessions...
        </div>
      ) : sessions.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', border: '1.5px solid var(--border)' }}>
          <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>No sessions yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Clients will appear here when they book sessions with you.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {pendingSessions.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 500, color: '#633806', marginBottom: 12 }}>
                Pending Requests ({pendingSessions.length})
              </h3>
              {pendingSessions.map(s => <SessionCard key={s.id} session={s} showActions />)}
            </div>
          )}

          {upcomingSessions.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 500, color: '#085041', marginBottom: 12 }}>
                Upcoming Sessions ({upcomingSessions.length})
              </h3>
              {upcomingSessions.map(s => <SessionCard key={s.id} session={s} />)}
            </div>
          )}

          {pastSessions.length > 0 && (
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Past Sessions ({pastSessions.length})
              </h3>
              {pastSessions.map(s => (
                <SessionCard key={s.id} session={s}
                  showComplete={s.status === 'Confirmed' && new Date(s.sessionDate) <= new Date()} />
              ))}
            </div>
          )}

        </div>
      )}

      {/* Video Call overlay */}
      {showVideoCall && selectedMeetingUrl && (
        <VideoCall
          roomUrl={selectedMeetingUrl}
          userName={myName}
          onLeave={() => {
            setShowVideoCall(false);
            setSelectedMeetingUrl('');
            //setSelectedClientName('');
            fetchSessions();
          }}
        />
      )}
    </div>
  );
}