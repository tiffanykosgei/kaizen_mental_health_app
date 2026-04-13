import { useState, useEffect } from 'react';
//import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import VideoCall from '../components/VideoCall';

export default function ClientSessions() {
  //const navigate = useNavigate();
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [mySessions, setMySessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('book');
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [selectedMeetingUrl, setSelectedMeetingUrl] = useState('');

  const firstName = localStorage.getItem('firstName') || 'Client';
  const lastName  = localStorage.getItem('lastName') || '';
  const fullName  = `${firstName} ${lastName}`.trim();

  useEffect(() => {
    fetchProfessionals();
    fetchMySessions();
  }, []);

  const isSessionActive = (sessionDateStr) => {
    const start    = new Date(sessionDateStr);
    const end      = new Date(start.getTime() + 60 * 60 * 1000);
    const joinFrom = new Date(start.getTime() - 10 * 60 * 1000);
    const now      = new Date();
    return now >= joinFrom && now <= end;
  };

  const fetchProfessionals = async () => {
    try {
      const response = await API.get('/session/professionals');
      const normalized = response.data.map(pro => ({
        id:        pro.id        ?? pro.Id,
        firstName: pro.firstName ?? pro.FirstName ?? '',
        lastName:  pro.lastName  ?? pro.LastName  ?? '',
        fullName:  pro.fullName  ?? pro.FullName  ??
                   `${pro.firstName ?? pro.FirstName ?? ''} ${pro.lastName ?? pro.LastName ?? ''}`,
        email:     pro.email     ?? pro.Email,
        profile: (pro.profile ?? pro.Profile) ? {
          bio:            (pro.profile ?? pro.Profile)?.bio            ?? (pro.profile ?? pro.Profile)?.Bio            ?? '',
          specialization: (pro.profile ?? pro.Profile)?.specialization ?? (pro.profile ?? pro.Profile)?.Specialization ?? ''
        } : null
      }));
      setProfessionals(normalized);
    } catch (err) {
      console.error('Failed to fetch professionals:', err);
      setError('Could not load professionals.');
    }
  };

  const fetchMySessions = async () => {
    try {
      const response = await API.get('/session/my-sessions');
      const normalized = response.data.map(s => ({
        id:            s.id            ?? s.Id,
        sessionDate:   s.sessionDate   ?? s.SessionDate,
        formattedDate: s.formattedDate ?? s.FormattedDate,
        status:        s.status        ?? s.Status,
        paymentStatus: s.paymentStatus ?? s.PaymentStatus,
        amount:        s.amount        ?? s.Amount,
        notes:         s.notes         ?? s.Notes,
        createdAt:     s.createdAt     ?? s.CreatedAt,
        meetingUrl:    s.meetingUrl    ?? s.MeetingUrl,
        professional: (s.professional ?? s.Professional) ? {
          id:             (s.professional ?? s.Professional)?.id             ?? (s.professional ?? s.Professional)?.Id,
          firstName:      (s.professional ?? s.Professional)?.firstName      ?? (s.professional ?? s.Professional)?.FirstName ?? '',
          lastName:       (s.professional ?? s.Professional)?.lastName       ?? (s.professional ?? s.Professional)?.LastName  ?? '',
          fullName:       (s.professional ?? s.Professional)?.fullName       ?? (s.professional ?? s.Professional)?.FullName,
          email:          (s.professional ?? s.Professional)?.email          ?? (s.professional ?? s.Professional)?.Email,
          specialization: (s.professional ?? s.Professional)?.specialization ?? (s.professional ?? s.Professional)?.Specialization,
          bio:            (s.professional ?? s.Professional)?.bio            ?? (s.professional ?? s.Professional)?.Bio,
        } : null
      }));
      setMySessions(normalized);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedProfessional || !selectedDate) return;
    setLoading(true);
    setError('');
    try {
      const response = await API.get(`/session/available/${selectedProfessional.id}?date=${selectedDate}`);
      const slots = response.data.availableSlots ?? response.data.AvailableSlots ?? [];
      const normalizedSlots = slots.map(slot => ({
        time:          slot.time          ?? slot.Time,
        formattedTime: slot.formattedTime ?? slot.FormattedTime
      }));
      setAvailableSlots(normalizedSlots);
      if (normalizedSlots.length === 0) {
        setError('No available slots for this date. Please try another date.');
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      const msg = err.response?.data?.message ?? err.response?.data ?? 'Could not load available time slots.';
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleProfessionalSelect = (professional) => {
    setSelectedProfessional(professional);
    setAvailableSlots([]);
    setSelectedDate('');
    setError('');
  };

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setAvailableSlots([]);
    setError('');
  };

  const handleBookSlot = async (slot) => {
    setBookingLoading(true);
    setError('');
    setSuccess('');
    try {
      await API.post('/session/book', {
        professionalId: selectedProfessional.id,
        sessionDate:    slot.time,
        notes:          ''
      });
      setSuccess('Session booked! Please proceed to payment in My Sessions.');
      await fetchMySessions();
      setSelectedProfessional(null);
      setSelectedDate('');
      setAvailableSlots([]);
      setTimeout(() => setActiveTab('my'), 2000);
    } catch (err) {
      console.error('Booking error:', err);
      const msg = err.response?.data?.message ?? err.response?.data ?? 'Booking failed. Please try again.';
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePayNow = async (sessionId) => {
    setPaymentLoading(sessionId);
    setError('');
    setSuccess('');
    try {
      const response = await API.post(`/payment/initiate/${sessionId}`);
      if (response.data.success) {
        setSuccess('Payment prompt sent to your phone! Enter your M-Pesa PIN to complete payment.');
        setTimeout(() => fetchMySessions(), 5000);
      } else {
        setError(response.data.message || 'Payment initiation failed. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      const msg = err.response?.data?.message ?? err.response?.data ?? 'Payment failed. Please try again.';
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setPaymentLoading(null);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    setDeleteLoading(sessionId);
    setError('');
    setSuccess('');
    try {
      await API.delete(`/session/${sessionId}`);
      setSuccess('Session cancelled successfully.');
      fetchMySessions();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.response?.data?.message || 'Failed to cancel session.');
    } finally {
      setDeleteLoading(null);
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

  const slotBtnBase = {
    background: 'white', border: '1.5px solid #6c63ff',
    padding: '14px 12px', borderRadius: 8, cursor: 'pointer',
    fontSize: 14, fontWeight: 500, color: '#3c3489',
    transition: 'all 0.15s', width: '100%'
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>Sessions</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Book and manage your therapy sessions
        </p>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {['book', 'my'].map(tab => (
          <button key={tab}
            onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
            style={{
              background: 'transparent', border: 'none', width: 'auto',
              padding: '10px 0', marginRight: 24, cursor: 'pointer', fontSize: 14,
              color: activeTab === tab ? '#e91e8c' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid #e91e8c' : '2px solid transparent',
              fontWeight: activeTab === tab ? 500 : 400
            }}
          >
            {tab === 'book' ? 'Book a Session' : `My Sessions (${mySessions.length})`}
          </button>
        ))}
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

      {/* ── BOOK TAB ── */}
      {activeTab === 'book' && (
        <div>
          {!selectedProfessional ? (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, color: 'var(--text-primary)' }}>
                1. Choose a Mental Health Professional
              </h3>
              {professionals.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No professionals available yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {professionals.map(pro => (
                    <div key={pro.id} onClick={() => handleProfessionalSelect(pro)}
                      style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', border: '1.5px solid var(--border)', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>
                            {pro.firstName} {pro.lastName}
                          </h4>
                          {pro.profile?.specialization && (
                            <p style={{ fontSize: 12, color: '#e91e8c', marginTop: 4 }}>{pro.profile.specialization}</p>
                          )}
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>KSh 10/session</span>
                      </div>
                      {pro.profile?.bio && (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12 }}>{pro.profile.bio}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <button onClick={() => { setSelectedProfessional(null); setSelectedDate(''); setAvailableSlots([]); setError(''); }}
                style={{ background: 'transparent', color: '#e91e8c', border: '1px solid #e91e8c', width: 'auto', padding: '6px 12px', fontSize: 12, marginBottom: 20, cursor: 'pointer', borderRadius: 8 }}>
                ← Back to Professionals
              </button>

              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1.5px solid var(--border)' }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>
                  {selectedProfessional.firstName} {selectedProfessional.lastName}
                </h3>
                {selectedProfessional.profile?.specialization && (
                  <p style={{ fontSize: 12, color: '#e91e8c', marginTop: 4 }}>{selectedProfessional.profile.specialization}</p>
                )}
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, color: 'var(--text-primary)' }}>2. Choose a Date</h3>
              <input type="date" value={selectedDate} onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', padding: '12px 16px', border: '1.5px solid var(--border)', borderRadius: 8, marginBottom: 20, fontSize: 15, color: 'var(--text-primary)', background: 'var(--bg-card)' }}
              />

              {selectedDate && (
                <>
                  <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, color: 'var(--text-primary)' }}>3. Choose a Time</h3>
                  {loading ? (
                    <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Loading available slots...</p>
                  ) : availableSlots.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1.5px solid var(--border)' }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Click below to load available time slots</p>
                      <button onClick={fetchAvailableSlots}
                        style={{ width: 'auto', padding: '10px 28px', cursor: 'pointer', background: '#e91e8c', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
                        Load Available Slots
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                        {availableSlots.map((slot, i) => (
                          <button key={i} onClick={() => handleBookSlot(slot)} disabled={bookingLoading}
                            style={{ ...slotBtnBase, opacity: bookingLoading ? 0.6 : 1, cursor: bookingLoading ? 'not-allowed' : 'pointer' }}
                            onMouseEnter={e => { if (!bookingLoading) { e.currentTarget.style.background = '#e91e8c'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#e91e8c'; }}}
                            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#3c3489'; e.currentTarget.style.borderColor = '#6c63ff'; }}>
                            {slot.formattedTime}
                          </button>
                        ))}
                      </div>
                      <button onClick={fetchAvailableSlots}
                        style={{ background: 'transparent', color: '#e91e8c', border: '1px solid #e91e8c', width: 'auto', padding: '6px 16px', fontSize: 12, cursor: 'pointer', borderRadius: 8 }}>
                        Refresh slots
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── MY SESSIONS TAB ── */}
      {activeTab === 'my' && (
        <div>
          {mySessions.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', border: '1.5px solid var(--border)' }}>
              <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>No sessions yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Book your first session with a professional</p>
              <button onClick={() => setActiveTab('book')}
                style={{ width: 'auto', padding: '10px 24px', cursor: 'pointer', background: '#e91e8c', color: 'white', border: 'none', borderRadius: 8, fontSize: 14 }}>
                Book a session
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mySessions.map(session => {
                const ss = statusColor(session.status);
                const ps = paymentColor(session.paymentStatus);
                const isPending   = session.paymentStatus === 'Pending';
                const isFailed    = session.paymentStatus === 'Failed';
                const isPaid      = session.paymentStatus === 'Paid';
                const isConfirmed = session.status === 'Confirmed';
                const hasMeetingUrl = !!session.meetingUrl;
                const isCancellable = session.status === 'Pending' && session.paymentStatus !== 'Paid';
                const active = isSessionActive(session.sessionDate);

                return (
                  <div key={session.id} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1.5px solid var(--border)' }}>

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                          {session.professional?.firstName} {session.professional?.lastName}
                        </h3>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                          {session.professional?.specialization || 'Mental Health Professional'}
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

                    {/* Pay Now */}
                    {isPending && (
                      <button onClick={() => handlePayNow(session.id)} disabled={paymentLoading === session.id}
                        style={{ background: '#e91e8c', color: 'white', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: paymentLoading === session.id ? 'not-allowed' : 'pointer', width: '100%', marginTop: 12, opacity: paymentLoading === session.id ? 0.6 : 1 }}>
                        {paymentLoading === session.id ? 'Processing...' : `Pay Now — KSh ${session.amount?.toLocaleString()}`}
                      </button>
                    )}

                    {/* Retry Payment */}
                    {isFailed && (
                      <button onClick={() => handlePayNow(session.id)} disabled={paymentLoading === session.id}
                        style={{ background: '#FCEBEB', color: '#791F1F', border: '1px solid #F09595', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: paymentLoading === session.id ? 'not-allowed' : 'pointer', width: '100%', marginTop: 12, opacity: paymentLoading === session.id ? 0.6 : 1 }}>
                        {paymentLoading === session.id ? 'Processing...' : 'Retry Payment'}
                      </button>
                    )}

                    {/* Payment confirmed badge */}
                    {isPaid && (
                      <div style={{ background: '#E1F5EE', color: '#085041', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, textAlign: 'center', marginTop: 12 }}>
                        ✓ Payment confirmed. Your session is secured.
                      </div>
                    )}

                    {/* Cancel */}
                    {isCancellable && (
                      <button onClick={() => handleDeleteSession(session.id)} disabled={deleteLoading === session.id}
                        style={{ background: '#FCEBEB', color: '#791F1F', border: '1px solid #F09595', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontWeight: 500, cursor: deleteLoading === session.id ? 'not-allowed' : 'pointer', width: '100%', marginTop: 12, opacity: deleteLoading === session.id ? 0.6 : 1 }}>
                        {deleteLoading === session.id ? 'Cancelling...' : 'Cancel Session'}
                      </button>
                    )}

                    {/* Join Video Call — time-aware */}
                    {isConfirmed && hasMeetingUrl && (
                      <button
                        onClick={() => {
                          if (!active) return;
                          setSelectedMeetingUrl(session.meetingUrl);
                          setShowVideoCall(true);
                        }}
                        disabled={!active}
                        title={active ? 'Join your session' : 'Opens 10 minutes before the session starts'}
                        style={{
                          background: active ? '#00c98d' : '#e2e8f0',
                          color: active ? 'white' : 'var(--text-secondary)',
                          border: 'none', borderRadius: 8,
                          padding: '10px 16px', fontSize: 14, fontWeight: 500,
                          cursor: active ? 'pointer' : 'not-allowed',
                          width: '100%', marginTop: 12
                        }}
                      >
                        {active ? '📹 Join Video Call' : '📹 Join Call — opens 10 min before session'}
                      </button>
                    )}

                    {/* Room being prepared */}
                    {isConfirmed && !hasMeetingUrl && isPaid && (
                      <div style={{ background: '#FAEEDA', color: '#633806', padding: '8px 12px', borderRadius: 8, fontSize: 13, textAlign: 'center', marginTop: 12 }}>
                        ⏳ Video room is being prepared. Refresh in a moment.
                      </div>
                    )}

                    {/* Waiting for confirmation */}
                    {!isConfirmed && session.status !== 'Cancelled' && session.status !== 'Completed' && (
                      <div style={{ background: '#FAEEDA', color: '#633806', padding: '8px 12px', borderRadius: 8, fontSize: 13, textAlign: 'center', marginTop: 12 }}>
                        ⏳ Waiting for the professional to confirm your session.
                      </div>
                    )}

                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
                      Booked on {session.createdAt}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Video Call overlay */}
      {showVideoCall && selectedMeetingUrl && (
        <VideoCall
          roomUrl={selectedMeetingUrl}
          userName={fullName || firstName}
          onLeave={() => {
            setShowVideoCall(false);
            setSelectedMeetingUrl('');
            fetchMySessions();
          }}
        />
      )}
    </div>
  );
}