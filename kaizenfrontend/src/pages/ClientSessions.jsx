import { useState, useEffect } from 'react';
import API from '../api/axios';
import VideoCall from '../components/VideoCall';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const PINK         = '#e91e8c';
const PURPLE       = '#9c27b0';
const PINK_LIGHT   = 'rgba(233,30,140,0.1)';
const PURPLE_LIGHT = 'rgba(156,39,176,0.1)';

export default function ClientSessions() {
  const [professionals, setProfessionals]   = useState([]);
  const [mySessions, setMySessions]         = useState([]);
  const [userPhone, setUserPhone]           = useState('');

  const [selectedPro, setSelectedPro]       = useState(null);
  const [selectedDate, setSelectedDate]     = useState('');
  const [slots, setSlots]                   = useState([]);
  const [selectedSlot, setSelectedSlot]     = useState(null);
  const [notes, setNotes]                   = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError]     = useState('');
  const [bookingSuccess, setBookingSuccess] = useState('');

  const [profileModal, setProfileModal]     = useState(null);
  const [profileData, setProfileData]       = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [payingSession, setPayingSession]   = useState(null);
  const [manualPhone, setManualPhone]       = useState('');
  const [payLoading, setPayLoading]         = useState(false);
  const [payError, setPayError]             = useState('');
  const [paySuccess, setPaySuccess]         = useState('');

  const [activeVideoSession, setActiveVideoSession] = useState(null);
  const [loadingPros, setLoadingPros]       = useState(true);
  const [loadingSess, setLoadingSess]       = useState(true);
  
  const [receiptModal, setReceiptModal]     = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  const [activeMainTab, setActiveMainTab]   = useState('professionals');
  
  // Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('detailed');
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  
  // Filter states for professionals
  const [proSearchTerm, setProSearchTerm] = useState('');
  const [proSpecializationFilter, setProSpecializationFilter] = useState('all');
  const [proRatingFilter, setProRatingFilter] = useState('all');
  const [proSortBy, setProSortBy] = useState('name_asc');
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  
  // Filter states for sessions
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('all');
  const [sessionPaymentFilter, setSessionPaymentFilter] = useState('all');
  const [sessionDateRange, setSessionDateRange] = useState({ start: '', end: '' });
  const [sessionSortBy, setSessionSortBy] = useState('date_desc');
  const [filteredSessions, setFilteredSessions] = useState([]);

  useEffect(() => {
    fetchProfessionals();
    fetchMySessions();
    fetchUserProfile();
  }, []);

  useEffect(() => {
    filterAndSortProfessionals();
  }, [professionals, proSearchTerm, proSpecializationFilter, proRatingFilter, proSortBy]);

  useEffect(() => {
    filterAndSortSessions();
  }, [mySessions, sessionSearchTerm, sessionStatusFilter, sessionPaymentFilter, sessionDateRange, sessionSortBy]);

  const fetchUserProfile = async () => {
    try {
      const res = await API.get('/auth/profile');
      setUserPhone(res.data.phoneNumber || res.data.PhoneNumber || '');
    } catch (err) {
      console.error('Could not fetch profile:', err);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const res = await API.get('/session/professionals');
      setProfessionals(res.data);
      setFilteredProfessionals(res.data);
    } catch (err) {
      console.error('Error fetching professionals:', err);
    } finally {
      setLoadingPros(false);
    }
  };

  const fetchMySessions = async () => {
    try {
      const res = await API.get('/session/my-sessions');
      const sessionsWithAmount = res.data.map(session => ({
        ...session,
        amount: 1500
      }));
      setMySessions(sessionsWithAmount);
      setFilteredSessions(sessionsWithAmount);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoadingSess(false);
    }
  };

  const filterAndSortProfessionals = () => {
    let filtered = [...professionals];
    
    if (proSearchTerm) {
      const term = proSearchTerm.toLowerCase();
      filtered = filtered.filter(pro => 
        pro.fullName?.toLowerCase().includes(term) ||
        pro.profile?.specialization?.toLowerCase().includes(term) ||
        pro.profile?.bio?.toLowerCase().includes(term)
      );
    }
    
    if (proSpecializationFilter !== 'all') {
      filtered = filtered.filter(pro => pro.profile?.specialization === proSpecializationFilter);
    }
    
    if (proRatingFilter !== 'all') {
      if (proRatingFilter === 'high') filtered = filtered.filter(pro => (pro.profile?.averageRating || 0) >= 4);
      else if (proRatingFilter === 'medium') filtered = filtered.filter(pro => (pro.profile?.averageRating || 0) >= 3 && (pro.profile?.averageRating || 0) < 4);
      else if (proRatingFilter === 'low') filtered = filtered.filter(pro => (pro.profile?.averageRating || 0) < 3);
    }
    
    filtered.sort((a, b) => {
      switch(proSortBy) {
        case 'name_asc': return (a.fullName || '').localeCompare(b.fullName || '');
        case 'name_desc': return (b.fullName || '').localeCompare(a.fullName || '');
        case 'rating_desc': return (b.profile?.averageRating || 0) - (a.profile?.averageRating || 0);
        case 'rating_asc': return (a.profile?.averageRating || 0) - (b.profile?.averageRating || 0);
        default: return (a.fullName || '').localeCompare(b.fullName || '');
      }
    });
    
    setFilteredProfessionals(filtered);
  };

  const filterAndSortSessions = () => {
    let filtered = [...mySessions];
    
    if (sessionSearchTerm) {
      const term = sessionSearchTerm.toLowerCase();
      filtered = filtered.filter(s => 
        s.professional?.professionalFullName?.toLowerCase().includes(term) ||
        s.professional?.fullName?.toLowerCase().includes(term) ||
        s.notes?.toLowerCase().includes(term)
      );
    }
    
    if (sessionStatusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === sessionStatusFilter);
    }
    
    if (sessionPaymentFilter !== 'all') {
      filtered = filtered.filter(s => s.paymentStatus === sessionPaymentFilter);
    }
    
    if (sessionDateRange.start) {
      const startDate = new Date(sessionDateRange.start);
      filtered = filtered.filter(s => new Date(s.sessionDate) >= startDate);
    }
    if (sessionDateRange.end) {
      const endDate = new Date(sessionDateRange.end);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(s => new Date(s.sessionDate) <= endDate);
    }
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.sessionDate);
      const dateB = new Date(b.sessionDate);
      switch(sessionSortBy) {
        case 'date_asc': return dateA - dateB;
        case 'date_desc': return dateB - dateA;
        case 'professional_asc': return (a.professional?.fullName || '').localeCompare(b.professional?.fullName || '');
        case 'professional_desc': return (b.professional?.fullName || '').localeCompare(a.professional?.fullName || '');
        default: return dateB - dateA;
      }
    });
    
    setFilteredSessions(filtered);
  };

  const fetchSlots = async (proId, date) => {
    if (!proId || !date) return;
    try {
      const res = await API.get(`/session/available/${proId}?date=${date}`);
      setSlots(res.data.availableSlots || []);
    } catch {
      setSlots([]);
    }
  };

  const handleDateChange = (e) => {
    const d = e.target.value;
    setSelectedDate(d);
    setSelectedSlot(null);
    if (selectedPro) fetchSlots(selectedPro.id, d);
  };

  const startBooking = (pro) => {
    setSelectedPro(pro);
    setSelectedDate('');
    setSlots([]);
    setSelectedSlot(null);
    setNotes('');
    setBookingError('');
    setBookingSuccess('');
  };

  const handleBook = async () => {
    if (!selectedSlot) { setBookingError('Please select a time slot.'); return; }
    setBookingLoading(true);
    setBookingError('');
    try {
      await API.post('/session/book', {
        professionalId: selectedPro.id,
        sessionDate:    selectedSlot.time,
        notes
      });
      setBookingSuccess('Session booked! Waiting for the professional to confirm.');
      setSelectedPro(null);
      fetchMySessions();
    } catch (err) {
      setBookingError(err.response?.data?.message || err.response?.data || 'Booking failed.');
    } finally {
      setBookingLoading(false);
    }
  };

  const openPayModal = (session) => {
    setPayingSession(session);
    setManualPhone('');
    setPayError('');
    setPaySuccess('');
  };

  const handlePay = async () => {
    const phoneToUse = userPhone || manualPhone;
    if (!phoneToUse || phoneToUse.trim() === '') {
      setPayError('Please enter your M-Pesa phone number.');
      return;
    }
    setPayLoading(true);
    setPayError('');
    try {
      const response = await API.post('/payment/initiate', {
        SessionId:   payingSession.id,
        PhoneNumber: phoneToUse.trim(),
        Amount:      1500
      });
      if (response.data.success) {
        setPaySuccess('M-Pesa prompt sent! Check your phone and enter your PIN.');
        setPayingSession(null);
        setTimeout(fetchMySessions, 8000);
        setTimeout(fetchMySessions, 15000);
      } else {
        setPayError(response.data.message || 'Payment initiation failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || 'Payment failed. Please try again.';
      setPayError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setPayLoading(false);
    }
  };

  const handleCancel = async (sessionId) => {
    if (!window.confirm('Cancel this session?')) return;
    try {
      await API.delete(`/session/${sessionId}`);
      fetchMySessions();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel session.');
    }
  };

  const fetchProfessionalProfile = async (professional) => {
    setProfileLoading(true);
    try {
      const response = await API.get(`/professional/public-profile/${professional.id}`);
      setProfileData(response.data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfileData(professional);
    } finally {
      setProfileLoading(false);
    }
  };

  const openProfileModal = async (professional) => {
    setProfileModal(professional);
    await fetchProfessionalProfile(professional);
  };
  
  const openReceiptModal = (session) => {
    setReceiptModal(session);
  };

  const downloadReceiptAsPDF = async () => {
    setDownloadLoading(true);
    const receiptElement = document.getElementById('receipt-content');
    if (!receiptElement) {
      setDownloadLoading(false);
      return;
    }
    
    try {
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`receipt_${receiptModal.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download receipt. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const generateReport = async () => {
    setReportLoading(true);
    let data = [];
    
    if (reportType === 'detailed') {
      data = filteredSessions.map(s => ({
        'Session ID': s.id,
        'Professional': s.professional?.professionalFullName || s.professional?.fullName || 'N/A',
        'Date': new Date(s.sessionDate).toLocaleString(),
        'Status': s.status,
        'Payment Status': s.paymentStatus,
        'Amount': `KSh ${s.amount}`,
        'Notes': s.notes || 'N/A'
      }));
    } else if (reportType === 'summary') {
      const totalSessions = filteredSessions.length;
      const completedSessions = filteredSessions.filter(s => s.status === 'Completed').length;
      const cancelledSessions = filteredSessions.filter(s => s.status === 'Cancelled').length;
      const pendingSessions = filteredSessions.filter(s => s.status === 'Pending').length;
      const confirmedSessions = filteredSessions.filter(s => s.status === 'Confirmed').length;
      const totalPaid = filteredSessions.filter(s => s.paymentStatus === 'Paid').length;
      const totalRevenue = filteredSessions.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + (s.amount || 0), 0);
      
      data = [{
        'Metric': 'Total Sessions',
        'Value': totalSessions
      }, {
        'Metric': 'Completed Sessions',
        'Value': completedSessions
      }, {
        'Metric': 'Confirmed Sessions',
        'Value': confirmedSessions
      }, {
        'Metric': 'Pending Sessions',
        'Value': pendingSessions
      }, {
        'Metric': 'Cancelled Sessions',
        'Value': cancelledSessions
      }, {
        'Metric': 'Paid Sessions',
        'Value': totalPaid
      }, {
        'Metric': 'Total Revenue',
        'Value': `KSh ${totalRevenue.toLocaleString()}`
      }];
    } else if (reportType === 'payment') {
      data = filteredSessions.filter(s => s.paymentStatus === 'Paid').map(s => ({
        'Receipt Number': `KZN-${s.id}-${new Date(s.sessionDate).getFullYear()}`,
        'Professional': s.professional?.professionalFullName || s.professional?.fullName || 'N/A',
        'Session Date': new Date(s.sessionDate).toLocaleString(),
        'Amount Paid': `KSh ${s.amount}`,
        'Payment Method': 'M-Pesa',
        'Status': 'Completed'
      }));
    }
    
    setReportData(data);
    setShowReportModal(true);
    setReportLoading(false);
  };

  const exportReportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Report_${reportType}_${new Date().toISOString().split('T')[0]}`);
    XLSX.writeFile(wb, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportReportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.setTextColor(233, 30, 140);
    doc.text(`${reportType.toUpperCase()} REPORT`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    
    const headers = Object.keys(reportData[0] || {});
    const body = reportData.map(item => headers.map(h => String(item[h] || '')));
    
    doc.autoTable({
      startY: 40,
      head: [headers],
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] }
    });
    
    doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const statusColor = (s) =>
    s === 'Confirmed' ? PINK : s === 'Cancelled' ? '#e53e3e' : s === 'Completed' ? PURPLE : '#ed8936';

  const payStatusColor = (s) =>
    s === 'Paid' ? '#4caf50' : s === 'Failed' ? '#e53e3e' : '#ed8936';

  const stars = (n) =>
    '★'.repeat(Math.round(n || 0)) + '☆'.repeat(5 - Math.round(n || 0));

  // Helper functions for profile links - kept for potential future use
  // eslint-disable-next-line no-unused-vars
  const getLinksFromProfile = () => {
    if (!profileData) return { website: '', linkedin: '', portfolio: '' };
    const prof = profileData.professionalProfile || profileData.ProfessionalProfile || {};
    const links = prof.professionalLinks || prof.ProfessionalLinks || {};
    return {
      website: links.website || links.Website || '',
      linkedin: links.linkedin || links.Linkedin || '',
      portfolio: links.portfolio || links.Portfolio || ''
    };
  };

  // eslint-disable-next-line no-unused-vars
  const hasAnyLink = () => {
    const l = getLinksFromProfile();
    return !!(l.website || l.linkedin || l.portfolio);
  };

  const canPay = (s) =>
    s.status === 'Confirmed' && (s.paymentStatus === 'Pending' || s.paymentStatus === 'Failed');

  // Card style - kept for potential future use
  // eslint-disable-next-line no-unused-vars
  const card = {
    background: 'var(--bg-card)',
    border: '1.5px solid var(--border)',
    borderRadius: 14,
    padding: 20
  };

  if (activeVideoSession) {
    return (
      <VideoCall
        roomUrl={activeVideoSession.meetingUrl}
        userName={localStorage.getItem('fullName') || 'Client'}
        onLeave={() => { setActiveVideoSession(null); fetchMySessions(); }}
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{
              fontSize: 26, fontWeight: 700,
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0
            }}>
              📅 My Sessions
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>
              Browse professionals and manage your bookings.
            </p>
          </div>
          <button
            onClick={generateReport}
            style={{
              padding: '10px 20px',
              fontSize: 13,
              fontWeight: 600,
              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            📊 Generate Report
          </button>
        </div>
      </div>

      {bookingSuccess && (
        <div style={{ background: PINK_LIGHT, color: PINK, padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, border: `1px solid ${PINK}` }}>
          ✅ {bookingSuccess}
          <button onClick={() => setBookingSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: PINK, fontSize: 16, width: 'auto' }}>×</button>
        </div>
      )}
      {paySuccess && (
        <div style={{ background: PURPLE_LIGHT, color: PURPLE, padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 14, border: `1px solid ${PURPLE}` }}>
          ✅ {paySuccess}
          <button onClick={() => setPaySuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: PURPLE, fontSize: 16, width: 'auto' }}>×</button>
        </div>
      )}

      {/* Main Tab Switcher */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setActiveMainTab('professionals')}
          style={{
            background: 'transparent',
            color: activeMainTab === 'professionals' ? PINK : 'var(--text-muted)',
            border: 'none',
            borderBottom: activeMainTab === 'professionals' ? `2px solid ${PINK}` : '2px solid transparent',
            padding: '10px 0',
            marginRight: 24,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: activeMainTab === 'professionals' ? 600 : 400
          }}
        >
          👩‍⚕️ Available Professionals ({filteredProfessionals.length})
        </button>
        <button
          onClick={() => setActiveMainTab('mysessions')}
          style={{
            background: 'transparent',
            color: activeMainTab === 'mysessions' ? PINK : 'var(--text-muted)',
            border: 'none',
            borderBottom: activeMainTab === 'mysessions' ? `2px solid ${PINK}` : '2px solid transparent',
            padding: '10px 0',
            marginRight: 24,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: activeMainTab === 'mysessions' ? 600 : 400
          }}
        >
          🗂 My Sessions ({filteredSessions.length})
        </button>
      </div>

      {/* Available Professionals Section */}
      {activeMainTab === 'professionals' && (
        <>
          {/* Filters Panel */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>🔍 Filter Professionals</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Search</label>
                <input type="text" placeholder="Name, specialization..." value={proSearchTerm} onChange={e => setProSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Specialization</label>
                <select value={proSpecializationFilter} onChange={e => setProSpecializationFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="all">All Specializations</option>
                  <option value="Anxiety">Anxiety</option>
                  <option value="Depression">Depression</option>
                  <option value="Loneliness">Loneliness</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Rating</label>
                <select value={proRatingFilter} onChange={e => setProRatingFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="all">All Ratings</option>
                  <option value="high">High (4-5 ⭐)</option>
                  <option value="medium">Medium (3-4 ⭐)</option>
                  <option value="low">Low (1-3 ⭐)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Sort By</label>
                <select value={proSortBy} onChange={e => setProSortBy(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="rating_desc">Rating (Highest First)</option>
                  <option value="rating_asc">Rating (Lowest First)</option>
                </select>
              </div>
            </div>
            <button onClick={() => { setProSearchTerm(''); setProSpecializationFilter('all'); setProRatingFilter('all'); setProSortBy('name_asc'); }} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
              Clear Filters
            </button>
          </div>

          {/* Professionals Table */}
          {loadingPros ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading professionals…</p>
          ) : filteredProfessionals.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No professionals found matching your criteria.</p>
          ) : (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Professional</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Specialization</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Rating</th>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Bio</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfessionals.map(pro => (
                      <tr key={pro.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 40, height: 40, borderRadius: '50%',
                              background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: 'white', fontWeight: 700, fontSize: 14
                            }}>
                              {pro.firstName?.charAt(0)}{pro.lastName?.charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{pro.fullName}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pro.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: PINK_LIGHT, color: PINK }}>
                            {pro.profile?.specialization || 'General'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ color: '#f6ad55', fontSize: 13 }}>{stars(pro.profile?.averageRating || 0)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{Number(pro.profile?.averageRating || 0).toFixed(1)}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {pro.profile?.bio || 'No bio available'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button onClick={() => openProfileModal(pro)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: 'transparent', color: PURPLE, border: `1px solid ${PURPLE}`, borderRadius: 6, cursor: 'pointer' }}>Profile</button>
                            <button onClick={() => startBooking(pro)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Book</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* My Sessions Section */}
      {activeMainTab === 'mysessions' && (
        <>
          {/* Filters Panel */}
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>🔍 Filter Sessions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Search</label>
                <input type="text" placeholder="Professional name..." value={sessionSearchTerm} onChange={e => setSessionSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                <select value={sessionStatusFilter} onChange={e => setSessionStatusFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="all">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Payment Status</label>
                <select value={sessionPaymentFilter} onChange={e => setSessionPaymentFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="all">All Payments</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start Date</label>
                <input type="date" value={sessionDateRange.start} onChange={e => setSessionDateRange({ ...sessionDateRange, start: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>End Date</label>
                <input type="date" value={sessionDateRange.end} onChange={e => setSessionDateRange({ ...sessionDateRange, end: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Sort By</label>
                <select value={sessionSortBy} onChange={e => setSessionSortBy(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  <option value="date_desc">Date (Newest First)</option>
                  <option value="date_asc">Date (Oldest First)</option>
                  <option value="professional_asc">Professional (A-Z)</option>
                  <option value="professional_desc">Professional (Z-A)</option>
                </select>
              </div>
            </div>
            <button onClick={() => { setSessionSearchTerm(''); setSessionStatusFilter('all'); setSessionPaymentFilter('all'); setSessionDateRange({ start: '', end: '' }); setSessionSortBy('date_desc'); }} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
              Clear Filters
            </button>
          </div>

          {/* Sessions Table */}
          {loadingSess ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading sessions…</p>
          ) : filteredSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No sessions found matching your criteria.</p>
          ) : (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Professional</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Date & Time</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Payment</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
                      <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map(s => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {s.professional?.professionalFullName || s.professional?.fullName || 'Professional'}
                          </div>
                          {s.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>📝 {s.notes}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>
                          {s.formattedDate}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${statusColor(s.status)}20`, color: statusColor(s.status) }}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${payStatusColor(s.paymentStatus)}20`, color: payStatusColor(s.paymentStatus) }}>
                            {s.paymentStatus}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: PINK }}>
                          KSh 1,500
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                            {canPay(s) && s.paymentStatus === 'Pending' && (
                              <button onClick={() => openPayModal(s)} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Pay</button>
                            )}
                            {canPay(s) && s.paymentStatus === 'Failed' && (
                              <button onClick={() => openPayModal(s)} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Retry</button>
                            )}
                            {s.paymentStatus === 'Paid' && (
                              <button onClick={() => openReceiptModal(s)} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, background: 'transparent', color: PURPLE, border: `1px solid ${PURPLE}`, borderRadius: 6, cursor: 'pointer' }}>Receipt</button>
                            )}
                            {s.meetingUrl && s.paymentStatus === 'Paid' && s.status !== 'Completed' && (
                              <button onClick={() => s.canJoin && setActiveVideoSession({ meetingUrl: s.meetingUrl, id: s.id })} disabled={!s.canJoin} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, background: s.canJoin ? `linear-gradient(135deg, ${PINK}, ${PURPLE})` : 'var(--bg-hover)', color: s.canJoin ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: 6, cursor: s.canJoin ? 'pointer' : 'not-allowed' }}>{s.canJoin ? 'Join' : 'Soon'}</button>
                            )}
                            {s.status === 'Pending' && s.paymentStatus !== 'Paid' && (
                              <button onClick={() => handleCancel(s.id)} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, background: 'transparent', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: 20 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, maxWidth: 800, width: '100%', maxHeight: '85vh', display: 'flex', flexDirection: 'column', border: `1.5px solid ${PINK}` }}>
            <div style={{ padding: 24, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: PURPLE, margin: 0 }}>📊 Report: {reportType.toUpperCase()}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Generated on {new Date().toLocaleString()}</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={reportType} onChange={e => setReportType(e.target.value)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 12 }}>
                  <option value="detailed">Detailed Report</option>
                  <option value="summary">Summary Report</option>
                  <option value="payment">Payment Receipts Report</option>
                </select>
                <button onClick={() => generateReport()} disabled={reportLoading} style={{ padding: '8px 16px', borderRadius: 8, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', cursor: 'pointer' }}>Refresh</button>
                <button onClick={() => setShowReportModal(false)} style={{ padding: '8px 16px', borderRadius: 8, background: 'transparent', border: `1px solid ${PINK}`, color: PINK, cursor: 'pointer' }}>×</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1, padding: 24 }}>
              {reportLoading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>Loading report...</div>
              ) : reportData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data available for this report type.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: PINK_LIGHT, borderBottom: `2px solid ${PINK}` }}>
                      {Object.keys(reportData[0]).map(key => (
                        <th key={key} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: PURPLE }}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        {Object.values(row).map((val, i) => (
                          <td key={i} style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-primary)' }}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 12 }}>
              <button onClick={exportReportToExcel} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#4caf50', color: 'white', border: 'none', cursor: 'pointer' }}>📊 Export to Excel</button>
              <button onClick={exportReportToPDF} style={{ flex: 1, padding: '10px', borderRadius: 8, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', cursor: 'pointer' }}>📄 Export to PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals (Profile, Booking, Payment, Receipt) */}
      {profileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setProfileModal(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 32, maxWidth: 540, width: '100%', border: `1.5px solid ${PINK}`, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setProfileModal(null)} style={{ float: 'right', background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: PINK, lineHeight: 1, width: 'auto' }}>×</button>
            {profileLoading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ width: 40, height: 40, border: `3px solid ${PINK_LIGHT}`, borderTop: `3px solid ${PINK}`, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ color: PURPLE }}>Loading profile...</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>{profileModal.firstName?.charAt(0)}{profileModal.lastName?.charAt(0)}</div>
                  <div><h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{profileModal.fullName}</h3><p style={{ fontSize: 13, color: PINK, margin: '2px 0 0', fontWeight: 600 }}>{profileData?.professionalProfile?.specialization || profileData?.profile?.specialization || profileModal.profile?.specialization || 'Mental Health Professional'}</p></div>
                </div>
                {(profileData?.professionalProfile?.averageRating > 0 || profileData?.profile?.averageRating > 0) && (<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><span style={{ color: '#f6ad55', fontSize: 18 }}>{stars(profileData?.professionalProfile?.averageRating || profileData?.profile?.averageRating)}</span><span style={{ fontSize: 14, fontWeight: 600, color: PURPLE }}>{Number(profileData?.professionalProfile?.averageRating || profileData?.profile?.averageRating).toFixed(1)} / 5.0</span></div>)}
                <div style={{ height: 1, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, marginBottom: 20 }} />
                {(profileData?.professionalProfile?.bio || profileData?.profile?.bio || profileModal.profile?.bio) && (<div style={{ marginBottom: 18 }}><p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: PINK, marginBottom: 8 }}>About Me</p><p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>{profileData?.professionalProfile?.bio || profileData?.profile?.bio || profileModal.profile?.bio}</p></div>)}
                <div style={{ background: PINK_LIGHT, border: `1px solid rgba(233,30,140,0.3)`, borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><div><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Session Fee</p><p style={{ fontSize: 18, fontWeight: 700, color: PINK, margin: 0 }}>KSh 1,500</p></div><div style={{ textAlign: 'right' }}><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Duration</p><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>60 minutes</p></div></div>
                <div style={{ display: 'flex', gap: 10, marginTop: 24 }}><button onClick={() => setProfileModal(null)} style={{ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 10, cursor: 'pointer' }}>Close</button><button onClick={() => { setProfileModal(null); startBooking(profileModal); }} style={{ flex: 2, padding: '11px 0', fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer' }}>Book a Session →</button></div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedPro && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setSelectedPro(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 32, maxWidth: 460, width: '100%', border: `1.5px solid ${PINK}` }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: PURPLE, marginBottom: 4 }}>Book with {selectedPro.fullName}</h3>
            <p style={{ fontSize: 13, color: PINK, marginBottom: 20 }}>{selectedPro.profile?.specialization || 'Mental Health Professional'} · KSh 1,500 per session</p>
            {bookingError && (<div style={{ background: PINK_LIGHT, color: PINK, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{bookingError}</div>)}
            <div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: PURPLE, marginBottom: 6 }}>Select Date</label><input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]} onChange={handleDateChange} style={{ width: '100%', padding: '11px 14px', border: `1.5px solid var(--border)`, borderRadius: 9, fontSize: 14, background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none' }} /></div>
            {selectedDate && (<div style={{ marginBottom: 16 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: PURPLE, marginBottom: 8 }}>Available Time Slots</label>{slots.length === 0 ? (<p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No slots available for this date.</p>) : (<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{slots.map((slot, i) => (<button key={i} onClick={() => setSelectedSlot(slot)} style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: '1.5px solid', borderColor: selectedSlot === slot ? PINK : 'var(--border)', background: selectedSlot === slot ? PINK_LIGHT : 'var(--bg-hover)', color: selectedSlot === slot ? PINK : 'var(--text-primary)', cursor: 'pointer' }}>{slot.formattedTime}</button>))}</div>)}</div>)}
            <div style={{ marginBottom: 20 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: PURPLE, marginBottom: 6 }}>Notes (optional)</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything you'd like the professional to know…" rows={3} style={{ width: '100%', padding: '11px 14px', border: `1.5px solid var(--border)`, borderRadius: 9, fontSize: 13, background: 'var(--input-bg)', color: 'var(--text-primary)', resize: 'vertical', outline: 'none' }} /></div>
            <div style={{ display: 'flex', gap: 10 }}><button onClick={() => setSelectedPro(null)} style={{ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 10, cursor: 'pointer' }}>Cancel</button><button onClick={handleBook} disabled={bookingLoading || !selectedSlot} style={{ flex: 2, padding: '11px 0', fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, cursor: bookingLoading || !selectedSlot ? 'not-allowed' : 'pointer', opacity: bookingLoading || !selectedSlot ? 0.65 : 1 }}>{bookingLoading ? 'Booking…' : 'Confirm Booking'}</button></div>
          </div>
        </div>
      )}

      {payingSession && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setPayingSession(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 32, maxWidth: 420, width: '100%', border: `1.5px solid ${PINK}` }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: PURPLE, marginBottom: 6 }}>💳 M-Pesa Payment</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Session with <strong style={{ color: PURPLE }}>{payingSession.professional?.professionalFullName || payingSession.professional?.fullName || 'Professional'}</strong> · <strong style={{ color: PINK }}>KSh 1,500</strong></p>
            {payError && (<div style={{ background: PINK_LIGHT, color: PINK, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{payError}</div>)}
            {userPhone ? (<div style={{ background: PURPLE_LIGHT, border: `1.5px solid ${PURPLE}`, borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}><p style={{ fontSize: 12, fontWeight: 600, color: PURPLE, margin: '0 0 4px' }}>M-Pesa prompt will be sent to:</p><p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>📱 {userPhone}</p><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0' }}>This is the number saved on your profile. Update it in Settings if needed.</p></div>) : (<div style={{ marginBottom: 20 }}><label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: PURPLE, marginBottom: 6 }}>M-Pesa Phone Number</label><input type="tel" value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="e.g. 0712345678" style={{ width: '100%', padding: '11px 14px', border: `1.5px solid var(--border)`, borderRadius: 9, fontSize: 14, background: 'var(--input-bg)', color: 'var(--text-primary)', outline: 'none' }} /><p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>No phone on your profile. Enter your M-Pesa number above.</p></div>)}
            <div style={{ display: 'flex', gap: 10 }}><button onClick={() => setPayingSession(null)} style={{ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 10, cursor: 'pointer' }}>Cancel</button><button onClick={handlePay} disabled={payLoading || (!userPhone && !manualPhone)} style={{ flex: 2, padding: '11px 0', fontSize: 14, fontWeight: 700, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, cursor: payLoading || (!userPhone && !manualPhone) ? 'not-allowed' : 'pointer', opacity: payLoading || (!userPhone && !manualPhone) ? 0.65 : 1 }}>{payLoading ? 'Sending prompt…' : payingSession.paymentStatus === 'Failed' ? 'Retry M-Pesa Prompt' : 'Send M-Pesa Prompt'}</button></div>
          </div>
        </div>
      )}

      {receiptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setReceiptModal(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, maxWidth: 460, width: '100%', border: `1.5px solid ${PINK}`, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div id="receipt-content" style={{ padding: 32, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><div><h3 style={{ fontSize: 20, fontWeight: 700, color: PURPLE, margin: 0 }}>🧾 Payment Receipt</h3><p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Session Payment Confirmation</p></div></div>
              <div style={{ background: `linear-gradient(135deg, ${PINK_LIGHT}, ${PURPLE_LIGHT})`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}><div style={{ fontSize: 48, marginBottom: 8 }}>🧾</div><p style={{ fontSize: 16, fontWeight: 700, color: PURPLE, margin: 0 }}>Kaizen Mental Health Platform</p><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>Official Payment Receipt</p></div>
                <div style={{ height: 1, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, marginBottom: 16 }} />
                <div style={{ marginBottom: 12 }}><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Receipt Number</p><p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>KZN-{receiptModal.id}-{new Date(receiptModal.paymentDate || receiptModal.dateBooked).getFullYear()}</p></div>
                <div style={{ marginBottom: 12 }}><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Transaction Date</p><p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>{new Date(receiptModal.paymentDate || receiptModal.dateBooked).toLocaleString('en-KE', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p></div>
                <div style={{ marginBottom: 12 }}><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Professional</p><p style={{ fontSize: 13, fontWeight: 600, color: PURPLE, margin: '4px 0 0' }}>{receiptModal.professional?.professionalFullName || receiptModal.professional?.fullName || 'Professional'}</p></div>
                <div style={{ marginBottom: 12 }}><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Session Date & Time</p><p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>{receiptModal.formattedDate}</p></div>
                <div style={{ marginBottom: 12 }}><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Method</p><p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>💳 M-Pesa</p></div>
                <div style={{ marginBottom: 12 }}><p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Status</p><p style={{ fontSize: 13, fontWeight: 600, color: '#4caf50', margin: '4px 0 0' }}>✓ Paid</p></div>
                <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Total Amount</p><p style={{ fontSize: 20, fontWeight: 700, color: PINK, margin: 0 }}>KSh 1,500</p></div></div>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}><p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>Thank you for choosing Kaizen. This receipt serves as proof of payment.</p><p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>For any inquiries, please contact support@kaizen.com</p></div>
            </div>
            <div style={{ padding: '0 32px 32px 32px', borderTop: '1px solid var(--border)', paddingTop: 24 }}><div style={{ display: 'flex', gap: 10 }}><button onClick={() => setReceiptModal(null)} style={{ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 10, cursor: 'pointer' }}>Close</button><button onClick={() => window.print()} style={{ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer' }}>🖨️ Print</button><button onClick={downloadReceiptAsPDF} disabled={downloadLoading} style={{ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, background: downloadLoading ? 'var(--border)' : `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, cursor: downloadLoading ? 'not-allowed' : 'pointer', opacity: downloadLoading ? 0.6 : 1 }}>{downloadLoading ? 'Downloading...' : '📥 Download PDF'}</button></div></div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}