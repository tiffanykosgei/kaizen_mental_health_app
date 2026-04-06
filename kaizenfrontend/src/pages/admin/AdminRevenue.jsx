import { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';
import DataTable from './components/DataTable';

export default function AdminRevenue() {
  const [summary, setSummary] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPro, setSelectedPro] = useState(null);
  const [splitPercentage, setSplitPercentage] = useState('');
  const [showSplitModal, setShowSplitModal] = useState(false);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const response = await API.get('/payment/professional-breakdown');
      setSummary(response.data.summary);
      setProfessionals(response.data.professionals);
    } catch (err) {
      console.error(err);
      setError('Could not load revenue data.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSplit = async () => {
    if (!selectedPro) return;
    const percentage = parseInt(splitPercentage);
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

  const formatCurrency = (amount) => `KSh ${amount?.toLocaleString() || 0}`;

  const columns = [
    { key: 'professionalName', label: 'Professional', align: 'left' },
    { key: 'totalSessions', label: 'Sessions', align: 'center' },
    { key: 'totalEarned', label: 'Total Earned', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'platformFees', label: 'Platform Fee', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'pendingPayout', label: 'Pending', align: 'right', render: (v) => formatCurrency(v) },
    { key: 'paidOut', label: 'Paid Out', align: 'right', render: (v) => formatCurrency(v) },
    { 
      key: 'currentSplitPercentage', 
      label: 'Split', 
      align: 'center',
      render: (v, row) => (
        <button
          onClick={() => {
            setSelectedPro(row);
            setSplitPercentage(row.customSplitPercentage || row.currentSplitPercentage);
            setShowSplitModal(true);
          }}
          style={{
            background: row.customSplitPercentage ? '#EEEDFE' : '#F1EFE8',
            color: row.customSplitPercentage ? '#3C3489' : '#444441',
            border: 'none',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 12,
            cursor: 'pointer'
          }}
        >
          {v}%
        </button>
      )
    }
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Loading revenue data...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>Revenue & Payouts</h2>
      <p style={{ color: '#718096', marginBottom: 24 }}>Track platform revenue and manage professional payouts</p>

      {error && (
        <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatsCard title="Platform Revenue" value={formatCurrency(summary.totalPlatformFees)} color="purple" icon="💰" />
          <StatsCard title="Professional Payouts" value={formatCurrency(summary.totalProfessionalEarnings)} color="green" icon="💸" />
          <StatsCard title="Paid Sessions" value={summary.totalPaidSessions} color="orange" icon="📅" />
        </div>
      )}

      <DataTable columns={columns} data={professionals} />

      {/* Split Modal */}
      {showSplitModal && selectedPro && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 400, width: '90%' }}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#1a202c' }}>Edit Professional Split</h3>
            <p style={{ fontSize: 13, color: '#718096', marginBottom: 20 }}>
              {selectedPro.professionalName} — Current split: {selectedPro.currentSplitPercentage}%
            </p>
            
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>Professional Percentage (40-80%)</label>
              <input
                type="number"
                value={splitPercentage}
                onChange={(e) => setSplitPercentage(e.target.value)}
                min="40"
                max="80"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 8 }}
              />
              <p style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>
                Platform will receive {100 - (parseInt(splitPercentage) || 60)}%
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={handleUpdateSplit} style={{ flex: 1 }}>Save Changes</button>
              <button 
                onClick={() => { setShowSplitModal(false); setSelectedPro(null); setSplitPercentage(''); }}
                style={{ flex: 1, background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}
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