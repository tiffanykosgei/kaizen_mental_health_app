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

// Conversion factor: backend uses KES 10, frontend needs KES 1500
// 1500 / 10 = 150
const CONVERSION_FACTOR = 150;

export default function AdminRevenue() {
  const [summary, setSummary] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [filteredProfessionals, setFilteredProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPro, setSelectedPro] = useState(null);
  const [splitPercentage, setSplitPercentage] = useState('');
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [minEarnings, setMinEarnings] = useState('');
  const [maxEarnings, setMaxEarnings] = useState('');
  const [hasPendingFilter, setHasPendingFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [professionals, searchTerm, sortBy, minEarnings, maxEarnings, hasPendingFilter]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const response = await API.get('/payment/professional-breakdown');
      // Convert amounts from backend (based on KES 10) to KES 1500
      // totalEarned = number of sessions * 900 (60% of 1500)
      // platformFees = number of sessions * 600 (40% of 1500)
      // pendingPayout = backend pending * CONVERSION_FACTOR
      // paidOut = backend paidOut * CONVERSION_FACTOR
      const updatedProfessionals = (response.data.professionals || []).map(pro => ({
        ...pro,
        totalEarned: (pro.totalSessions || 0) * 900,
        platformFees: (pro.totalSessions || 0) * 600,
        pendingPayout: (pro.pendingPayout || 0) * CONVERSION_FACTOR,
        paidOut: (pro.paidOut || 0) * CONVERSION_FACTOR
      }));
      setSummary({
        ...response.data.summary,
        totalPlatformFees: (response.data.summary?.totalPaidSessions || 0) * 600,
        totalProfessionalEarnings: (response.data.summary?.totalPaidSessions || 0) * 900
      });
      setProfessionals(updatedProfessionals);
    } catch (err) {
      console.error(err);
      setError('Could not load revenue data.');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...professionals];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.professionalName?.toLowerCase().includes(term) ||
        p.professionalEmail?.toLowerCase().includes(term)
      );
    }
    
    if (minEarnings) {
      filtered = filtered.filter(p => (p.totalEarned || 0) >= parseFloat(minEarnings));
    }
    if (maxEarnings) {
      filtered = filtered.filter(p => (p.totalEarned || 0) <= parseFloat(maxEarnings));
    }
    
    if (hasPendingFilter === 'has_pending') {
      filtered = filtered.filter(p => (p.pendingPayout || 0) > 0);
    } else if (hasPendingFilter === 'no_pending') {
      filtered = filtered.filter(p => (p.pendingPayout || 0) === 0);
    }
    
    filtered.sort((a, b) => {
      switch(sortBy) {
        case 'name_asc':
          return (a.professionalName || '').localeCompare(b.professionalName || '');
        case 'name_desc':
          return (b.professionalName || '').localeCompare(a.professionalName || '');
        case 'earnings_desc':
          return (b.totalEarned || 0) - (a.totalEarned || 0);
        case 'earnings_asc':
          return (a.totalEarned || 0) - (b.totalEarned || 0);
        case 'pending_desc':
          return (b.pendingPayout || 0) - (a.pendingPayout || 0);
        case 'pending_asc':
          return (a.pendingPayout || 0) - (b.pendingPayout || 0);
        case 'sessions_desc':
          return (b.totalSessions || 0) - (a.totalSessions || 0);
        case 'sessions_asc':
          return (a.totalSessions || 0) - (b.totalSessions || 0);
        default:
          return (a.professionalName || '').localeCompare(b.professionalName || '');
      }
    });
    
    setFilteredProfessionals(filtered);
  };

  const handleUpdateSplit = async () => {
    if (!selectedPro) return;
    const percentage = parseInt(splitPercentage, 10);
    if (isNaN(percentage) || percentage < 40 || percentage > 80) {
      setError('Percentage must be between 40 and 80');
      return;
    }
    
    try {
      await API.post(`/payment/update-professional-split/${selectedPro.professionalId}`, percentage);
      setError('');
      fetchRevenueData();
      setShowSplitModal(false);
      setSelectedPro(null);
      setSplitPercentage('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update split percentage.');
    }
  };

  const openReceiptModal = (professional) => {
    setReceiptModal(professional);
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
      
      pdf.save(`payout_receipt_${receiptModal.professionalName.replace(/\s/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download receipt. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredProfessionals.map(p => ({
      'Professional': p.professionalName,
      'Email': p.professionalEmail,
      'Total Sessions': p.totalSessions || 0,
      'Total Earned (KSh)': (p.totalSessions || 0) * 900,
      'Platform Fee (KSh)': (p.totalSessions || 0) * 600,
      'Pending Payout (KSh)': p.pendingPayout || 0,
      'Paid Out (KSh)': p.paidOut || 0,
      'Split %': p.currentSplitPercentage || 60,
      'Payment Method': p.paymentMethod || 'Not set',
      'Payment Account': p.paymentAccount || 'Not set'
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Revenue Report');
    XLSX.writeFile(wb, `revenue_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(233, 30, 140);
      doc.text('Revenue & Payouts Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Professionals: ${filteredProfessionals.length}`, 14, 37);
      
      if (summary) {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Platform Revenue: ${formatCurrency(filteredSummary.totalPlatformFees)}`, 14, 50);
        doc.text(`Professional Payouts: ${formatCurrency(filteredSummary.totalProfessionalEarnings)}`, 14, 58);
        doc.text(`Paid Sessions: ${filteredSummary.totalPaidSessions}`, 14, 66);
      }
      
      const startY = summary ? 80 : 50;
      
      const tableData = filteredProfessionals.map(p => [
        p.professionalName,
        p.totalSessions?.toString() || '0',
        formatCurrency((p.totalSessions || 0) * 900),
        formatCurrency((p.totalSessions || 0) * 600),
        formatCurrency(p.pendingPayout || 0),
        formatCurrency(p.paidOut || 0),
        `${p.currentSplitPercentage || 60}%`
      ]);
      
      doc.autoTable({
        startY: startY,
        head: [['Professional', 'Sessions', 'Total Earned', 'Platform Fee', 'Pending', 'Paid Out', 'Split']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`revenue_report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
      alert('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Error: ' + err.message);
    }
  };

  const formatCurrency = (amount) => `KSh ${(amount || 0).toLocaleString()}`;

  // Calculate summary for filtered data
  const filteredSummary = {
    totalPlatformFees: filteredProfessionals.reduce((sum, p) => sum + ((p.totalSessions || 0) * 600), 0),
    totalProfessionalEarnings: filteredProfessionals.reduce((sum, p) => sum + ((p.totalSessions || 0) * 900), 0),
    totalPaidSessions: filteredProfessionals.reduce((sum, p) => sum + (p.totalSessions || 0), 0),
    totalPendingPayout: filteredProfessionals.reduce((sum, p) => sum + (p.pendingPayout || 0), 0),
    totalPaidOut: filteredProfessionals.reduce((sum, p) => sum + (p.paidOut || 0), 0)
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading revenue data...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Revenue & Payouts</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Track platform revenue and manage professional payouts</p>

      {error && (
        <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatsCard title="Platform Revenue" value={formatCurrency(filteredSummary.totalPlatformFees)} color="purple" icon="💰" />
        <StatsCard title="Professional Payouts" value={formatCurrency(filteredSummary.totalProfessionalEarnings)} color="green" icon="💸" />
        <StatsCard title="Paid Sessions" value={filteredSummary.totalPaidSessions} color="orange" icon="📅" />
      </div>
      
      {/* Additional Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Total Pending Payout" value={formatCurrency(filteredSummary.totalPendingPayout)} color="warning" icon="⏳" />
        <StatsCard title="Total Paid Out" value={formatCurrency(filteredSummary.totalPaidOut)} color="success" icon="✅" />
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <input
            type="text"
            placeholder="🔍 Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}
          />
        </div>
        <div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="earnings_desc">Earnings (Highest First)</option>
            <option value="earnings_asc">Earnings (Lowest First)</option>
            <option value="pending_desc">Pending (Highest First)</option>
            <option value="pending_asc">Pending (Lowest First)</option>
            <option value="sessions_desc">Sessions (Most First)</option>
            <option value="sessions_asc">Sessions (Least First)</option>
          </select>
        </div>
        <div>
          <input
            type="number"
            placeholder="Min Earnings (KSh)"
            value={minEarnings}
            onChange={(e) => setMinEarnings(e.target.value)}
            style={{ width: 130, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}
          />
        </div>
        <div>
          <input
            type="number"
            placeholder="Max Earnings (KSh)"
            value={maxEarnings}
            onChange={(e) => setMaxEarnings(e.target.value)}
            style={{ width: 130, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}
          />
        </div>
        <div>
          <select value={hasPendingFilter} onChange={(e) => setHasPendingFilter(e.target.value)}
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
            <option value="all">All Professionals</option>
            <option value="has_pending">Has Pending Payout</option>
            <option value="no_pending">No Pending Payout</option>
          </select>
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
        {(searchTerm || sortBy !== 'name_asc' || minEarnings || maxEarnings || hasPendingFilter !== 'all') && (
          <button onClick={() => { setSearchTerm(''); setSortBy('name_asc'); setMinEarnings(''); setMaxEarnings(''); setHasPendingFilter('all'); }}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Professionals Table */}
      {filteredProfessionals.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
          <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>No professionals found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>No professionals match your filter criteria.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Professional</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Sessions</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Total Earned</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Platform Fee</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Pending</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Paid Out</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Split</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfessionals.map(pro => (
                  <tr key={pro.professionalId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{pro.professionalName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pro.professionalEmail}</div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>{pro.totalSessions || 0}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 500, color: '#4caf50' }}>{formatCurrency((pro.totalSessions || 0) * 900)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: '#e91e8c' }}>{formatCurrency((pro.totalSessions || 0) * 600)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 500, color: (pro.pendingPayout || 0) > 0 ? '#ff9800' : 'inherit' }}>
                      {formatCurrency(pro.pendingPayout)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, color: 'var(--text-primary)' }}>{formatCurrency(pro.paidOut)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedPro(pro);
                          setSplitPercentage(pro.customSplitPercentage || pro.currentSplitPercentage);
                          setShowSplitModal(true);
                        }}
                        style={{
                          background: pro.customSplitPercentage ? 'var(--info-bg)' : 'var(--bg-hover)',
                          color: pro.customSplitPercentage ? 'var(--info-text)' : 'var(--text-secondary)',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        {pro.currentSplitPercentage || 60}%
                      </button>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      {(pro.paidOut || 0) > 0 && (
                        <button
                          onClick={() => openReceiptModal(pro)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            borderRadius: 6,
                            border: 'none',
                            background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          🧾 View Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Showing {filteredProfessionals.length} of {professionals.length} professionals
      </div>

      {/* Receipt Modal */}
      {receiptModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setReceiptModal(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 18, maxWidth: 460, width: '100%', border: `1.5px solid ${PINK}`, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div id="receipt-content" style={{ padding: 32, overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: PURPLE, margin: 0 }}>🧾 Payout Receipt</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Professional Payment Confirmation</p>
                </div>
              </div>

              <div style={{ background: `linear-gradient(135deg, ${PINK_LIGHT}, ${PURPLE_LIGHT})`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🧾</div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: PURPLE, margin: 0 }}>Kaizen Mental Health Platform</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 0' }}>Official Payout Receipt</p>
                </div>

                <div style={{ height: 1, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, marginBottom: 16 }} />

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Receipt Number</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>PAY-{receiptModal.professionalId}-{Date.now()}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Transaction Date</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {new Date().toLocaleString('en-KE', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Professional</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: PURPLE, margin: '4px 0 0' }}>{receiptModal.professionalName}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Email</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>{receiptModal.professionalEmail}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Method</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>{receiptModal.paymentMethod || 'Manual Transfer'}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Account</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>{receiptModal.paymentAccount || 'N/A'}</p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Total Sessions</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>{receiptModal.totalSessions || 0}</p>
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Total Amount Paid</p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: PINK, margin: 0 }}>KSh {(receiptModal.paidOut || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                  Thank you for being a Kaizen Mental Wellness partner
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  This is a system-generated payout receipt
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

      {/* Split Modal */}
      {showSplitModal && selectedPro && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <div className="modal-content" style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, maxWidth: 450, width: '90%' }}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>Edit Professional Split</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              {selectedPro.professionalName} — Current split: {selectedPro.currentSplitPercentage}%
            </p>
            
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)' }}>Professional Percentage (40-80%)</label>
              <input
                type="number"
                value={splitPercentage}
                onChange={(e) => setSplitPercentage(e.target.value)}
                min="40"
                max="80"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Platform will receive {100 - (parseInt(splitPercentage, 10) || 60)}%
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleUpdateSplit} style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', color: 'white', border: 'none', cursor: 'pointer' }}>Save Changes</button>
              <button 
                onClick={() => { setShowSplitModal(false); setSelectedPro(null); setSplitPercentage(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}