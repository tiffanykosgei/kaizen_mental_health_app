import { useState, useEffect } from 'react';
import API from '../../api/axios';

export default function AdminPayouts() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const fetchProfessionals = async () => {
    setLoading(true);
    try {
      const res = await API.get('/payment/professional-breakdown');
      setProfessionals(res.data.professionals || []);
    } catch (err) {
      console.error(err);
      setError('Could not load professional payment data.');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (professionalId, name) => {
    if (!window.confirm(`Process payout for ${name}? This will mark all pending sessions as paid out.`)) return;
    setProcessingId(professionalId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await API.post(`/admin/professionals/${professionalId}/process-payout`, {});
      setSuccessMsg(`✓ Payout processed for ${name} — KSh ${res.data.totalAmount?.toLocaleString()} across ${res.data.sessionsProcessed} session(s).`);
      fetchProfessionals();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to process payout for ${name}.`);
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount) => `KSh ${(amount || 0).toLocaleString()}`;

  const getMethodDisplay = (method, account) => {
    if (!account || account === 'Not set') return { label: 'Not set', detail: '', color: '#633806', bg: '#FAEEDA' };
    if (method === 'Bank' || (account && account.includes('|'))) {
      const parts = account.split('|');
      return { label: '🏦 Bank Transfer', detail: `${parts[0]} — ${parts[1]}`, color: '#085041', bg: '#E1F5EE' };
    }
    return { label: '📱 M-Pesa', detail: account, color: '#085041', bg: '#E1F5EE' };
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>Loading payment data...</div>
  );

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: 'var(--text-primary)' }}>
          Professional Payouts
        </h2>
        <p style={{ color: '#718096', fontSize: 14, marginTop: 4 }}>
          View payment methods and process earnings for each professional
        </p>
      </div>

      {error && (
        <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '12px 16px',
          borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}
      {successMsg && (
        <div style={{ background: '#E1F5EE', color: '#085041', padding: '12px 16px',
          borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{successMsg}</div>
      )}

      {professionals.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: '48px 24px',
          textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>💼</p>
          <p style={{ color: '#718096' }}>No professionals registered yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {professionals.map(pro => {
            const method = getMethodDisplay(pro.paymentMethod, pro.paymentAccount);
            const hasPending = pro.pendingPayout > 0;
            return (
              <div key={pro.professionalId} style={{ background: 'white', borderRadius: 12,
                border: '1px solid #e2e8f0', overflow: 'hidden' }}>

                {/* Header row */}
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #f0f0f0',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1a202c', margin: 0 }}>
                      {pro.professionalName}
                    </p>
                    <p style={{ fontSize: 13, color: '#718096', margin: '2px 0 0' }}>
                      {pro.professionalEmail}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {pro.averageRating > 0 && (
                      <span style={{ fontSize: 13, color: '#633806' }}>
                        ★ {pro.averageRating.toFixed(1)}
                      </span>
                    )}
                    <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20,
                      background: '#EEEDFE', color: '#3C3489' }}>
                      {pro.currentSplitPercentage}% split
                    </span>
                  </div>
                </div>

                {/* Payment method row */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f0f0f0',
                  display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: '#718096', minWidth: 120 }}>Payment method</span>
                  <span style={{ fontSize: 13, padding: '4px 12px', borderRadius: 6,
                    background: method.bg, color: method.color, fontWeight: 500 }}>
                    {method.label}
                  </span>
                  {method.detail && (
                    <span style={{ fontSize: 13, color: '#4a5568' }}>{method.detail}</span>
                  )}
                </div>

                {/* Earnings row */}
                <div style={{ padding: '14px 20px', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                      <p style={{ fontSize: 11, color: '#718096', margin: '0 0 2px' }}>Total earned</p>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#1a202c', margin: 0 }}>
                        {formatCurrency(pro.totalEarned)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#718096', margin: '0 0 2px' }}>Pending payout</p>
                      <p style={{ fontSize: 15, fontWeight: 600,
                        color: hasPending ? '#633806' : '#718096', margin: 0 }}>
                        {formatCurrency(pro.pendingPayout)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#718096', margin: '0 0 2px' }}>Paid out</p>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#085041', margin: 0 }}>
                        {formatCurrency(pro.paidOut)}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: '#718096', margin: '0 0 2px' }}>Sessions</p>
                      <p style={{ fontSize: 15, fontWeight: 600, color: '#1a202c', margin: 0 }}>
                        {pro.totalSessions}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleProcessPayout(pro.professionalId, pro.professionalName)}
                    disabled={!hasPending || processingId === pro.professionalId || pro.paymentAccount === 'Not set'}
                    style={{
                      padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      border: 'none', cursor: hasPending && pro.paymentAccount !== 'Not set' ? 'pointer' : 'not-allowed',
                      background: hasPending && pro.paymentAccount !== 'Not set' ? '#6c63ff' : '#e2e8f0',
                      color: hasPending && pro.paymentAccount !== 'Not set' ? 'white' : '#718096',
                      opacity: processingId === pro.professionalId ? 0.6 : 1,
                      whiteSpace: 'nowrap'
                    }}>
                    {processingId === pro.professionalId
                      ? 'Processing...'
                      : !hasPending
                      ? 'No pending payout'
                      : pro.paymentAccount === 'Not set'
                      ? 'No payment method'
                      : `Pay ${formatCurrency(pro.pendingPayout)}`}
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}