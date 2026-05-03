import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import VideoCall from '../components/VideoCall';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const PINK   = '#e91e8c';
const PURPLE = '#9c27b0';
const PINK_LIGHT   = 'rgba(233,30,140,0.1)';
const PURPLE_LIGHT = 'rgba(156,39,176,0.1)';

export default function ProfessionalSessions() {
  const navigate = useNavigate();
  const [sessions,         setSessions]         = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState('');
  const [success,          setSuccess]          = useState('');
  const [updatingId,       setUpdatingId]       = useState(null);
  const [showVideoCall,    setShowVideoCall]    = useState(false);
  const [selectedMeetingUrl, setSelectedMeetingUrl] = useState('');
  const [showExportMenu,   setShowExportMenu]   = useState(false);
  const [expandedNotes,    setExpandedNotes]    = useState(null);
  
  const [receiptModal, setReceiptModal] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const [searchTerm,   setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange,    setDateRange]    = useState({ start: '', end: '' });
  const [sortBy,       setSortBy]       = useState('date_desc');

  const firstName = localStorage.getItem('firstName') || '';
  const lastName  = localStorage.getItem('lastName')  || '';
  const myName    = `${firstName} ${lastName}`.trim() || 'Professional';

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => { applyFiltersAndSort(); }, [sessions, searchTerm, statusFilter, dateRange, sortBy]);

  const maskEmail = (email) => {
    if (!email) return 'N/A';
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    if (localPart.length <= 2) return `${localPart}***@${domain}`;
    const maskedLocal = localPart.substring(0, 2) + '***';
    return `${maskedLocal}@${domain}`;
  };

  const getClientName = (client) => {
    if (!client) return 'N/A';
    const firstNameVal = client.firstName || client.FirstName || client.first_name || client.clientFirstName || '';
    const lastNameVal = client.lastName || client.LastName || client.last_name || client.clientLastName || '';
    const fullName = client.fullName || client.FullName || client.clientName || client.ClientName || '';
    
    if (firstNameVal && lastNameVal) return `${firstNameVal} ${lastNameVal}`.trim();
    if (firstNameVal) return firstNameVal;
    if (fullName) return fullName;
    return client.email || client.Email || 'N/A';
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await API.get('/session/my-sessions');
      console.log('Session data:', response.data);
      
      const normalized = response.data.map(s => {
        let clientData = null;
        let rawClient = s.client ?? s.Client ?? s.user ?? s.User ?? null;
        
        if (rawClient) {
          clientData = {
            id:        rawClient.id        ?? rawClient.Id,
            firstName: rawClient.firstName ?? rawClient.FirstName ?? rawClient.first_name ?? rawClient.clientFirstName ?? '',
            lastName:  rawClient.lastName  ?? rawClient.LastName  ?? rawClient.last_name  ?? rawClient.clientLastName ?? '',
            fullName:  rawClient.fullName  ?? rawClient.FullName  ?? rawClient.clientName ?? rawClient.ClientName ?? '',
            email:     rawClient.email     ?? rawClient.Email
          };
        }
        
        const directClientName = s.clientName ?? s.ClientName ?? s.client_full_name ?? '';
        
        return {
          id:              s.id              ?? s.Id,
          sessionDate:     s.sessionDate     ?? s.SessionDate,
          formattedDate:   s.formattedDate   ?? s.FormattedDate,
          status:          s.status          ?? s.Status,
          paymentStatus:   s.paymentStatus   ?? s.PaymentStatus,
          paymentReference: s.paymentReference ?? s.PaymentReference,
          amount:          1500,
          notes:           s.notes           ?? s.Notes ?? s.clientNotes ?? '',
          createdAt:       s.createdAt       ?? s.CreatedAt,
          meetingUrl:      s.meetingUrl      ?? s.MeetingUrl,
          meetingRoomName: s.meetingRoomName ?? s.MeetingRoomName,
          client: clientData,
          directClientName: directClientName
        };
      });
      
      console.log('Normalized sessions:', normalized);
      setSessions(normalized);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Could not load sessions.');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...sessions];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        const clientName = s.client ? getClientName(s.client) : s.directClientName;
        return clientName.toLowerCase().includes(term) ||
          (s.client?.email || '').toLowerCase().includes(term);
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
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
      const dateA   = new Date(a.sessionDate);
      const dateB   = new Date(b.sessionDate);
      const amountA = a.amount || 0;
      const amountB = b.amount || 0;
      switch (sortBy) {
        case 'date_asc':    return dateA - dateB;
        case 'date_desc':   return dateB - dateA;
        case 'amount_asc':  return amountA - amountB;
        case 'amount_desc': return amountB - amountA;
        default:            return dateB - dateA;
      }
    });

    setFilteredSessions(filtered);
  };

  const isSessionActive = (sessionDateStr) => {
    const start    = new Date(sessionDateStr);
    const end      = new Date(start.getTime() + 60 * 60 * 1000);
    const joinFrom = new Date(start.getTime() - 10 * 60 * 1000);
    const now      = new Date();
    return now >= joinFrom && now <= end;
  };

  const handleStatusUpdate = async (sessionId, newStatus) => {
    setUpdatingId(sessionId);
    setError('');
    setSuccess('');
    try {
      const response = await API.put(`/session/${sessionId}/status`, { status: newStatus });
      const meetingCreated = newStatus === 'Confirmed' && response.data?.meetingUrl;
      setSuccess(
        meetingCreated
          ? 'Session confirmed! Video meeting room created. Client can now make payment.'
          : `Session ${newStatus.toLowerCase()} successfully.`
      );
      fetchSessions();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data ?? 'Update failed.';
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setUpdatingId(null);
    }
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

  const exportToExcel = () => {
    const exportData = filteredSessions.map(session => {
      const clientName = session.client ? getClientName(session.client) : (session.directClientName || 'N/A');
      return {
        'Session ID':     session.id,
        'Date':           new Date(session.sessionDate).toLocaleString(),
        'Client':         clientName,
        'Client Email':   session.client?.email || 'N/A',
        'Status':         session.status,
        'Payment Status': session.paymentStatus,
        'Amount (KSh)':   1500,
        'Notes':          session.notes || ''
      };
    });

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

      const tableData = filteredSessions.map(session => {
        const clientName = session.client ? getClientName(session.client) : (session.directClientName || 'N/A');
        return [
          session.id.toString(),
          new Date(session.sessionDate).toLocaleDateString(),
          clientName,
          session.client?.email || 'N/A',
          session.status,
          session.paymentStatus,
          `KSh 1,500`,
          session.notes || ''
        ];
      });

      doc.autoTable({
        startY: 45,
        head: [['ID', 'Date', 'Client', 'Email', 'Status', 'Payment', 'Amount', 'Notes']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      doc.save(`my_sessions_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
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

  const statusColor = (s) => {
    switch (s) {
      case 'Confirmed': return { bg: 'rgba(156,39,176,0.12)', color: PURPLE,    text: '✓ Confirmed' };
      case 'Pending':   return { bg: 'rgba(233,30,140,0.12)', color: PINK,      text: '⏳ Pending'  };
      case 'Completed': return { bg: 'rgba(76,175,80,0.12)',  color: '#4caf50', text: '✓ Completed' };
      case 'Cancelled': return { bg: 'rgba(239,83,80,0.12)', color: '#e53e3e', text: '✗ Cancelled' };
      default:          return { bg: 'var(--bg-secondary)',   color: 'var(--text-secondary)', text: s };
    }
  };

  const paymentColor = (s) => {
    switch (s) {
      case 'Paid':    return { bg: 'rgba(76,175,80,0.12)',  color: '#4caf50',  text: '💰 Paid'    };
      case 'Pending': return { bg: 'rgba(255,152,0,0.12)', color: '#ff9800',  text: '💳 Pending' };
      case 'Failed':  return { bg: 'rgba(233,30,140,0.12)', color: PINK,      text: '⚠️ Failed'  };
      default:        return { bg: 'var(--bg-secondary)',   color: 'var(--text-secondary)', text: s };
    }
  };

  const getStats = () => {
    const total    = filteredSessions.length;
    const pending  = filteredSessions.filter(s => s.status === 'Pending').length;
    const confirmed = filteredSessions.filter(s => s.status === 'Confirmed').length;
    const completed = filteredSessions.filter(s => s.status === 'Completed').length;
    const totalEarnings = filteredSessions
      .filter(s => s.paymentStatus === 'Paid')
      .reduce((sum) => sum + 1500, 0);
    return { total, pending, confirmed, completed, totalEarnings };
  };

  const stats = getStats();

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text-primary)',
    fontSize: 13, fontFamily: 'inherit'
  };

  const handleViewHistory = (clientId) => {
    if (!clientId) {
      console.error('No client ID available');
      setError('Cannot view history: Client information missing');
      return;
    }
    console.log('Navigating to history for client:', clientId);
    navigate(`/professional-assessment-history/${clientId}`);
  };

  const NotesModal = ({ notes, onClose, clientName }) => {
    if (!notes) return null;
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 16,
            maxWidth: 500,
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: 24,
            border: `2px solid ${PINK}`
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, color: PINK }}>📝 Client Notes</h3>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>
          </div>
          <div
            style={{
              background: 'rgba(233,30,140,0.05)',
              padding: 16,
              borderRadius: 12,
              borderLeft: `4px solid ${PINK}`
            }}
          >
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
              {notes}
            </p>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
            From: {clientName}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: `3px solid var(--border)`,
            borderTop: `3px solid ${PINK}`,
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Loading sessions...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 20px' }}>
      {/* Notes Modal */}
      {expandedNotes && (
        <NotesModal
          notes={expandedNotes.notes}
          onClose={() => setExpandedNotes(null)}
          clientName={expandedNotes.clientName}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>My Sessions</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Manage your client appointments</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent',
              color: PINK,
              border: `1.5px solid ${PINK}`,
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              borderRadius: 8
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
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div
          style={{
            background: 'rgba(233,30,140,0.1)',
            color: PINK,
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            border: `1px solid ${PINK}`
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            background: 'rgba(156,39,176,0.1)',
            color: PURPLE,
            padding: '12px 16px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            border: `1px solid ${PURPLE}`
          }}
        >
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        {[
          { label: 'Total Sessions', value: stats.total, color: PINK },
          { label: 'Pending', value: stats.pending, color: '#ff9800' },
          { label: 'Confirmed', value: stats.confirmed, color: PURPLE },
          { label: 'Completed', value: stats.completed, color: '#4caf50' },
          { label: 'Total Earnings', value: `KSh ${stats.totalEarnings.toLocaleString()}`, color: '#4caf50' }
        ].map(cardItem => (
          <div
            key={cardItem.label}
            style={{
              background: 'var(--bg-card)',
              borderRadius: 12,
              padding: 16,
              border: '1px solid var(--border)'
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{cardItem.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: cardItem.color, margin: 0 }}>{cardItem.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Panel */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 12,
          padding: 20,
          border: '1px solid var(--border)',
          marginBottom: 24
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
          🔍 Filters & Search
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16
          }}
        >
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Search Client
            </label>
            <input
              type="text"
              placeholder="Name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Sort By
            </label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={inputStyle}>
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="amount_desc">Amount (Highest First)</option>
              <option value="amount_asc">Amount (Lowest First)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDateRange({ start: '', end: '' });
              setSortBy('date_desc');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            Clear Filters
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(v => !v)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 13
              }}
            >
              📥 Export
            </button>
            {showExportMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  zIndex: 20,
                  minWidth: 140,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
                }}
              >
                <button
                  onClick={exportToExcel}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontSize: 13
                  }}
                >
                  📊 Excel
                </button>
                <button
                  onClick={exportToPDF}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: 'var(--text-primary)',
                    fontSize: 13
                  }}
                >
                  📄 PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      {filteredSessions.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 12,
            padding: '48px 24px',
            textAlign: 'center',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
          <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>No sessions found</h3>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Try adjusting your filters or check back later for new sessions.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1100 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                  {['ID', 'Client', 'Email', 'Date & Time', 'Amount', 'Status', 'Payment', 'Notes', 'Actions'].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '14px 16px',
                        textAlign: h === 'Amount' || h === 'Status' || h === 'Payment' || h === 'Actions' ? 'center' : 'left',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(session => {
                  const clientName = session.client ? getClientName(session.client) : (session.directClientName || 'N/A');
                  const maskedEmail = maskEmail(session.client?.email);
                  const ss = statusColor(session.status);
                  const ps = paymentColor(session.paymentStatus);
                  const isCompleted = session.status === 'Completed';
                  const canJoinVideo = session.status === 'Confirmed' && !!session.meetingUrl && session.paymentStatus === 'Paid' && !isCompleted;
                  const active = isSessionActive(session.sessionDate);
                  const isPending = session.status === 'Pending';
                  const isConfirmed = session.status === 'Confirmed';
                  const isUpdating = updatingId === session.id;

                  return (
                    <tr
                      key={session.id}
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        #{session.id}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {clientName}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {maskedEmail}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {formatDate(session.sessionDate)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: PINK, whiteSpace: 'nowrap' }}>
                        KSh 1,500
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: ss.bg,
                            color: ss.color,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {ss.text}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            background: ps.bg,
                            color: ps.color,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {ps.text}
                        </span>
                      </td>

                      {/* NOTES COLUMN - Clickable to expand */}
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 250 }}>
                        {session.notes ? (
                          <button
                            onClick={() => setExpandedNotes({ notes: session.notes, clientName: clientName })}
                            style={{
                              display: 'inline-block',
                              padding: '4px 12px',
                              background: 'rgba(233,30,140,0.1)',
                              borderRadius: 6,
                              fontSize: 11,
                              color: PINK,
                              cursor: 'pointer',
                              border: 'none',
                              width: '100%',
                              textAlign: 'left'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(233,30,140,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(233,30,140,0.1)')}
                          >
                            📝 {session.notes.length > 40 ? session.notes.substring(0, 40) + '... Click to expand' : session.notes}
                          </button>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 11, fontStyle: 'italic' }}>— No notes —</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(session.id, 'Confirmed')}
                                disabled={isUpdating}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  border: 'none',
                                  background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                                  color: 'white',
                                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  opacity: isUpdating ? 0.6 : 1,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {isUpdating ? '...' : '✓ Confirm'}
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(session.id, 'Cancelled')}
                                disabled={isUpdating}
                                style={{
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  border: `1px solid ${PINK}`,
                                  background: 'transparent',
                                  color: PINK,
                                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  opacity: isUpdating ? 0.6 : 1,
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                ✗ Cancel
                              </button>
                            </>
                          )}

                          {/* Mark as Completed for past confirmed sessions - Only show if not already completed */}
                          {isConfirmed && !isCompleted && new Date(session.sessionDate) <= new Date() && (
                            <button
                              onClick={() => handleStatusUpdate(session.id, 'Completed')}
                              disabled={isUpdating}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: 'rgba(76,175,80,0.15)',
                                color: '#4caf50',
                                cursor: isUpdating ? 'not-allowed' : 'pointer',
                                fontSize: 12,
                                fontWeight: 500,
                                opacity: isUpdating ? 0.6 : 1,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {isUpdating ? '...' : '✓ Complete'}
                            </button>
                          )}

                          {/* Join Video Call - HIDDEN for completed sessions */}
                          {canJoinVideo && !isCompleted && (
                            <button
                              onClick={() => {
                                if (!active) return;
                                setSelectedMeetingUrl(session.meetingUrl);
                                setShowVideoCall(true);
                              }}
                              disabled={!active}
                              title={active ? 'Join Video Session' : 'Opens 10 minutes before session'}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: active ? `linear-gradient(135deg, ${PINK}, ${PURPLE})` : 'var(--bg-secondary)',
                                color: active ? 'white' : 'var(--text-muted)',
                                cursor: active ? 'pointer' : 'not-allowed',
                                fontSize: 12,
                                fontWeight: 500,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              📹 {active ? 'Join Call' : 'Join (inactive)'}
                            </button>
                          )}

                          {/* View Receipt button for paid sessions */}
                          {session.paymentStatus === 'Paid' && (
                            <button
                              onClick={() => openReceiptModal(session)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                border: `1px solid ${PURPLE}`,
                                background: 'transparent',
                                color: PURPLE,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 500,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              🧾 Receipt
                            </button>
                          )}

                          {/* View Assessment History button - HIDDEN for completed sessions */}
                          {session.client && session.client.id && !isCompleted && (
                            <button
                              onClick={() => handleViewHistory(session.client.id)}
                              style={{
                                padding: '5px 12px',
                                borderRadius: 6,
                                border: `1px solid ${PURPLE}`,
                                background: 'transparent',
                                color: PURPLE,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 500,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              📊 History
                            </button>
                          )}

                          {session.status === 'Completed' && (
                            <span style={{ fontSize: 11, color: '#4caf50', whiteSpace: 'nowrap' }}>✓ Done</span>
                          )}
                          {session.status === 'Cancelled' && (
                            <span style={{ fontSize: 11, color: '#e53e3e', whiteSpace: 'nowrap' }}>✗ Cancelled</span>
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
      )}

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Showing {filteredSessions.length} of {sessions.length} sessions
      </div>

      {/* Video Call Modal */}
      {showVideoCall && selectedMeetingUrl && (
        <VideoCall
          roomUrl={selectedMeetingUrl}
          userName={myName}
          onLeave={() => {
            setShowVideoCall(false);
            setSelectedMeetingUrl('');
            fetchSessions();
          }}
        />
      )}

      {/* Receipt Modal */}
      {receiptModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }}
          onClick={() => setReceiptModal(null)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: 18,
              maxWidth: 460,
              width: '100%',
              border: `1.5px solid ${PINK}`,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div id="receipt-content" style={{ padding: 32, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: PURPLE, margin: 0 }}>🧾 Payment Receipt</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Session Payment Confirmation
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: `linear-gradient(135deg, ${PINK_LIGHT}, ${PURPLE_LIGHT})`,
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 20
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🧾</div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: PURPLE, margin: 0 }}>
                    Kaizen Mental Health Platform
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Official Payment Receipt
                  </p>
                </div>

                <div style={{ height: 1, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, marginBottom: 16 }} />

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Receipt Number</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    KZN-{receiptModal.id}-{new Date(receiptModal.sessionDate).getFullYear()}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Transaction Date</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {new Date(receiptModal.sessionDate).toLocaleString('en-KE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Client</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: PURPLE, margin: '4px 0 0' }}>
                    {receiptModal.client ? getClientName(receiptModal.client) : (receiptModal.directClientName || 'N/A')}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Client Notes</p>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      margin: '4px 0 0',
                      fontStyle: receiptModal.notes ? 'normal' : 'italic'
                    }}
                  >
                    {receiptModal.notes || 'No notes provided'}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Session Date & Time</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {formatDate(receiptModal.sessionDate)}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Method</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    💳 M-Pesa
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Status</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#4caf50', margin: '4px 0 0' }}>✓ Paid</p>
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      Total Amount
                    </p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: PINK, margin: 0 }}>KSh 1,500</p>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                  Thank you for choosing Kaizen. This receipt serves as proof of payment.
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  For any inquiries, please contact support@kaizen.com
                </p>
              </div>
            </div>

            <div style={{ padding: '0 32px 32px 32px', borderTop: '1px solid var(--border)', paddingTop: 24 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setReceiptModal(null)}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    background: 'transparent',
                    color: PINK,
                    border: `1.5px solid ${PINK}`,
                    borderRadius: 10,
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer'
                  }}
                >
                  🖨️ Print
                </button>
                <button
                  onClick={downloadReceiptAsPDF}
                  disabled={downloadLoading}
                  style={{
                    flex: 1,
                    padding: '11px 0',
                    fontSize: 14,
                    fontWeight: 600,
                    background: downloadLoading ? 'var(--border)' : `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: downloadLoading ? 'not-allowed' : 'pointer',
                    opacity: downloadLoading ? 0.6 : 1
                  }}
                >
                  {downloadLoading ? 'Downloading...' : '📥 Download PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}