import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function ClientSessions() {
  const navigate = useNavigate();
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [mySessions, setMySessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('book');

  useEffect(() => {
    fetchProfessionals();
    fetchMySessions();
  }, []);

  const fetchProfessionals = async () => {
    try {
      const response = await API.get('/session/professionals');
      const normalized = response.data.map(pro => ({
        id: pro.id ?? pro.Id,
        fullName: pro.fullName ?? pro.FullName,
        email: pro.email ?? pro.Email,
        profile: pro.profile ?? pro.Profile
          ? {
              bio: (pro.profile ?? pro.Profile)?.bio ?? (pro.profile ?? pro.Profile)?.Bio ?? '',
              specialization: (pro.profile ?? pro.Profile)?.specialization ?? (pro.profile ?? pro.Profile)?.Specialization ?? ''
            }
          : null
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
        id: s.id ?? s.Id,
        sessionDate: s.sessionDate ?? s.SessionDate,
        formattedDate: s.formattedDate ?? s.FormattedDate,
        status: s.status ?? s.Status,
        paymentStatus: s.paymentStatus ?? s.PaymentStatus,
        amount: s.amount ?? s.Amount,
        notes: s.notes ?? s.Notes,
        createdAt: s.createdAt ?? s.CreatedAt,
        professional: s.professional ?? s.Professional
          ? {
              id: (s.professional ?? s.Professional)?.id ?? (s.professional ?? s.Professional)?.Id,
              fullName: (s.professional ?? s.Professional)?.fullName ?? (s.professional ?? s.Professional)?.FullName,
              email: (s.professional ?? s.Professional)?.email ?? (s.professional ?? s.Professional)?.Email,
              specialization: (s.professional ?? s.Professional)?.specialization ?? (s.professional ?? s.Professional)?.Specialization,
              bio: (s.professional ?? s.Professional)?.bio ?? (s.professional ?? s.Professional)?.Bio,
            }
          : null
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
        time: slot.time ?? slot.Time,
        formattedTime: slot.formattedTime ?? slot.FormattedTime
      }));
      setAvailableSlots(normalizedSlots);
      if (normalizedSlots.length === 0) {
        setError('No available slots for this date. Please try another date.');
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      const errorMessage = err.response?.data?.message ?? err.response?.data ?? 'Could not load available time slots.';
      const errorText = typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage;
      setError(errorText);
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
        sessionDate: slot.time,
        notes: ''
      });
      
      setSuccess('Session booked successfully! Please proceed to payment.');
      await fetchMySessions();
      setSelectedProfessional(null);
      setSelectedDate('');
      setAvailableSlots([]);
      setTimeout(() => setActiveTab('my'), 2000);
    } catch (err) {
      console.error('Booking error:', err);
      const errorMessage = err.response?.data?.message ?? err.response?.data ?? 'Booking failed. Please try again.';
      const errorText = typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage;
      setError(errorText);
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
        setSuccess('Payment prompt sent to your phone! Please check your M-Pesa messages and enter your PIN to complete payment.');
        setTimeout(() => {
          fetchMySessions();
        }, 5000);
      } else {
        setError(response.data.message || 'Payment initiation failed. Please try again.');
      }
    } catch (err) {
      console.error('Payment error:', err);
      const errorMessage = err.response?.data?.message ?? err.response?.data ?? 'Payment failed. Please try again.';
      const errorText = typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage;
      setError(errorText);
    } finally {
      setPaymentLoading(null);
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

  const getPaymentStatusText = (status) => {
    switch (status) {
      case 'Paid':    return '✓ Payment Complete';
      case 'Pending': return '⏳ Awaiting Payment';
      case 'Failed':  return '✗ Payment Failed';
      default:        return 'Payment Required';
    }
  };

  const slotBtnBase = {
    background: 'white',
    border: '1.5px solid #6c63ff',
    padding: '14px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    color: '#3c3489',
    transition: 'all 0.15s',
    width: '100%'
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#f0f4f8' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: '#1a202c' }}>Sessions</h2>
            <p style={{ color: '#718096', fontSize: 14, marginTop: 4 }}>Book and manage your therapy sessions</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff', width: 'auto', padding: '8px 16px', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}
          >
            Back to Dashboard
          </button>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
          {['book', 'my'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
              style={{
                background: 'transparent',
                color: activeTab === tab ? '#6c63ff' : '#718096',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #6c63ff' : '2px solid transparent',
                padding: '8px 0',
                marginRight: 16,
                width: 'auto',
                cursor: 'pointer',
                fontSize: 14
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

        {activeTab === 'book' && (
          <div>
            {!selectedProfessional ? (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, color: '#1a202c' }}>
                  1. Choose a Mental Health Professional
                </h3>
                {professionals.length === 0 ? (
                  <p style={{ color: '#718096' }}>No professionals available yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {professionals.map(pro => (
                      <div
                        key={pro.id}
                        onClick={() => handleProfessionalSelect(pro)}
                        style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <h4 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: '#1a202c' }}>{pro.fullName}</h4>
                            {pro.profile?.specialization && (
                              <p style={{ fontSize: 12, color: '#6c63ff', marginTop: 4 }}>{pro.profile.specialization}</p>
                            )}
                          </div>
                          <span style={{ fontSize: 12, color: '#718096' }}>KSh 1,500/session</span>
                        </div>
                        {pro.profile?.bio && (
                          <p style={{ fontSize: 13, color: '#718096', marginTop: 12 }}>{pro.profile.bio}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <button
                  onClick={() => { setSelectedProfessional(null); setSelectedDate(''); setAvailableSlots([]); setError(''); }}
                  style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff', width: 'auto', padding: '6px 12px', fontSize: 12, marginBottom: 20, cursor: 'pointer', borderRadius: 8 }}
                >
                  ← Back to Professionals
                </button>

                <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: '#1a202c' }}>{selectedProfessional.fullName}</h3>
                  {selectedProfessional.profile?.specialization && (
                    <p style={{ fontSize: 12, color: '#6c63ff', marginTop: 4 }}>{selectedProfessional.profile.specialization}</p>
                  )}
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, color: '#1a202c' }}>2. Choose a Date</h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 20, fontSize: 15, color: '#1a202c' }}
                />

                {selectedDate && (
                  <>
                    <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 16, color: '#1a202c' }}>3. Choose a Time</h3>
                    {loading ? (
                      <p style={{ textAlign: 'center', padding: 20, color: '#718096' }}>Loading available slots...</p>
                    ) : availableSlots.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 20, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <p style={{ color: '#718096', marginBottom: 12 }}>Click below to load available time slots</p>
                        <button
                          onClick={fetchAvailableSlots}
                          style={{ width: 'auto', padding: '10px 28px', cursor: 'pointer', background: '#6c63ff', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500 }}
                        >
                          Load Available Slots
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                          {availableSlots.map((slot, index) => (
                            <button
                              key={index}
                              onClick={() => handleBookSlot(slot)}
                              disabled={bookingLoading}
                              style={{ ...slotBtnBase, opacity: bookingLoading ? 0.6 : 1, cursor: bookingLoading ? 'not-allowed' : 'pointer' }}
                              onMouseEnter={e => { if (!bookingLoading) { e.currentTarget.style.background = '#6c63ff'; e.currentTarget.style.color = 'white'; }}}
                              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#3c3489'; }}
                            >
                              {slot.formattedTime}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={fetchAvailableSlots}
                          style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff', width: 'auto', padding: '6px 16px', fontSize: 12, cursor: 'pointer', borderRadius: 8 }}
                        >
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

        {activeTab === 'my' && (
          <div>
            {mySessions.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 12, padding: '48px 24px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: 18, marginBottom: 8, color: '#1a202c' }}>No sessions yet</h3>
                <p style={{ color: '#718096', marginBottom: 20 }}>Book your first session with a professional</p>
                <button
                  onClick={() => setActiveTab('book')}
                  style={{ width: 'auto', padding: '10px 24px', cursor: 'pointer', background: '#6c63ff', color: 'white', border: 'none', borderRadius: 8, fontSize: 14 }}
                >
                  Book a session
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {mySessions.map(session => {
                  const statusStyle = getStatusColor(session.status);
                  const paymentStyle = getPaymentStatusColor(session.paymentStatus);
                  const isPendingPayment = session.paymentStatus === 'Pending';
                  const isPaid = session.paymentStatus === 'Paid';
                  const isFailed = session.paymentStatus === 'Failed';
                  
                  return (
                    <div key={session.id} style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a202c' }}>
                            {session.professional?.fullName || 'Professional'}
                          </h3>
                          <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                            {session.professional?.specialization || 'Mental Health Professional'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color, fontWeight: 500 }}>
                            {session.status}
                          </span>
                          <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: paymentStyle.bg, color: paymentStyle.color, fontWeight: 500 }}>
                            {getPaymentStatusText(session.paymentStatus)}
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
                      
                      {isPendingPayment && (
                        <button
                          onClick={() => handlePayNow(session.id)}
                          disabled={paymentLoading === session.id}
                          style={{
                            background: '#6c63ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 16px',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: paymentLoading === session.id ? 'not-allowed' : 'pointer',
                            width: '100%',
                            marginTop: 12,
                            opacity: paymentLoading === session.id ? 0.6 : 1
                          }}
                        >
                          {paymentLoading === session.id ? 'Processing...' : `Pay Now - KSh ${session.amount?.toLocaleString()}`}
                        </button>
                      )}
                      
                      {isFailed && (
                        <button
                          onClick={() => handlePayNow(session.id)}
                          disabled={paymentLoading === session.id}
                          style={{
                            background: '#FCEBEB',
                            color: '#791F1F',
                            border: '1px solid #F09595',
                            borderRadius: 8,
                            padding: '10px 16px',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: paymentLoading === session.id ? 'not-allowed' : 'pointer',
                            width: '100%',
                            marginTop: 12,
                            opacity: paymentLoading === session.id ? 0.6 : 1
                          }}
                        >
                          {paymentLoading === session.id ? 'Processing...' : 'Retry Payment'}
                        </button>
                      )}
                      
                      {isPaid && (
                        <div style={{
                          background: '#E1F5EE',
                          color: '#085041',
                          padding: '8px 12px',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500,
                          textAlign: 'center',
                          marginTop: 12
                        }}>
                          ✓ Payment confirmed. Your session is secured.
                        </div>
                      )}
                      
                      <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 12 }}>
                        Booked on {session.createdAt}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}