import { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

const PINK = '#e91e8c';
const PURPLE = '#9c27b0';
const PINK_LIGHT = 'rgba(233,30,140,0.1)';
const PURPLE_LIGHT = 'rgba(156,39,176,0.1)';

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0, totalRevenue: 0 });

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await API.get('/Admin/sessions');
      const allSessions = response.data;
      const processedSessions = allSessions.map(session => ({
        ...session,
        amount: 1500,
        platformFee: 600,
        professionalEarning: 900,
        clientName: getClientName(session),
        professionalName: getProfessionalName(session)
      }));
      setSessions(processedSessions);
      const pending = processedSessions.filter(s => s.status === 'Pending').length;
      const confirmed = processedSessions.filter(s => s.status === 'Confirmed').length;
      const completed = processedSessions.filter(s => s.status === 'Completed').length;
      const cancelled = processedSessions.filter(s => s.status === 'Cancelled').length;
      const totalRevenue = processedSessions.filter(s => s.paymentStatus === 'Paid').reduce((sum, s) => sum + (s.platformFee || 600), 0);
      setStats({ total: processedSessions.length, pending, confirmed, completed, cancelled, totalRevenue });
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Could not load sessions.');
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (session) => {
    if (session.client) {
      if (session.client.clientName) return session.client.clientName;
      if (session.client.clientFirstName || session.client.clientLastName) {
        const firstName = session.client.clientFirstName || '';
        const lastName = session.client.clientLastName || '';
        return `${firstName} ${lastName}`.trim();
      }
      if (session.client.firstName || session.client.lastName) {
        const firstName = session.client.firstName || '';
        const lastName = session.client.lastName || '';
        return `${firstName} ${lastName}`.trim();
      }
      if (session.client.fullName) return session.client.fullName;
    }
    if (session.clientName) return session.clientName;
    return 'N/A';
  };

  const getProfessionalName = (session) => {
    if (session.professionals && session.professionals.length > 0) {
      const pro = session.professionals[0];
      if (pro.professionalName) return pro.professionalName;
      if (pro.professionalFirstName || pro.professionalLastName) {
        const firstName = pro.professionalFirstName || '';
        const lastName = pro.professionalLastName || '';
        return `${firstName} ${lastName}`.trim();
      }
      if (pro.firstName || pro.lastName) {
        const firstName = pro.firstName || '';
        const lastName = pro.lastName || '';
        return `${firstName} ${lastName}`.trim();
      }
      if (pro.fullName) return pro.fullName;
    }
    if (session.professional) {
      if (session.professional.professionalName) return session.professional.professionalName;
      if (session.professional.firstName || session.professional.lastName) {
        const firstName = session.professional.firstName || '';
        const lastName = session.professional.lastName || '';
        return `${firstName} ${lastName}`.trim();
      }
      if (session.professional.fullName) return session.professional.fullName;
    }
    if (session.professionalName) return session.professionalName;
    return 'N/A';
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

  const openReceiptModal = (session) => {
    setReceiptModal(session);
  };

  const getFilteredSessions = () => {
    let filtered = [...sessions];
    if (filter !== 'all') filtered = filtered.filter(s => s.status === filter);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.clientName.toLowerCase().includes(term) || s.professionalName.toLowerCase().includes(term));
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
    return filtered;
  };

  const exportToExcel = () => {
    const filtered = getFilteredSessions();
    const exportData = filtered.map(session => ({
      'Session ID': session.id,
      'Date': new Date(session.sessionDate).toLocaleString(),
      'Client': session.clientName,
      'Professional': session.professionalName,
      'Status': session.status,
      'Amount (KSh)': 1500,
      'Platform Fee (KSh)': 600,
      'Professional Earnings (KSh)': 900,
      'Payment Status': session.paymentStatus
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sessions');
    XLSX.writeFile(wb, `sessions_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    try {
      const filtered = getFilteredSessions();
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(233, 30, 140);
      doc.text('Sessions Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Sessions: ${filtered.length}`, 14, 37);
      if (filter !== 'all') doc.text(`Status Filter: ${filter}`, 14, 44);
      
      const startY = filter !== 'all' ? 52 : 45;
      
      const tableData = filtered.map(session => [
        session.id.toString(),
        new Date(session.sessionDate).toLocaleDateString(),
        session.clientName,
        session.professionalName,
        session.status,
        `KSh 1,500`,
        session.paymentStatus
      ]);
      
      doc.autoTable({
        startY: startY,
        head: [['ID', 'Date', 'Client', 'Professional', 'Status', 'Amount', 'Payment']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`sessions_report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
      alert('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Error: ' + err.message);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return { bg: 'rgba(76,175,80,0.12)', color: '#4caf50' };
      case 'Pending':   return { bg: 'rgba(255,152,0,0.12)', color: '#ff9800' };
      case 'Completed': return { bg: 'rgba(76,175,80,0.12)', color: '#4caf50' };
      case 'Cancelled': return { bg: 'rgba(233,30,140,0.12)', color: '#e91e8c' };
      default:          return { bg: 'var(--bg-hover)', color: 'var(--text-secondary)' };
    }
  };

  const getPaymentColor = (status) => {
    switch(status) {
      case 'Paid':    return { bg: 'rgba(76,175,80,0.12)', color: '#4caf50' };
      case 'Pending': return { bg: 'rgba(255,152,0,0.12)', color: '#ff9800' };
      case 'Failed':  return { bg: 'rgba(233,30,140,0.12)', color: '#e91e8c' };
      default:        return { bg: 'var(--bg-hover)', color: 'var(--text-secondary)' };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount) => `KSh ${amount?.toLocaleString() || 0}`;
  const filteredSessions = getFilteredSessions();

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading sessions...</div>;

  if (error) {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>All Sessions</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>View and manage all platform sessions</p>
        <div style={{ background: 'rgba(233,30,140,0.1)', color: '#e91e8c', padding: '20px', borderRadius: 12, textAlign: 'center', border: '1px solid #e91e8c' }}>
          {error}<br />
          <button onClick={fetchSessions} style={{ marginTop: 12, background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>All Sessions</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>View and manage all platform sessions</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatsCard title="Total Sessions" value={stats.total} color="purple" icon="📅" />
        <StatsCard title="Pending" value={stats.pending} color="orange" icon="⏳" />
        <StatsCard title="Confirmed" value={stats.confirmed} color="green" icon="✅" />
        <StatsCard title="Completed" value={stats.completed} color="green" icon="🎉" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Cancelled" value={stats.cancelled} color="red" icon="❌" />
        <StatsCard title="Total Platform Revenue" value={formatCurrency(stats.totalRevenue)} color="purple" icon="💰" />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input type="text" placeholder="🔍 Search by client or professional..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div><input type="date" placeholder="Start Date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} /></div>
        <div><input type="date" placeholder="End Date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} /></div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>📥 Export</button>
          {showExportMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10 }}>
              <button onClick={exportToExcel} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📊 Excel</button>
              <button onClick={exportToPDF} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📄 PDF</button>
            </div>
          )}
        </div>
        {(searchTerm || dateRange.start || dateRange.end || filter !== 'all') && (
          <button onClick={() => { setSearchTerm(''); setDateRange({ start: '', end: '' }); setFilter('all'); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Clear Filters</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12, flexWrap: 'wrap' }}>
        {['all', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map(status => (
          <button key={status} onClick={() => setFilter(status)} style={{ background: filter === status ? 'linear-gradient(135deg, #e91e8c, #9c27b0)' : 'transparent', color: filter === status ? 'white' : 'var(--text-secondary)', border: filter === status ? 'none' : '1.5px solid var(--border)', padding: '6px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: filter === status ? 600 : 500, transition: 'all 0.2s ease' }}>
            {status === 'all' ? `All (${stats.total})` : `${status} (${stats[status.toLowerCase()] || 0})`}
          </button>
        ))}
      </div>

      {filteredSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}><div style={{ fontSize: 48, marginBottom: 16 }}>📭</div><p style={{ color: 'var(--text-muted)' }}>No sessions found matching your criteria</p></div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>ID</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Client</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Professional</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Date & Time</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Amount</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Session Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Payment Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(session => {
                  const statusStyle = getStatusColor(session.status);
                  const paymentStyle = getPaymentColor(session.paymentStatus);
                  return (
                    <tr key={session.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-primary)' }}>#{session.id}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{session.clientName}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{session.professionalName}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{formatDate(session.sessionDate)}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#e91e8c' }}>KSh 1,500</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>{session.status}</span></td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: paymentStyle.bg, color: paymentStyle.color }}>{session.paymentStatus === 'Paid' ? '✓ Paid' : session.paymentStatus === 'Pending' ? '⏳ Pending' : session.paymentStatus}</span></td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {session.paymentStatus === 'Paid' && (
                          <button onClick={() => openReceiptModal(session)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', color: 'white', cursor: 'pointer', fontSize: 11 }}>🧾 View Receipt</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {filteredSessions.length} of {sessions.length} sessions</span></div>
          <div><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Revenue: <strong style={{ color: '#e91e8c', fontSize: 16 }}>{formatCurrency(filteredSessions.filter(s => s.paymentStatus === 'Paid').reduce((sum) => sum + 1500, 0))}</strong></span></div>
        </div>
      </div>

      {/* Receipt Modal */}
      {receiptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setReceiptModal(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, maxWidth: 460, width: '100%', border: `1.5px solid ${PINK}`, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div id="receipt-content" style={{ padding: 32, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: PURPLE, margin: 0 }}>🧾 Payment Receipt</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Session Payment Confirmation</p>
                </div>
              </div>

              <div style={{ background: `linear-gradient(135deg, ${PINK_LIGHT}, ${PURPLE_LIGHT})`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🧾</div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: PURPLE, margin: 0 }}>Kaizen Mental Health Platform</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>Official Payment Receipt</p>
                </div>

                <div style={{ height: 1, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, marginBottom: 16 }} />

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Receipt Number</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>KZN-{receiptModal.id}-{new Date(receiptModal.sessionDate).getFullYear()}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Transaction Date</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {new Date(receiptModal.sessionDate).toLocaleString('en-KE', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Client</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: PURPLE, margin: '4px 0 0' }}>{receiptModal.clientName}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Professional</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: PURPLE, margin: '4px 0 0' }}>{receiptModal.professionalName}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Session Date & Time</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>{formatDate(receiptModal.sessionDate)}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Method</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>💳 M-Pesa</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Status</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#4caf50', margin: '4px 0 0' }}>✓ Paid</p>
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Total Amount</p>
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
                <button onClick={() => setReceiptModal(null)} style={{ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 10, cursor: 'pointer' }}>Close</button>
                <button onClick={() => window.print()} style={{ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer' }}>🖨️ Print</button>
                <button onClick={downloadReceiptAsPDF} disabled={downloadLoading} style={{ flex: 1, padding: '11px 0', fontSize: 14, fontWeight: 600, background: downloadLoading ? 'var(--border)' : `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, cursor: downloadLoading ? 'not-allowed' : 'pointer', opacity: downloadLoading ? 0.6 : 1 }}>{downloadLoading ? 'Downloading...' : '📥 Download PDF'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}