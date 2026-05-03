import { useState, useEffect } from 'react';
import API from '../../api/axios';
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

export default function AdminPayouts() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showManualModal, setShowManualModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [hasPendingFilter, setHasPendingFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => { fetchProfessionals(); }, []);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const res = await API.get('/payment/professional-breakdown');
      // Convert amounts from backend (based on KES 10) to KES 1500
      // totalEarned = number of sessions * 900 (60% of 1500)
      // pendingPayout = backend pending * CONVERSION_FACTOR (converts from old system to new)
      // paidOut = backend paidOut * CONVERSION_FACTOR (converts from old system to new)
      const updatedProfessionals = (res.data.professionals || []).map(pro => ({
        ...pro,
        totalEarned: (pro.totalSessions || 0) * 900,
        platformFees: (pro.totalSessions || 0) * 600,
        pendingPayout: (pro.pendingPayout || 0) * CONVERSION_FACTOR,
        paidOut: (pro.paidOut || 0) * CONVERSION_FACTOR
      }));
      setProfessionals(updatedProfessionals);
    } catch (err) {
      console.error(err);
      setError('Could not load professional payment data.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProfessionals = () => {
    let filtered = [...professionals];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => p.professionalName.toLowerCase().includes(term) || p.professionalEmail.toLowerCase().includes(term));
    }
    if (minAmount) filtered = filtered.filter(p => p.pendingPayout >= parseFloat(minAmount));
    if (maxAmount) filtered = filtered.filter(p => p.pendingPayout <= parseFloat(maxAmount));
    if (hasPendingFilter === 'has_pending') filtered = filtered.filter(p => p.pendingPayout > 0);
    else if (hasPendingFilter === 'no_pending') filtered = filtered.filter(p => p.pendingPayout === 0);
    return filtered;
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

  // Generate Payout Receipt (for newly processed payouts)
  const generatePayoutReceipt = (professional, amount, sessions, payoutDate = new Date()) => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(233, 30, 140);
      doc.text('Kaizen Mental Wellness', 20, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Professional Payout Receipt', 20, 35);
      doc.text(`Date: ${payoutDate.toLocaleDateString()}`, 20, 45);
      doc.text(`Receipt #: PAY-${professional.professionalId}-${Date.now()}`, 20, 52);
      
      doc.line(20, 58, 190, 58);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Payout Details', 20, 70);
      
      const tableData = [
        ['Professional', professional.professionalName],
        ['Email', professional.professionalEmail],
        ['Payment Method', professional.paymentMethod || 'Manual Transfer'],
        ['Payment Account', professional.paymentAccount || 'N/A'],
        ['Total Amount', `KSh ${amount.toLocaleString()}`],
        ['Sessions Paid', sessions.toString()],
        ['Payment Date', payoutDate.toLocaleString()],
        ['Status', 'Completed']
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
      doc.text('Thank you for being a Kaizen Mental Wellness partner', 20, finalY);
      doc.text('This is a system-generated payout receipt', 20, finalY + 7);
      
      doc.save(`payout_receipt_${professional.professionalName.replace(/\s/g, '_')}_${Date.now()}.pdf`);
      return true;
    } catch (err) {
      console.error('Receipt generation failed:', err);
      return false;
    }
  };

  const exportToExcel = () => {
    const filtered = getFilteredProfessionals();
    const exportData = filtered.map(p => ({ 
      'Professional': p.professionalName, 
      'Email': p.professionalEmail, 
      'Payment Method': p.paymentMethod || 'Not set', 
      'Payment Account': p.paymentAccount || 'Not set', 
      'Total Earned (KSh)': (p.totalSessions || 0) * 900, 
      'Pending Payout (KSh)': p.pendingPayout || 0, 
      'Paid Out (KSh)': p.paidOut || 0, 
      'Total Sessions': p.totalSessions || 0, 
      'Average Rating': p.averageRating || 0, 
      'Split %': p.currentSplitPercentage || 60 
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payouts');
    XLSX.writeFile(wb, `payouts_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    try {
      const filtered = getFilteredProfessionals();
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(233, 30, 140);
      doc.text('Professional Payouts Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Professionals: ${filtered.length}`, 14, 37);
      
      const tableData = filtered.map(p => [
        p.professionalName,
        p.professionalEmail,
        p.paymentMethod || 'Not set',
        `KSh ${((p.totalSessions || 0) * 900).toLocaleString()}`,
        `KSh ${(p.pendingPayout || 0).toLocaleString()}`,
        `KSh ${(p.paidOut || 0).toLocaleString()}`,
        p.totalSessions?.toString() || '0'
      ]);
      
      doc.autoTable({
        startY: 45,
        head: [['Professional', 'Email', 'Method', 'Total Earned', 'Pending', 'Paid Out', 'Sessions']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`payouts_report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
      alert('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Error: ' + err.message);
    }
  };

  const handleProcessPayout = async (professionalId, name, amount, paymentMethod, paymentAccount) => { 
    setShowManualModal({ professionalId, name, amount, paymentMethod, paymentAccount }); 
  };

  const confirmManualPayout = async () => {
    if (!showManualModal) return;
    setProcessingId(showManualModal.professionalId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await API.post(`/admin/professionals/${showManualModal.professionalId}/process-payout`, { 
        notes: `Manual payout processed on ${new Date().toLocaleString()} via ${showManualModal.paymentMethod}` 
      });
      const professional = professionals.find(p => p.professionalId === showManualModal.professionalId);
      if (professional) {
        const payoutReceiptGenerated = generatePayoutReceipt(professional, showManualModal.amount, res.data.sessionsProcessed);
        
        if (!payoutReceiptGenerated) {
          setError('Payment processed but receipt generation had issues. Please check console.');
        }
      }
      setSuccessMsg(`✅ Payout marked as completed for ${showManualModal.name}!\n\nAmount: KSh ${showManualModal.amount.toLocaleString()}\nSessions: ${res.data.sessionsProcessed}\n\n📄 Payout Receipt has been downloaded automatically.\n\n⚠️ IMPORTANT: Remember to send the money to:\n${showManualModal.paymentMethod}: ${maskAccountNumber(showManualModal.paymentAccount, showManualModal.paymentMethod)}`);
      fetchProfessionals();
      setShowManualModal(null);
    } catch (err) { 
      setError(err.response?.data?.message || `Failed to process payout for ${showManualModal.name}.`); 
    } finally { 
      setProcessingId(null); 
    }
  };

  const formatCurrency = (amount) => `KSh ${(amount || 0).toLocaleString()}`;

  const maskAccountNumber = (account, method) => {
    if (!account || account === 'Not set' || account === '') return 'Not set';
    if (method === 'Mpesa' || method === 'M-Pesa') {
      const cleaned = account.replace(/\D/g, '');
      if (cleaned.length <= 4) return `****${cleaned}`;
      return `****${cleaned.slice(-4)}`;
    }
    if (method === 'Bank' || account.includes('|')) {
      if (account.includes('|')) {
        const parts = account.split('|');
        const bankName = parts[0];
        let accountNumber = parts[1] || '';
        if (accountNumber.length <= 4) return `${bankName}|****${accountNumber}`;
        const firstTwo = accountNumber.substring(0, 2);
        const lastFour = accountNumber.slice(-4);
        return `${bankName}|${firstTwo}****${lastFour}`;
      }
      if (account.length <= 4) return `****${account}`;
      const firstTwo = account.substring(0, 2);
      const lastFour = account.slice(-4);
      return `${firstTwo}****${lastFour}`;
    }
    if (account.length <= 4) return `****${account}`;
    const firstTwo = account.substring(0, 2);
    const lastFour = account.slice(-4);
    return `${firstTwo}****${lastFour}`;
  };

  const getFullAccountDisplay = (account, method) => {
    if (!account || account === 'Not set' || account === '') return 'Not specified';
    if (method === 'Bank' && account.includes('|')) {
      const parts = account.split('|');
      return `${parts[0]} | ${parts[1]}`;
    }
    return account;
  };

  const getMethodDisplay = (method, account) => {
    if (!account || account === 'Not set' || account === '') return { label: '⚠️ Not Set', detail: 'Professional needs to add payment method', color: 'var(--error-text)', bg: 'var(--error-bg)' };
    if (method === 'Bank' || (account && account.includes('|'))) {
      const parts = account.split('|');
      const maskedAccount = maskAccountNumber(account, 'Bank');
      const displayDetail = maskedAccount.includes('|') ? maskedAccount : `${parts[0]} | ${maskedAccount}`;
      return { label: '🏦 Bank Transfer', detail: displayDetail, fullDetail: getFullAccountDisplay(account, 'Bank'), color: 'var(--success-text)', bg: 'var(--success-bg)' };
    }
    if (method === 'Mpesa' || method === 'M-Pesa') {
      const maskedPhone = maskAccountNumber(account, 'Mpesa');
      return { label: '📱 M-Pesa', detail: maskedPhone, fullDetail: account, color: 'var(--success-text)', bg: 'var(--success-bg)' };
    }
    return { label: method || 'Not set', detail: maskAccountNumber(account, method), color: 'var(--warning-text)', bg: 'var(--warning-bg)' };
  };

  const ManualPayoutModal = () => {
    if (!showManualModal) return null;
    const fullAccountDisplay = getFullAccountDisplay(showManualModal.paymentAccount, showManualModal.paymentMethod);
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 20, maxWidth: 500, width: '90%', padding: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
          <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: 20 }}>Manual Payout Required</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>You're about to process a payout for <strong>{showManualModal.name}</strong></p>
          <div style={{ background: 'var(--warning-bg)', padding: 16, borderRadius: 12, marginBottom: 20, borderLeft: `4px solid var(--warning-text)` }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--warning-text)' }}>📋 Instructions:</p>
            <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
              <li>Send <strong>{formatCurrency(showManualModal.amount)}</strong> to the professional via their payment method below</li>
              <li>Confirm the transaction was successful</li>
              <li>Click "Confirm & Mark as Paid" to update the system</li>
              <li>Payout Receipt will be downloaded automatically</li>
            </ol>
          </div>
          <div style={{ background: 'var(--info-bg)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--info-text)' }}>💳 Professional's Payment Details:</p>
            <p style={{ margin: '4px 0', fontSize: 14, color: 'var(--text-primary)' }}><strong>Method:</strong> {showManualModal.paymentMethod || 'Not specified'}</p>
            <p style={{ margin: '4px 0', fontSize: 14, color: 'var(--text-primary)' }}><strong>Account:</strong> {fullAccountDisplay}</p>
            <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Amount to send: <strong style={{ fontSize: 16, color: 'var(--accent)' }}>{formatCurrency(showManualModal.amount)}</strong></p>
          </div>
          <div style={{ background: 'var(--bg-hover)', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
            🔒 This information is shown only to process the payout. Please keep it confidential.
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button onClick={() => setShowManualModal(null)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>Cancel</button>
            <button onClick={confirmManualPayout} disabled={processingId === showManualModal.professionalId} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 500, opacity: processingId === showManualModal.professionalId ? 0.6 : 1 }}>
              {processingId === showManualModal.professionalId ? 'Processing...' : '✓ Confirm & Mark as Paid'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading payment data...</div>;

  const filteredProfessionals = getFilteredProfessionals();
  const professionalsWithPending = filteredProfessionals.filter(p => p.pendingPayout > 0);
  const professionalsWithoutPayment = filteredProfessionals.filter(p => (!p.paymentAccount || p.paymentAccount === 'Not set') && p.pendingPayout > 0);
  const totalPending = filteredProfessionals.reduce((sum, p) => sum + (p.pendingPayout || 0), 0);
  const totalPaid = filteredProfessionals.reduce((sum, p) => sum + (p.paidOut || 0), 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>
      <ManualPayoutModal />
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Professional Payouts</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Process earnings for professionals (Manual Payout Mode)</p>
      </div>
      {error && <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
      {successMsg && <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, whiteSpace: 'pre-line' }}>{successMsg}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input type="text" placeholder="🔍 Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <input type="number" placeholder="Min Pending (KSh)" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} style={{ width: 120, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <input type="number" placeholder="Max Pending (KSh)" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} style={{ width: 120, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <select value={hasPendingFilter} onChange={(e) => setHasPendingFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <option value="all">All Professionals</option>
            <option value="has_pending">Has Pending Payout</option>
            <option value="no_pending">No Pending Payout</option>
          </select>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>📥 Export</button>
          {showExportMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10 }}>
              <button onClick={exportToExcel} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📊 Excel</button>
              <button onClick={exportToPDF} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📄 PDF</button>
            </div>
          )}
        </div>
        {(searchTerm || minAmount || maxAmount || hasPendingFilter !== 'all') && (
          <button onClick={() => { setSearchTerm(''); setMinAmount(''); setMaxAmount(''); setHasPendingFilter('all'); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
      </div>

      {professionalsWithoutPayment.length > 0 && (
        <div style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, borderLeft: `4px solid var(--warning-text)` }}>
          <strong>⚠️ Attention:</strong> {professionalsWithoutPayment.length} professional(s) have pending payouts but no payment method set.
        </div>
      )}

      {filteredProfessionals.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💼</p>
          <p style={{ color: 'var(--text-muted)' }}>No professionals found matching your criteria.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredProfessionals.map(pro => {
            const method = getMethodDisplay(pro.paymentMethod, pro.paymentAccount);
            const hasPending = pro.pendingPayout > 0;
            const hasPaymentMethod = pro.paymentAccount && pro.paymentAccount !== 'Not set' && pro.paymentAccount !== '';
            const hasBeenPaid = (pro.paidOut || 0) > 0;
            
            return (
              <div key={pro.professionalId} style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{pro.professionalName}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0' }}>{pro.professionalEmail}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {pro.averageRating > 0 && <span style={{ fontSize: 13, color: 'var(--warning-text)' }}>★ {pro.averageRating.toFixed(1)}</span>}
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: 'var(--info-bg)', color: 'var(--info-text)' }}>{pro.currentSplitPercentage || 60}% split</span>
                  </div>
                </div>

                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 120 }}>Payment method</span>
                  <span style={{ fontSize: 13, padding: '4px 12px', borderRadius: 6, background: method.bg, color: method.color, fontWeight: 500 }}>{method.label}</span>
                  {method.detail && <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{method.detail}</span>}
                </div>

                <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 2px' }}>Total earned</p>
                      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{formatCurrency((pro.totalSessions || 0) * 900)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 2px' }}>Pending payout</p>
                      <p style={{ fontSize: 16, fontWeight: 600, color: hasPending ? 'var(--warning-text)' : 'var(--text-muted)', margin: 0 }}>{formatCurrency(pro.pendingPayout)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 2px' }}>Paid out</p>
                      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--success-text)', margin: 0 }}>{formatCurrency(pro.paidOut)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 2px' }}>Total sessions</p>
                      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{pro.totalSessions || 0}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {hasBeenPaid && (
                      <button
                        onClick={() => openReceiptModal(pro)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          background: 'linear-gradient(135deg, #9c27b0, #e91e8c)',
                          color: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        🧾 View Receipt
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!hasPaymentMethod) {
                          setError(`${pro.professionalName} needs to add a payment method.`);
                          setTimeout(() => setError(''), 5000);
                          return;
                        }
                        handleProcessPayout(pro.professionalId, pro.professionalName, pro.pendingPayout, pro.paymentMethod, pro.paymentAccount);
                      }}
                      disabled={!hasPending || processingId === pro.professionalId || !hasPaymentMethod}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        border: 'none',
                        cursor: (hasPending && hasPaymentMethod) ? 'pointer' : 'not-allowed',
                        background: (hasPending && hasPaymentMethod) ? 'var(--accent)' : 'var(--bg-hover)',
                        color: (hasPending && hasPaymentMethod) ? 'white' : 'var(--text-muted)',
                        opacity: processingId === pro.professionalId ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {processingId === pro.professionalId ? 'Processing...' : !hasPending ? '✓ No pending payout' : !hasPaymentMethod ? '⚠️ No payment method' : `💸 Pay ${formatCurrency(pro.pendingPayout)}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 32, padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 16, color: 'var(--text-primary)' }}>📊 Payout Summary</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Total Pending (Filtered)</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--warning-text)', margin: 0 }}>{formatCurrency(totalPending)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Total Paid Out</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--success-text)', margin: 0 }}>{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Professionals with Pending</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>{professionalsWithPending.length}</p>
          </div>
        </div>
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
      
      <div style={{ marginTop: 24, padding: 12, background: 'var(--bg-hover)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
        🔒 For security reasons, bank account numbers are partially masked. Full details are only shown when processing a payout.
      </div>
      
      <div style={{ marginTop: 16, padding: 20, background: 'var(--info-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--info-text)' }}>📝 How Manual Payouts Work</h4>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.6 }}>
          <li>Click "Pay" next to a professional with pending earnings</li>
          <li>A modal will show you their payment details (M-Pesa number or Bank account)</li>
          <li>Manually send the money using M-Pesa or your banking app</li>
          <li>After successful transfer, click "Confirm & Mark as Paid"</li>
          <li>The system will mark all pending sessions as paid and download Payout Receipt</li>
          <li>For past payouts, click "View Receipt" to generate a receipt anytime</li>
        </ol>
        <p style={{ marginTop: 12, fontSize: 12, color: 'var(--info-text)' }}>
          💡 <strong>Tip:</strong> Keep the downloaded receipts for your records. Payout receipts can be regenerated anytime.
        </p>
      </div>
    </div>
  );
}