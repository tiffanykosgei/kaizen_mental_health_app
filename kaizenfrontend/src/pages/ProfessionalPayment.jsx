import { useState, useEffect } from 'react';
import API from '../api/axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Conversion factor: backend returns values in units of KES 10,
// so multiplying by 150 gives the correct amount based on KES 1,500 per session.
const CONVERSION_FACTOR = 150;
const PINK = '#e91e8c';
const PURPLE = '#9c27b0';
const PINK_LIGHT = 'rgba(233,30,140,0.1)';
const PURPLE_LIGHT = 'rgba(156,39,176,0.1)';

export default function ProfessionalPayment() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('setup');
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [receiptModal, setReceiptModal] = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const [savedAccount, setSavedAccount] = useState('');

  const [formMethod, setFormMethod] = useState('Mpesa');
  const [formAccount, setFormAccount] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formAccountName, setFormAccountName] = useState('');

  const [earnings, setEarnings] = useState({
    totalEarned: 0,
    pendingPayout: 0,
    paidOut: 0,
    totalSessions: 0,
    averageRating: 0,
    currentSplitPercentage: 60
  });
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [nextPayoutDate, setNextPayoutDate] = useState('');
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [historySearchBy, setHistorySearchBy] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyDateRange, setHistoryDateRange] = useState({ start: '', end: '' });
  const [historyMinAmount, setHistoryMinAmount] = useState('');
  const [historyMaxAmount, setHistoryMaxAmount] = useState('');
  const [historySortBy, setHistorySortBy] = useState('date_desc');

  // Helper to convert amounts
  const convertAmount = (value) => (value || 0) * CONVERSION_FACTOR;

  useEffect(() => {
    loadData();
    fetchPayoutHistory();
    calculateNextPayoutDate();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const profileRes = await API.get('/professional/profile');
      const data = profileRes.data;
      const profile = data.Profile || data.profile || {};

      const account = profile.paymentAccount || '';
      const method  = profile.paymentMethod  || 'Mpesa';

      setSavedAccount(account);

      if (account.includes('|')) {
        const parts = account.split('|');
        setFormMethod('Bank');
        setFormBankName(parts[0]    || '');
        setFormAccountNumber(parts[1] || '');
        setFormAccountName(parts[2]  || '');
        setFormAccount('');
      } else {
        setFormMethod(method);
        setFormAccount(account);
        setFormBankName('');
        setFormAccountNumber('');
        setFormAccountName('');
      }

      const earningsRes = await API.get('/payment/my-earnings');
      const rawEarnings = earningsRes.data;
      // Convert amounts
      setEarnings({
        ...rawEarnings,
        totalEarned: convertAmount(rawEarnings.totalEarned),
        pendingPayout: convertAmount(rawEarnings.pendingPayout),
        paidOut: convertAmount(rawEarnings.paidOut),
        totalSessions: rawEarnings.totalSessions || 0,
        averageRating: rawEarnings.averageRating || 0,
        currentSplitPercentage: rawEarnings.currentSplitPercentage || 60
      });

    } catch (err) {
      console.error('Failed to load professional data:', err);
      setError('Could not load your payment information.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutHistory = async () => {
    try {
      const res = await API.get('/payment/payout-history');
      // Convert amounts in each payout entry
      const convertedHistory = (res.data || []).map(payout => ({
        ...payout,
        amount: convertAmount(payout.amount)
      }));
      setPayoutHistory(convertedHistory);
    } catch (err) {
      console.error('Failed to fetch payout history:', err);
    }
  };

  const calculateNextPayoutDate = () => {
    const today = new Date();
    const day = today.getDate();
    let next = day < 15
      ? new Date(today.getFullYear(), today.getMonth(), 15)
      : new Date(today.getFullYear(), today.getMonth() + 1, 1);
    if (next < today) next = new Date(next.getTime() + 14 * 24 * 60 * 60 * 1000);
    setNextPayoutDate(next.toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric'
    }));
  };

  const openReceiptModal = (payout) => {
    setReceiptModal(payout);
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
      
      pdf.save(`payout_receipt_${receiptModal.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download receipt. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    let accountValue = formAccount;

    if (formMethod === 'Bank') {
      if (!formBankName || !formAccountNumber || !formAccountName) {
        setError('Please fill in all bank details.');
        setSaving(false);
        return;
      }
      accountValue = `${formBankName}|${formAccountNumber}|${formAccountName}`;
    } else {
      if (!formAccount || formAccount.replace(/\s/g, '').length < 10) {
        setError('Please enter a valid M-Pesa phone number (e.g., 254712345678).');
        setSaving(false);
        return;
      }
    }

    try {
      await API.put('/payment/update-payment-method', {
        paymentMethod: formMethod,
        paymentAccount: accountValue
      });

      setSavedAccount(accountValue);
      setShowUpdateForm(false);
      setSuccess('Payment method saved successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Save error:', err);
      setError(err.response?.data?.message || 'Failed to save payment method.');
    } finally {
      setSaving(false);
    }
  };

  const getCurrentMethodDisplay = () => {
    if (!savedAccount) return null;
    if (savedAccount.includes('|')) {
      const [bank, accNum, accName] = savedAccount.split('|');
      // Mask account number for privacy
      const maskedAccNum = accNum.length > 4 
        ? `****${accNum.slice(-4)}` 
        : `****${accNum}`;
      return {
        label: '🏦 Bank Transfer',
        detail: `${bank} — ${maskedAccNum}`,
        sub: `Account name: ${accName}`
      };
    }
    // Mask M-Pesa number
    const maskedPhone = savedAccount.length > 4 
      ? `****${savedAccount.slice(-4)}` 
      : `****${savedAccount}`;
    return { label: '📱 M-Pesa', detail: maskedPhone, sub: null };
  };

  const currentMethod = getCurrentMethodDisplay();

  const formatCurrency = (n) => `KSh ${(n || 0).toLocaleString()}`;
  const formatDate = (d) => new Date(d).toLocaleDateString('en-KE', {
    year: 'numeric', month: 'short', day: 'numeric'
  });

  const getFilteredPayoutHistory = () => {
    let filtered = [...payoutHistory];

    if (historySearchTerm) {
      const term = historySearchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        const values = {
          id: String(p.id || ''),
          method: String(p.method || ''),
          status: String(p.status || ''),
          amount: String(p.amount || ''),
          date: p.date ? formatDate(p.date) : ''
        };
        if (historySearchBy === 'all') return Object.values(values).some(value => value.toLowerCase().includes(term));
        return values[historySearchBy]?.toLowerCase().includes(term);
      });
    }

    if (historyStatusFilter !== 'all') filtered = filtered.filter(p => p.status === historyStatusFilter);
    if (historyDateRange.start) filtered = filtered.filter(p => new Date(p.date) >= new Date(historyDateRange.start));
    if (historyDateRange.end) {
      const end = new Date(historyDateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => new Date(p.date) <= end);
    }
    if (historyMinAmount) filtered = filtered.filter(p => (p.amount || 0) >= parseFloat(historyMinAmount));
    if (historyMaxAmount) filtered = filtered.filter(p => (p.amount || 0) <= parseFloat(historyMaxAmount));

    filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      switch (historySortBy) {
        case 'date_asc': return dateA - dateB;
        case 'amount_desc': return (b.amount || 0) - (a.amount || 0);
        case 'amount_asc': return (a.amount || 0) - (b.amount || 0);
        case 'method_asc': return String(a.method || '').localeCompare(String(b.method || ''));
        case 'status_asc': return String(a.status || '').localeCompare(String(b.status || ''));
        default: return dateB - dateA;
      }
    });

    return filtered;
  };

  const filteredPayoutHistory = getFilteredPayoutHistory();

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
      Loading your payment information...
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          Payment Settings
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Manage your payment method and track your earnings
        </p>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {[
          { key: 'setup',    label: 'Payment Setup' },
          { key: 'earnings', label: 'My Earnings' },
          { key: 'history',  label: 'Payout History' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: 'transparent', border: 'none', width: 'auto',
            padding: '10px 0', marginRight: 24, cursor: 'pointer', fontSize: 14,
            color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: activeTab === tab.key ? 600 : 400,
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '10px 14px',
          borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}
      {success && (
        <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '10px 14px',
          borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{success}</div>
      )}

      {activeTab === 'setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>
              Current Payment Method
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px' }}>
              This is how you will receive your session earnings
            </p>

            {currentMethod ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: 'var(--success-bg)', borderRadius: 10,
                border: '1px solid var(--secondary)' }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--success-text)', margin: '0 0 6px', fontWeight: 500 }}>
                    ✓ Active
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--success-text)', margin: 0 }}>
                    {currentMethod.label} — {currentMethod.detail}
                  </p>
                  {currentMethod.sub && (
                    <p style={{ fontSize: 12, color: 'var(--success-text)', margin: '4px 0 0' }}>
                      {currentMethod.sub}
                    </p>
                  )}
                </div>
                <button onClick={() => setShowUpdateForm(p => !p)} style={{
                  flexShrink: 0, marginLeft: 16, background: 'transparent',
                  color: 'var(--success-text)', border: '1px solid var(--secondary)', width: 'auto',
                  padding: '8px 18px', fontSize: 13, borderRadius: 8, cursor: 'pointer'
                }}>
                  {showUpdateForm ? 'Cancel' : 'Update'}
                </button>
              </div>
            ) : (
              <div style={{ padding: 20, background: 'var(--warning-bg)', borderRadius: 10,
                border: '1px solid var(--warning-text)', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--warning-text)', margin: 0 }}>
                  ⚠️ No payment method set up yet. Add one below to receive your earnings.
                </p>
              </div>
            )}
          </div>

          {(!currentMethod || showUpdateForm) && (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                {currentMethod ? 'Update Payment Method' : 'Set Up Payment Method'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 24px' }}>
                Choose how you want to receive your session earnings
              </p>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                  marginBottom: 10, color: 'var(--text-secondary)' }}>Select Payment Method</label>
                <div style={{ display: 'flex', gap: 24 }}>
                  {[
                    { value: 'Mpesa', label: '📱 M-Pesa' },
                    { value: 'Bank',  label: '🏦 Bank Transfer' },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center',
                      gap: 8, cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)' }}>
                      <input type="radio" value={opt.value}
                        checked={formMethod === opt.value}
                        onChange={() => {
                          setFormMethod(opt.value);
                          if (opt.value === 'Mpesa') {
                            setFormBankName('');
                            setFormAccountNumber('');
                            setFormAccountName('');
                          } else {
                            setFormAccount('');
                          }
                        }}
                        style={{ width: 'auto', margin: 0 }} />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>

              {formMethod === 'Mpesa' && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                    marginBottom: 8, color: 'var(--text-secondary)' }}>M-Pesa Phone Number</label>
                  <input type="tel" value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value)}
                    placeholder="254712345678"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)',
                      borderRadius: 8, fontSize: 14, background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Format: 254 followed by 9 digits
                  </p>
                </div>
              )}

              {formMethod === 'Bank' && (
                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                      marginBottom: 8, color: 'var(--text-secondary)' }}>Bank Name</label>
                    <select value={formBankName} onChange={(e) => setFormBankName(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)',
                        borderRadius: 8, fontSize: 14, background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                      <option value="">Select Bank</option>
                      {['Equity Bank','KCB Bank','Cooperative Bank','Stanbic Bank',
                        'ABSA Bank','NCBA Bank','I&M Bank','Family Bank'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                      marginBottom: 8, color: 'var(--text-secondary)' }}>Account Number</label>
                    <input type="text" value={formAccountNumber}
                      onChange={(e) => setFormAccountNumber(e.target.value)}
                      placeholder="Your bank account number"
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)',
                        borderRadius: 8, fontSize: 14, background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                      marginBottom: 8, color: 'var(--text-secondary)' }}>Account Name</label>
                    <input type="text" value={formAccountName}
                      onChange={(e) => setFormAccountName(e.target.value)}
                      placeholder="Name on the bank account"
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)',
                        borderRadius: 8, fontSize: 14, background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
              )}

              <button onClick={handleSave} disabled={saving} style={{
                width: '100%', padding: 12, background: 'var(--accent)', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1
              }}>
                {saving ? 'Saving...' : currentMethod ? 'Update Payment Method' : 'Save Payment Method'}
              </button>

              <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px' }}>📅 Payout Schedule</p>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0 }}>
                  Payouts are processed every two weeks. Your next expected payout date is{' '}
                  <strong>{nextPayoutDate}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'earnings' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Total Earnings', value: formatCurrency(earnings.totalEarned),    color: 'var(--success-text)' },
              { label: 'Pending Payout', value: formatCurrency(earnings.pendingPayout),  color: 'var(--warning-text)' },
            ].map(card => (
              <div key={card.label} style={{ background: 'var(--bg-card)', borderRadius: 12,
                padding: 20, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 4px' }}>{card.label}</p>
                <p style={{ fontSize: 28, fontWeight: 600, color: card.color, margin: 0 }}>{card.value}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Paid Out',       value: formatCurrency(earnings.paidOut),        color: 'var(--text-primary)' },
              { label: 'Total Sessions', value: earnings.totalSessions,                  color: 'var(--text-primary)' },
              { label: 'Your Split',     value: `${earnings.currentSplitPercentage}%`,   color: 'var(--accent)' },
            ].map(card => (
              <div key={card.label} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16,
                border: '1px solid var(--border)', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px' }}>{card.label}</p>
                <p style={{ fontSize: 18, fontWeight: 600, color: card.color, margin: 0 }}>{card.value}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: 'var(--text-primary)' }}>
              Performance Rating
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,2,3,4,5].map(star => (
                  <span key={star} style={{ fontSize: 20,
                    color: star <= earnings.averageRating ? '#FFD700' : 'var(--border)' }}>★</span>
                ))}
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                {earnings.averageRating > 0 ? earnings.averageRating.toFixed(1) : 'No ratings yet'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '12px 0 0' }}>
              Your revenue split is based on your average rating. Higher ratings = higher percentage.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div>
          {payoutHistory.length === 0 ? (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '48px 24px',
              textAlign: 'center', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 40, margin: '0 0 12px' }}>💰</p>
              <h3 style={{ fontSize: 18, margin: '0 0 8px', color: 'var(--text-primary)' }}>No payout history yet</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>Your payouts will appear here once processed.</p>
            </div>
          ) : (
            <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <input type="text" placeholder="🔍 Search payout history..." value={historySearchTerm} onChange={(e) => setHistorySearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
              </div>
              <select value={historySearchBy} onChange={(e) => setHistorySearchBy(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="all">All Fields</option>
                <option value="id">Receipt ID</option>
                <option value="method">Method</option>
                <option value="status">Status</option>
                <option value="amount">Amount</option>
                <option value="date">Date</option>
              </select>
              <select value={historyStatusFilter} onChange={(e) => setHistoryStatusFilter(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="all">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Pending">Pending</option>
              </select>
              <select value={historySortBy} onChange={(e) => setHistorySortBy(e.target.value)} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="amount_desc">Amount High-Low</option>
                <option value="amount_asc">Amount Low-High</option>
                <option value="method_asc">Method A-Z</option>
                <option value="status_asc">Status A-Z</option>
              </select>
              <input type="date" value={historyDateRange.start} onChange={(e) => setHistoryDateRange({ ...historyDateRange, start: e.target.value })} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
              <input type="date" value={historyDateRange.end} onChange={(e) => setHistoryDateRange({ ...historyDateRange, end: e.target.value })} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
              <input type="number" placeholder="Min KSh" value={historyMinAmount} onChange={(e) => setHistoryMinAmount(e.target.value)} style={{ width: 100, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
              <input type="number" placeholder="Max KSh" value={historyMaxAmount} onChange={(e) => setHistoryMaxAmount(e.target.value)} style={{ width: 100, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }} />
              {(historySearchTerm || historySearchBy !== 'all' || historyStatusFilter !== 'all' || historyDateRange.start || historyDateRange.end || historyMinAmount || historyMaxAmount || historySortBy !== 'date_desc') && (
                <button onClick={() => { setHistorySearchTerm(''); setHistorySearchBy('all'); setHistoryStatusFilter('all'); setHistoryDateRange({ start: '', end: '' }); setHistoryMinAmount(''); setHistoryMaxAmount(''); setHistorySortBy('date_desc'); }} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
                  Clear Filters
                </button>
              )}
            </div>
            {filteredPayoutHistory.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '32px 24px', textAlign: 'center', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                No payouts match your filters.
              </div>
            ) : (
            <div style={{ background: 'var(--bg-card)', borderRadius: 12,
              border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600,
                        color: 'var(--text-secondary)', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600,
                        color: 'var(--text-secondary)', textAlign: 'right' }}>Amount</th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600,
                        color: 'var(--text-secondary)', textAlign: 'left' }}>Method</th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600,
                        color: 'var(--text-secondary)', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600,
                        color: 'var(--text-secondary)', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayoutHistory.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>
                          {formatDate(p.date)}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13,
                          fontWeight: 600, color: 'var(--success-text)' }}>
                          {formatCurrency(p.amount)}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>
                          {p.method}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                            fontSize: 11, fontWeight: 500,
                            background: p.status === 'Completed' ? 'var(--success-bg)' : 'var(--warning-bg)',
                            color: p.status === 'Completed' ? 'var(--success-text)' : 'var(--warning-text)' }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {p.status === 'Completed' && (
                            <button
                              onClick={() => openReceiptModal(p)}
                              style={{
                                padding: '4px 10px',
                                fontSize: 11,
                                borderRadius: 6,
                                border: 'none',
                                background: '#9c27b0',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                              }}
                            >
                              🧾 Receipt
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
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              Showing {filteredPayoutHistory.length} of {payoutHistory.length} payouts
            </div>
            </>
          )}
          
          {payoutHistory.length > 0 && (
            <div style={{ marginTop: 20, padding: 16, background: 'var(--info-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12, color: 'var(--info-text)', margin: 0, textAlign: 'center' }}>
                💡 Click the "Receipt" button next to any payout to view, download, or print your receipt.
              </p>
            </div>
          )}
        </div>
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
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: PURPLE, margin: 0 }}>🧾 Payout Receipt</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Professional Payment Confirmation
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
                    Official Payout Receipt
                  </p>
                </div>

                <div style={{ height: 1, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, marginBottom: 16 }} />

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Receipt Number</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    PAY-{receiptModal.id}-{Date.now()}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Transaction Date</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {new Date(receiptModal.date).toLocaleString('en-KE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Professional</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: PURPLE, margin: '4px 0 0' }}>
                    {localStorage.getItem('fullName') || 'Professional'}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Method</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {receiptModal.method || 'Manual Transfer'}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payment Account</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {currentMethod?.detail || receiptModal.paymentAccount || 'N/A'}
                  </p>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Payout Status</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#4caf50', margin: '4px 0 0' }}>
                    ✓ {receiptModal.status}
                  </p>
                </div>

                <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '12px 16px', marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      Total Amount
                    </p>
                    <p style={{ fontSize: 20, fontWeight: 700, color: PINK, margin: 0 }}>
                      {formatCurrency(receiptModal.amount)}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
                  Thank you for being a Kaizen Mental Wellness partner.
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  This is an official payout transaction receipt.
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
    </div>
  );
}
