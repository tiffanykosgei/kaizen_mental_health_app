import { useState, useEffect } from 'react';
import API from '../api/axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function ProfessionalPayment() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('setup');
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  //const [showReceiptModal, setShowReceiptModal] = useState(null);

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
      setEarnings(earningsRes.data);

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
      setPayoutHistory(res.data);
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

  // Generate Payout Receipt
  const generatePayoutReceipt = (payout) => {
    try {
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setTextColor(233, 30, 140);
      doc.text('Kaizen Mental Wellness', 20, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Payout Transaction Receipt', 20, 35);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
      doc.text(`Receipt #: ${payout.reference || `PAY-${payout.id}-${Date.now()}`}`, 20, 52);
      
      doc.line(20, 58, 190, 58);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Transaction Details', 20, 70);
      
      const tableData = [
        ['Transaction ID', payout.reference || `PAY-${payout.id}`],
        ['Payout Date', new Date(payout.date).toLocaleString()],
        ['Amount Received', `KSh ${(payout.amount || 0).toLocaleString()}`],
        ['Payment Method', payout.method || 'Manual Transfer'],
        ['Status', payout.status],
        ['Reference Number', payout.reference || 'N/A']
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
      doc.text('This is an official payout transaction receipt', 20, finalY + 7);
      
      doc.save(`payout_receipt_${payout.id}_${Date.now()}.pdf`);
      alert('Receipt downloaded successfully!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate receipt. Please try again.');
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
                        color: 'var(--text-secondary)', textAlign: 'center' }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payoutHistory.map(p => (
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
                              onClick={() => generatePayoutReceipt(p)}
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
                              📄 Receipt
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
          
          {payoutHistory.length > 0 && (
            <div style={{ marginTop: 20, padding: 16, background: 'var(--info-bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12, color: 'var(--info-text)', margin: 0, textAlign: 'center' }}>
                💡 Click the "Receipt" button next to any payout to download a transaction receipt for your records.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}