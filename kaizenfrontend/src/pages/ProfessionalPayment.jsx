import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function ProfessionalPayment() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('setup');
  const [showUpdateForm, setShowUpdateForm] = useState(false);

  // Saved state — drives the display card only
  const [savedAccount, setSavedAccount] = useState('');

  // Form state — what the user is typing, completely separate
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
      // Profile is nested under .Profile (capital P) in the API response
      const profileRes = await API.get('/professional/profile');
      const data = profileRes.data;
      const profile = data.Profile || data.profile || {};

      const account = profile.paymentAccount || '';
      const method  = profile.paymentMethod  || 'Mpesa';

      // Set saved display value
      setSavedAccount(account);

      // Pre-fill form with current saved values
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

      // Earnings
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

      // Update the display card immediately — no reload needed
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

  // Reads only from savedAccount — never touched by form interactions
  const getCurrentMethodDisplay = () => {
    if (!savedAccount) return null;
    if (savedAccount.includes('|')) {
      const [bank, accNum, accName] = savedAccount.split('|');
      return {
        label: '🏦 Bank Transfer',
        detail: `${bank} — ${accNum}`,
        sub: `Account name: ${accName}`
      };
    }
    return { label: '📱 M-Pesa', detail: savedAccount, sub: null };
  };

  const currentMethod = getCurrentMethodDisplay();

  const formatCurrency = (n) => `KSh ${(n || 0).toLocaleString()}`;
  const formatDate = (d) => new Date(d).toLocaleDateString('en-KE');

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
      Loading your payment information...
    </div>
  );

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 20px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>
          Payment Settings
        </h2>
        <p style={{ color: '#718096', fontSize: 14, marginTop: 4 }}>
          Manage your payment method and track your earnings
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: 24 }}>
        {[
          { key: 'setup',    label: 'Payment Setup' },
          { key: 'earnings', label: 'My Earnings' },
          { key: 'history',  label: 'Payout History' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: 'transparent', border: 'none', width: 'auto',
            padding: '10px 0', marginRight: 24, cursor: 'pointer', fontSize: 14,
            color: activeTab === tab.key ? '#6c63ff' : '#718096',
            borderBottom: activeTab === tab.key ? '2px solid #6c63ff' : '2px solid transparent',
            fontWeight: activeTab === tab.key ? 500 : 400,
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px',
          borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}
      {success && (
        <div style={{ background: '#E1F5EE', color: '#085041', padding: '10px 14px',
          borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{success}</div>
      )}

      {/* ── SETUP TAB ── */}
      {activeTab === 'setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Current Method Card */}
          <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: '#1a202c' }}>
              Current Payment Method
            </h3>
            <p style={{ fontSize: 13, color: '#718096', margin: '0 0 20px' }}>
              This is how you will receive your session earnings
            </p>

            {currentMethod ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', background: '#E1F5EE', borderRadius: 10,
                border: '1px solid #1D9E75' }}>
                <div>
                  <p style={{ fontSize: 12, color: '#085041', margin: '0 0 6px', fontWeight: 500 }}>
                    ✓ Active
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#085041', margin: 0 }}>
                    {currentMethod.label} — {currentMethod.detail}
                  </p>
                  {currentMethod.sub && (
                    <p style={{ fontSize: 12, color: '#085041', margin: '4px 0 0' }}>
                      {currentMethod.sub}
                    </p>
                  )}
                </div>
                <button onClick={() => setShowUpdateForm(p => !p)} style={{
                  flexShrink: 0, marginLeft: 16, background: 'transparent',
                  color: '#085041', border: '1px solid #1D9E75', width: 'auto',
                  padding: '8px 18px', fontSize: 13, borderRadius: 8, cursor: 'pointer'
                }}>
                  {showUpdateForm ? 'Cancel' : 'Update'}
                </button>
              </div>
            ) : (
              <div style={{ padding: 20, background: '#FAEEDA', borderRadius: 10,
                border: '1px solid #EF9F27', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#633806', margin: 0 }}>
                  ⚠️ No payment method set up yet. Add one below to receive your earnings.
                </p>
              </div>
            )}
          </div>

          {/* Form — shown when no method saved OR Update clicked */}
          {(!currentMethod || showUpdateForm) && (
            <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px', color: '#1a202c' }}>
                {currentMethod ? 'Update Payment Method' : 'Set Up Payment Method'}
              </h3>
              <p style={{ fontSize: 13, color: '#718096', margin: '0 0 24px' }}>
                Choose how you want to receive your session earnings
              </p>

              {/* Method radio */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                  marginBottom: 10, color: '#4a5568' }}>Select Payment Method</label>
                <div style={{ display: 'flex', gap: 24 }}>
                  {[
                    { value: 'Mpesa', label: '📱 M-Pesa' },
                    { value: 'Bank',  label: '🏦 Bank Transfer' },
                  ].map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center',
                      gap: 8, cursor: 'pointer', fontSize: 14 }}>
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

              {/* M-Pesa field */}
              {formMethod === 'Mpesa' && (
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                    marginBottom: 8, color: '#4a5568' }}>M-Pesa Phone Number</label>
                  <input type="tel" value={formAccount}
                    onChange={(e) => setFormAccount(e.target.value)}
                    placeholder="254712345678"
                    style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0',
                      borderRadius: 8, fontSize: 14 }} />
                  <p style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>
                    Format: 254 followed by 9 digits
                  </p>
                </div>
              )}

              {/* Bank fields */}
              {formMethod === 'Bank' && (
                <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                      marginBottom: 8, color: '#4a5568' }}>Bank Name</label>
                    <select value={formBankName} onChange={(e) => setFormBankName(e.target.value)}
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14, background: 'white' }}>
                      <option value="">Select Bank</option>
                      {['Equity Bank','KCB Bank','Cooperative Bank','Stanbic Bank',
                        'ABSA Bank','NCBA Bank','I&M Bank','Family Bank'].map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                      marginBottom: 8, color: '#4a5568' }}>Account Number</label>
                    <input type="text" value={formAccountNumber}
                      onChange={(e) => setFormAccountNumber(e.target.value)}
                      placeholder="Your bank account number"
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14 }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500,
                      marginBottom: 8, color: '#4a5568' }}>Account Name</label>
                    <input type="text" value={formAccountName}
                      onChange={(e) => setFormAccountName(e.target.value)}
                      placeholder="Name on the bank account"
                      style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0',
                        borderRadius: 8, fontSize: 14 }} />
                  </div>
                </div>
              )}

              <button onClick={handleSave} disabled={saving} style={{
                width: '100%', padding: 12, background: '#6c63ff', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500,
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1
              }}>
                {saving ? 'Saving...' : currentMethod ? 'Update Payment Method' : 'Save Payment Method'}
              </button>

              <div style={{ marginTop: 20, padding: 16, background: '#f7f9fc', borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: '#718096', margin: '0 0 4px' }}>📅 Payout Schedule</p>
                <p style={{ fontSize: 13, color: '#1a202c', margin: 0 }}>
                  Payouts are processed every two weeks. Your next expected payout date is{' '}
                  <strong>{nextPayoutDate}</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── EARNINGS TAB ── */}
      {activeTab === 'earnings' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Total Earnings', value: formatCurrency(earnings.totalEarned),    color: '#085041' },
              { label: 'Pending Payout', value: formatCurrency(earnings.pendingPayout),  color: '#633806' },
            ].map(card => (
              <div key={card.label} style={{ background: 'white', borderRadius: 12,
                padding: 20, border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: 13, color: '#718096', margin: '0 0 4px' }}>{card.label}</p>
                <p style={{ fontSize: 28, fontWeight: 600, color: card.color, margin: 0 }}>{card.value}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Paid Out',       value: formatCurrency(earnings.paidOut),        color: '#1a202c' },
              { label: 'Total Sessions', value: earnings.totalSessions,                  color: '#1a202c' },
              { label: 'Your Split',     value: `${earnings.currentSplitPercentage}%`,   color: '#6c63ff' },
            ].map(card => (
              <div key={card.label} style={{ background: 'white', borderRadius: 12, padding: 16,
                border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: '#718096', margin: '0 0 4px' }}>{card.label}</p>
                <p style={{ fontSize: 18, fontWeight: 600, color: card.color, margin: 0 }}>{card.value}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', color: '#1a202c' }}>
              Performance Rating
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1,2,3,4,5].map(star => (
                  <span key={star} style={{ fontSize: 20,
                    color: star <= earnings.averageRating ? '#FFD700' : '#e2e8f0' }}>★</span>
                ))}
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#1a202c' }}>
                {earnings.averageRating > 0 ? earnings.averageRating.toFixed(1) : 'No ratings yet'}
              </span>
            </div>
            <p style={{ fontSize: 12, color: '#718096', margin: '12px 0 0' }}>
              Your revenue split is based on your average rating. Higher ratings = higher percentage.
            </p>
          </div>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <div>
          {payoutHistory.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, padding: '48px 24px',
              textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: 40, margin: '0 0 12px' }}>💰</p>
              <h3 style={{ fontSize: 18, margin: '0 0 8px', color: '#1a202c' }}>No payout history yet</h3>
              <p style={{ color: '#718096', margin: 0 }}>Your payouts will appear here once processed.</p>
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: 12,
              border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e8f0' }}>
                    {['Date','Amount','Method','Reference','Status'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600,
                        color: '#4a5568',
                        textAlign: h === 'Amount' ? 'right' : h === 'Status' ? 'center' : 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payoutHistory.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a202c' }}>
                        {formatDate(p.date)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13,
                        fontWeight: 500, color: '#085041' }}>
                        {formatCurrency(p.amount)}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a202c' }}>
                        {p.method}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#718096' }}>
                        {p.reference || '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20,
                          fontSize: 11, fontWeight: 500,
                          background: p.status === 'Completed' ? '#E1F5EE' : '#FAEEDA',
                          color: p.status === 'Completed' ? '#085041' : '#633806' }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
}