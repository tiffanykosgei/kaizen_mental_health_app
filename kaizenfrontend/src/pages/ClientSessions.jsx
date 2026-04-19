import { useState, useEffect } from 'react';
import API from '../api/axios';
import VideoCall from '../components/VideoCall';
import ProfessionalViewModal from '../components/ProfessionalViewModal';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const PINK = '#e91e8c';
const PURPLE = '#9c27b0';

export default function ClientSessions() {
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [mySessions, setMySessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
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
  const [showProfessionalModal, setShowProfessionalModal] = useState(null);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('date_desc');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const firstName = localStorage.getItem('firstName') || 'Client';
  const lastName = localStorage.getItem('lastName') || '';
  const fullName = `${firstName} ${lastName}`.trim();

  useEffect(() => {
    fetchProfessionals();
    fetchMySessions();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [mySessions, searchTerm, statusFilter, paymentFilter, dateRange, sortBy]);

  const applyFiltersAndSort = () => {
    let filtered = [...mySessions];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const proFullName = getProfessionalFullName(s).toLowerCase();
        const proEmail = (getProfessionalEmail(s) || '').toLowerCase();
        return proFullName.includes(term) || proEmail.includes(term);
      });
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(s => s.paymentStatus === paymentFilter);
    }
    
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(s => new Date(s.sessionDate) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(s => new Date(s.sessionDate) <= endDate);
    }
    
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'date_desc':
          return new Date(b.sessionDate) - new Date(a.sessionDate);
        case 'date_asc':
          return new Date(a.sessionDate) - new Date(b.sessionDate);
        case 'amount_desc':
          return (b.amount || 0) - (a.amount || 0);
        case 'amount_asc':
          return (a.amount || 0) - (b.amount || 0);
        default:
          return new Date(b.sessionDate) - new Date(a.sessionDate);
      }
    });
    
    setFilteredSessions(filtered);
  };

  const getProfessionalFullName = (session) => {
    if (!session) return 'N/A';
    if (session.professional) {
      const pro = session.professional;
      if (pro.firstName || pro.lastName) {
        const name = `${pro.firstName || ''} ${pro.lastName || ''}`.trim();
        if (name) return name;
      }
      if (pro.fullName) return pro.fullName;
      if (pro.professionalFullName) return pro.professionalFullName;
      if (pro.name) return pro.name;
    }
    if (session.professionalFullName) return session.professionalFullName;
    if (session.professionalName) return session.professionalName;
    if (session.Professional) {
      const pro = session.Professional;
      if (pro.firstName || pro.lastName) {
        const name = `${pro.firstName || ''} ${pro.lastName || ''}`.trim();
        if (name) return name;
      }
      if (pro.fullName) return pro.fullName;
      if (pro.professionalFullName) return pro.professionalFullName;
    }
    if (session.professionals && session.professionals.length > 0) {
      const pro = session.professionals[0];
      if (pro.firstName || pro.lastName) {
        const name = `${pro.firstName || ''} ${pro.lastName || ''}`.trim();
        if (name) return name;
      }
      if (pro.fullName) return pro.fullName;
      if (pro.professionalFullName) return pro.professionalFullName;
    }
    return 'N/A';
  };

  const getProfessionalEmail = (session) => {
    if (!session) return null;
    if (session.professional?.email) return session.professional.email;
    if (session.professionalEmail) return session.professionalEmail;
    if (session.Professional?.email) return session.Professional.email;
    if (session.professionals?.[0]?.email) return session.professionals[0].email;
    return null;
  };

  const getProfessionalSpecialization = (session) => {
    if (!session) return 'N/A';
    if (session.professional?.specialization) return session.professional.specialization;
    if (session.professionalSpecialization) return session.professionalSpecialization;
    if (session.Professional?.specialization) return session.Professional.specialization;
    if (session.professionals?.[0]?.specialization) return session.professionals[0].specialization;
    return 'N/A';
  };

  const isSessionActive = (sessionDateStr) => {
    const start = new Date(sessionDateStr);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const joinFrom = new Date(start.getTime() - 10 * 60 * 1000);
    const now = new Date();
    return now >= joinFrom && now <= end;
  };

  const fetchProfessionals = async () => {
    try {
      const response = await API.get('/session/professionals');
      const normalized = response.data.map(pro => ({
        id: pro.id ?? pro.Id,
        firstName: pro.firstName ?? pro.FirstName ?? '',
        lastName: pro.lastName ?? pro.LastName ?? '',
        fullName: pro.fullName ?? pro.FullName ??
          `${pro.firstName ?? pro.FirstName ?? ''} ${pro.lastName ?? pro.LastName ?? ''}`,
        email: pro.email ?? pro.Email,
        profile: (pro.profile ?? pro.Profile) ? {
          bio: (pro.profile ?? pro.Profile)?.bio ?? (pro.profile ?? pro.Profile)?.Bio ?? '',
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
        id: s.id ?? s.Id,
        sessionDate: s.sessionDate ?? s.SessionDate,
        formattedDate: s.formattedDate ?? s.FormattedDate,
        status: s.status ?? s.Status,
        paymentStatus: s.paymentStatus ?? s.PaymentStatus,
        amount: s.amount ?? s.Amount,
        notes: s.notes ?? s.Notes,
        createdAt: s.createdAt ?? s.CreatedAt,
        meetingUrl: s.meetingUrl ?? s.MeetingUrl,
        paymentReference: s.paymentReference ?? s.PaymentReference,
        professional: s.professional ?? s.Professional ?? null,
        professionalFullName: s.professionalFullName ?? s.ProfessionalFullName ?? null,
        professionalName: s.professionalName ?? s.ProfessionalName ?? null,
        professionals: s.professionals ?? s.Professionals ?? null
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
        sessionDate: slot.time,
        notes: ''
      });
      setSuccess('Session booked! Awaiting professional confirmation. Once confirmed, you can proceed with payment.');
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

  const generateSessionReceipt = (session) => {
    try {
      const doc = new jsPDF();
      const professionalName = getProfessionalFullName(session);
      const specialization = getProfessionalSpecialization(session);
      
      doc.setFontSize(20);
      doc.setTextColor(233, 30, 140);
      doc.text('Kaizen Mental Wellness', 20, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Session Payment Receipt', 20, 35);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
      doc.text(`Receipt #: SESS-${session.id}-${Date.now()}`, 20, 52);
      
      doc.line(20, 58, 190, 58);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Session Details', 20, 70);
      
      const tableData = [
        ['Session ID', session.id.toString()],
        ['Date', new Date(session.sessionDate).toLocaleString()],
        ['Professional', professionalName],
        ['Specialization', specialization],
        ['Status', session.status],
        ['Amount Paid', `KSh ${(session.amount || 0).toLocaleString()}`],
        ['Payment Status', session.paymentStatus],
        ['Transaction ID', session.paymentReference || 'N/A']
      ];
      
      doc.autoTable({
        startY: 78,
        head: [['Field', 'Value']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        margin: { left: 20, right: 20 }
      });
      
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('Thank you for choosing Kaizen Mental Wellness', 20, finalY);
      doc.text('This is a system-generated receipt', 20, finalY + 7);
      
      doc.save(`receipt_session_${session.id}.pdf`);
      alert('Receipt downloaded successfully!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate receipt. Please try again.');
    }
  };

  const exportToExcel = () => {
    const exportData = filteredSessions.map(s => ({
      'Session ID': s.id,
      'Date': new Date(s.sessionDate).toLocaleString(),
      'Professional': getProfessionalFullName(s),
      'Specialization': getProfessionalSpecialization(s),
      'Status': s.status,
      'Payment Status': s.paymentStatus,
      'Amount (KSh)': s.amount || 0,
      'Booked On': new Date(s.createdAt).toLocaleString()
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'My Sessions');
    XLSX.writeFile(wb, `my_sessions_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(233, 30, 140);
      doc.text('My Sessions Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Sessions: ${filteredSessions.length}`, 14, 37);
      
      const tableData = filteredSessions.map(s => [
        s.id.toString(),
        new Date(s.sessionDate).toLocaleDateString(),
        getProfessionalFullName(s),
        s.status,
        s.paymentStatus,
        `KSh ${(s.amount || 0).toLocaleString()}`
      ]);
      
      doc.autoTable({
        startY: 45,
        head: [['ID', 'Date', 'Professional', 'Status', 'Payment', 'Amount']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`my_sessions_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
      alert('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Error: ' + err.message);
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
    Confirmed: { bg: 'rgba(156,39,176,0.12)', color: PURPLE },
    Pending: { bg: 'rgba(233,30,140,0.12)', color: PINK },
    Completed: { bg: 'rgba(156,39,176,0.08)', color: PURPLE },
    Cancelled: { bg: 'rgba(233,30,140,0.08)', color: '#e53e3e' },
  }[s] || { bg: 'var(--bg-hover)', color: 'var(--text-secondary)' });

  const paymentColor = (s) => ({
    Paid: { bg: 'rgba(76,175,80,0.12)', color: '#4caf50' },
    Pending: { bg: 'rgba(255,152,0,0.12)', color: '#ff9800' },
    Failed: { bg: 'rgba(233,30,140,0.12)', color: PINK },
  }[s] || { bg: 'var(--bg-hover)', color: 'var(--text-secondary)' });

  const slotBtnBase = {
    background: 'var(--bg-card)', border: `1.5px solid ${PINK}`,
    padding: '14px 12px', borderRadius: 8, cursor: 'pointer',
    fontSize: 14, fontWeight: 500, color: PURPLE,
    transition: 'all 0.15s', width: '100%'
  };

  const totalSpent = filteredSessions
    .filter(s => s.paymentStatus === 'Paid')
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const completedSessions = filteredSessions.filter(s => s.status === 'Completed').length;
  const upcomingSessions = filteredSessions.filter(s => new Date(s.sessionDate) > new Date() && s.status !== 'Cancelled').length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>

      {/* Professional View Modal */}
      {showProfessionalModal && (
        <ProfessionalViewModal
          professional={showProfessionalModal}
          onClose={() => setShowProfessionalModal(null)}
        />
      )}

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>My Sessions</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
          Book, manage, and track all your therapy sessions
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Sessions</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: PINK, margin: 0 }}>{filteredSessions.length}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Completed</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#4caf50', margin: 0 }}>{completedSessions}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Upcoming</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: PURPLE, margin: 0 }}>{upcomingSessions}</p>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Spent</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#ff9800', margin: 0 }}>KSh {totalSpent.toLocaleString()}</p>
        </div>
      </div>

      <div style={{ display: 'flex', borderBottom: `1.5px solid var(--border)`, marginBottom: 24 }}>
        {['book', 'my'].map(tab => (
          <button key={tab}
            onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}
            style={{
              background: 'transparent', border: 'none', width: 'auto',
              padding: '10px 0', marginRight: 24, cursor: 'pointer', fontSize: 14,
              color: activeTab === tab ? PINK : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? `2px solid ${PINK}` : '2px solid transparent',
              fontWeight: activeTab === tab ? 600 : 400
            }}
          >
            {tab === 'book' ? 'Book a Session' : `My Sessions (${filteredSessions.length})`}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(233,30,140,0.1)', color: PINK, padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, border: `1px solid ${PINK}` }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'rgba(156,39,176,0.1)', color: PURPLE, padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, border: `1px solid ${PURPLE}` }}>
          {success}
        </div>
      )}

      {activeTab === 'book' && (
        <div>
          {!selectedProfessional ? (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
                1. Choose a Mental Health Professional
              </h3>
              {professionals.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No professionals available yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {professionals.map(pro => (
                    <div key={pro.id} 
                      style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', border: `1.5px solid var(--border)`, transition: 'all 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = PINK}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ flex: 1 }} onClick={() => handleProfessionalSelect(pro)}>
                          <h4 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                            {pro.firstName} {pro.lastName}
                          </h4>
                          {pro.profile?.specialization && (
                            <p style={{ fontSize: 12, color: PINK, marginTop: 4 }}>{pro.profile.specialization}</p>
                          )}
                          {pro.profile?.bio && (
                            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
                              {pro.profile.bio.length > 100 ? `${pro.profile.bio.substring(0, 100)}...` : pro.profile.bio}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>KSh 10/session</span>
                          <button
                            onClick={() => setShowProfessionalModal(pro)}
                            style={{
                              padding: '6px 14px',
                              fontSize: 12,
                              borderRadius: 20,
                              border: `1.5px solid ${PINK}`,
                              background: 'transparent',
                              color: PINK,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.background = PINK;
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = PINK;
                            }}
                          >
                            👤 View Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <button onClick={() => { setSelectedProfessional(null); setSelectedDate(''); setAvailableSlots([]); setError(''); }}
                style={{ background: 'transparent', color: PINK, border: `1px solid ${PINK}`, width: 'auto', padding: '6px 12px', fontSize: 12, marginBottom: 20, cursor: 'pointer', borderRadius: 8 }}>
                ← Back to Professionals
              </button>

              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '16px 20px', marginBottom: 20, border: `1.5px solid ${PINK}` }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  {selectedProfessional.firstName} {selectedProfessional.lastName}
                </h3>
                {selectedProfessional.profile?.specialization && (
                  <p style={{ fontSize: 12, color: PINK, marginTop: 4 }}>{selectedProfessional.profile.specialization}</p>
                )}
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>2. Choose a Date</h3>
              <input type="date" value={selectedDate} onChange={handleDateChange}
                min={new Date().toISOString().split('T')[0]}
                style={{ width: '100%', padding: '12px 16px', border: `1.5px solid var(--border)`, borderRadius: 8, marginBottom: 20, fontSize: 15, color: 'var(--text-primary)', background: 'var(--bg-card)' }}
              />

              {selectedDate && (
                <>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>3. Choose a Time</h3>
                  {loading ? (
                    <p style={{ textAlign: 'center', padding: 20, color: 'var(--text-secondary)' }}>Loading available slots...</p>
                  ) : availableSlots.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: `1.5px solid var(--border)` }}>
                      <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>Click below to load available time slots</p>
                      <button onClick={fetchAvailableSlots}
                        style={{ width: 'auto', padding: '10px 28px', cursor: 'pointer', background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
                        Load Available Slots
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 16 }}>
                        {availableSlots.map((slot, i) => (
                          <button key={i} onClick={() => handleBookSlot(slot)} disabled={bookingLoading}
                            style={{ ...slotBtnBase, opacity: bookingLoading ? 0.6 : 1, cursor: bookingLoading ? 'not-allowed' : 'pointer' }}
                            onMouseEnter={e => { if (!bookingLoading) { e.currentTarget.style.background = `linear-gradient(135deg, ${PINK}, ${PURPLE})`; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = PURPLE; }}}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.color = PURPLE; e.currentTarget.style.borderColor = PINK; }}>
                            {slot.formattedTime}
                          </button>
                        ))}
                      </div>
                      <button onClick={fetchAvailableSlots}
                        style={{ background: 'transparent', color: PINK, border: `1px solid ${PINK}`, width: 'auto', padding: '6px 16px', fontSize: 12, cursor: 'pointer', borderRadius: 8 }}>
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
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <input
                type="text"
                placeholder="🔍 Search by professional name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}
              />
            </div>
            <div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="all">All Payment</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            <div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="date_desc">Date (Newest First)</option>
                <option value="date_asc">Date (Oldest First)</option>
                <option value="amount_desc">Amount (Highest First)</option>
                <option value="amount_asc">Amount (Lowest First)</option>
              </select>
            </div>
            <div>
              <input type="date" placeholder="Start" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, width: 130 }} />
            </div>
            <div>
              <input type="date" placeholder="End" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13, width: 130 }} />
            </div>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowExportMenu(!showExportMenu)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer', fontSize: 13 }}>
                📥 Export
              </button>
              {showExportMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10 }}>
                  <button onClick={exportToExcel} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📊 Excel</button>
                  <button onClick={exportToPDF} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📄 PDF</button>
                </div>
              )}
            </div>
            {(searchTerm || statusFilter !== 'all' || paymentFilter !== 'all' || dateRange.start || dateRange.end) && (
              <button onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPaymentFilter('all'); setDateRange({ start: '', end: '' }); setSortBy('date_desc'); }}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
                Clear Filters
              </button>
            )}
          </div>

          {filteredSessions.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', border: `1.5px solid var(--border)` }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
              <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>No sessions found</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                {mySessions.length === 0 ? 'Book your first session with a professional' : 'No sessions match your filters'}
              </p>
              {mySessions.length === 0 && (
                <button onClick={() => setActiveTab('book')}
                  style={{ width: 'auto', padding: '10px 24px', cursor: 'pointer', background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 8, fontSize: 14 }}>
                  Book a session
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Sessions Table */}
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: `1px solid var(--border)`, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: `1px solid var(--border)` }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>ID</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Date & Time</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Professional</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Specialization</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Payment</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                       </tr>
                    </thead>
                    <tbody>
                      {filteredSessions.map(session => {
                        const ss = statusColor(session.status);
                        const ps = paymentColor(session.paymentStatus);
                        const isPaid = session.paymentStatus === 'Paid';
                        const isConfirmed = session.status === 'Confirmed';
                        const hasMeetingUrl = !!session.meetingUrl;
                        const isCancellable = session.status === 'Pending' && session.paymentStatus !== 'Paid';
                        const active = isSessionActive(session.sessionDate);
                        const canPay = isConfirmed && !isPaid;
                        const professionalFullName = getProfessionalFullName(session);
                        const specialization = getProfessionalSpecialization(session);
                        
                        return (
                          <tr key={session.id} style={{ borderBottom: `1px solid var(--border)` }}>
                            <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>#{session.id}</td>
                            <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(session.sessionDate)}</td>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                              {professionalFullName}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{specialization}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: PINK }}>
                              KSh {session.amount?.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: ss.bg, color: ss.color, fontWeight: 500 }}>
                                {session.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: ps.bg, color: ps.color, fontWeight: 500 }}>
                                {session.paymentStatus === 'Paid' ? '✓ Paid' : session.paymentStatus === 'Pending' ? '⏳ Pending' : session.paymentStatus}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                                {isPaid && (
                                  <button onClick={() => generateSessionReceipt(session)}
                                    style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: 'none', background: PINK, color: 'white', cursor: 'pointer' }}>
                                    📄 Receipt
                                  </button>
                                )}
                                {canPay && (
                                  <button onClick={() => handlePayNow(session.id)} disabled={paymentLoading === session.id}
                                    style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: 'none', background: '#4caf50', color: 'white', cursor: paymentLoading === session.id ? 'not-allowed' : 'pointer', opacity: paymentLoading === session.id ? 0.6 : 1 }}>
                                    {paymentLoading === session.id ? '...' : 'Pay'}
                                  </button>
                                )}
                                {isConfirmed && hasMeetingUrl && active && (
                                  <button onClick={() => { setSelectedMeetingUrl(session.meetingUrl); setShowVideoCall(true); }}
                                    style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: 'none', background: PURPLE, color: 'white', cursor: 'pointer' }}>
                                    📹 Join
                                  </button>
                                )}
                                {isCancellable && (
                                  <button onClick={() => handleDeleteSession(session.id)} disabled={deleteLoading === session.id}
                                    style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, border: '1px solid #e53e3e', background: 'transparent', color: '#e53e3e', cursor: deleteLoading === session.id ? 'not-allowed' : 'pointer' }}>
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Showing {filteredSessions.length} of {mySessions.length} sessions
              </div>
            </>
          )}
        </div>
      )}

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