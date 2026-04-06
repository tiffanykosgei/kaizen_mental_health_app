import { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // Fetch all sessions from the admin endpoint
      const response = await API.get('/Admin/sessions');
      const allSessions = response.data;
      setSessions(allSessions);
      
      // Calculate stats
      const pending = allSessions.filter(s => s.status === 'Pending').length;
      const confirmed = allSessions.filter(s => s.status === 'Confirmed').length;
      const completed = allSessions.filter(s => s.status === 'Completed').length;
      const cancelled = allSessions.filter(s => s.status === 'Cancelled').length;
      const totalRevenue = allSessions
        .filter(s => s.paymentStatus === 'Paid')
        .reduce((sum, s) => sum + (s.platformFee || s.amount * 0.4), 0);
      
      setStats({
        total: allSessions.length,
        pending,
        confirmed,
        completed,
        cancelled,
        totalRevenue
      });
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
      setError('Could not load sessions. Make sure the /Admin/sessions endpoint exists.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSessions = () => {
    if (filter === 'all') return sessions;
    return sessions.filter(s => s.status === filter);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return { bg: '#E1F5EE', color: '#085041' };
      case 'Pending':   return { bg: '#FAEEDA', color: '#633806' };
      case 'Completed': return { bg: '#EAF3DE', color: '#27500A' };
      case 'Cancelled': return { bg: '#FCEBEB', color: '#791F1F' };
      default:          return { bg: '#F1EFE8', color: '#444441' };
    }
  };

  const getPaymentColor = (status) => {
    switch(status) {
      case 'Paid':    return { bg: '#E1F5EE', color: '#085041' };
      case 'Pending': return { bg: '#FAEEDA', color: '#633806' };
      case 'Failed':  return { bg: '#FCEBEB', color: '#791F1F' };
      default:        return { bg: '#F1EFE8', color: '#444441' };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `KSh ${amount?.toLocaleString() || 0}`;
  };

  const filteredSessions = getFilteredSessions();

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Loading sessions...</div>;
  }

  if (error) {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>All Sessions</h2>
        <p style={{ color: '#718096', marginBottom: 24 }}>View and manage all platform sessions</p>
        <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '20px', borderRadius: 12, textAlign: 'center' }}>
          {error}
          <br />
          <button 
            onClick={fetchSessions}
            style={{ marginTop: 12, background: '#6c63ff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>All Sessions</h2>
      <p style={{ color: '#718096', marginBottom: 24 }}>View and manage all platform sessions</p>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatsCard title="Total Sessions" value={stats.total} color="purple" icon="📅" />
        <StatsCard title="Pending" value={stats.pending} color="orange" icon="⏳" />
        <StatsCard title="Confirmed" value={stats.confirmed} color="green" icon="✅" />
        <StatsCard title="Completed" value={stats.completed} color="green" icon="🎉" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Cancelled" value={stats.cancelled} color="red" icon="❌" />
        <StatsCard title="Total Platform Revenue" value={formatCurrency(stats.totalRevenue)} color="purple" icon="💰" />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        {['all', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              background: filter === status ? '#6c63ff' : 'transparent',
              color: filter === status ? 'white' : '#4a5568',
              border: filter === status ? 'none' : '1px solid #e2e8f0',
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            {status === 'all' ? 'All' : status}
          </button>
        ))}
      </div>

      {/* Sessions Table */}
      {filteredSessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0' }}>
          <p style={{ color: '#718096' }}>No sessions found</p>
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Professional</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(session => {
                  const statusStyle = getStatusColor(session.status);
                  const paymentStyle = getPaymentColor(session.paymentStatus);
                  return (
                    <tr key={session.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a202c' }}>#{session.id}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a202c' }}>{session.client?.fullName || 'N/A'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a202c' }}>{session.professional?.fullName || 'N/A'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#1a202c' }}>{formatDate(session.sessionDate)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#1a202c' }}>{formatCurrency(session.amount)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 500,
                          background: statusStyle.bg,
                          color: statusStyle.color
                        }}>
                          {session.status}
                        </span>
                       </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 500,
                          background: paymentStyle.bg,
                          color: paymentStyle.color
                        }}>
                          {session.paymentStatus}
                        </span>
                       </td>
                     </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}