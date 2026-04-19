import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../api/axios';

export default function UserProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const userRes = await API.get(`/Admin/users/${userId}`);
      setUser(userRes.data);
      
      const sessionsRes = await API.get(`/Admin/users/${userId}/sessions`);
      setSessions(sessionsRes.data);
      
      if (userRes.data.role === 'Professional') {
        const ratingsRes = await API.get(`/Admin/professionals/${userId}/ratings`);
        setRatings(ratingsRes.data.ratings || []);
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setError('Could not load user profile.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const formatCurrency = (amount) => `KSh ${amount?.toLocaleString() || 0}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-KE');

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'Pending': return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
      case 'Completed': return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'Cancelled': return { bg: 'var(--error-bg)', color: 'var(--error-text)' };
      default: return { bg: 'var(--bg-hover)', color: 'var(--text-secondary)' };
    }
  };

  const getPayoutStatusColor = (status) => {
    switch(status) {
      case 'PaidOut': return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'Pending': return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
      default: return { bg: 'var(--bg-hover)', color: 'var(--text-secondary)' };
    }
  };

  const getFormattedPaymentDisplay = () => {
    if (!user?.professionalProfile?.paymentAccount) return null;
    
    const account = user.professionalProfile.paymentAccount;
    
    if (account.includes('|')) {
      const parts = account.split('|');
      return {
        method: '🏦 Bank Transfer',
        detail: `${parts[0]} — ${parts[1]}`,
        sub: `Account name: ${parts[2]}`
      };
    }
    return {
      method: '📱 M-Pesa',
      detail: account,
      sub: null
    };
  };

  const handleProcessPayout = async () => {
    const pendingSessions = sessions.filter(s => s.payoutStatus === 'Pending' && s.paymentStatus === 'Paid');
    if (pendingSessions.length === 0) {
      setError('No pending payouts for this professional');
      return;
    }
    
    if (!window.confirm(`Process payout for ${user.fullName}? This will mark ${pendingSessions.length} session(s) as paid out.`)) return;
    
    try {
      const response = await API.post(`/Admin/professionals/${userId}/process-payout`, {});
      alert(`Success! ${response.data.message}\nTotal amount: ${formatCurrency(response.data.totalAmount)}`);
      fetchUserData();
    } catch (err) {
      console.error('Failed to process payout:', err);
      setError(err.response?.data?.message || 'Failed to process payout');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading profile...</div>;
  if (error) return <div style={{ color: 'var(--error-text)', padding: 40, textAlign: 'center' }}>{error}</div>;
  if (!user) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>User not found</div>;

  const isProfessional = user.role === 'Professional';
  const totalEarnings = sessions.reduce((sum, s) => sum + (s.professionalEarnings || 0), 0);
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'Completed').length;
  const pendingPayoutSessions = sessions.filter(s => s.payoutStatus === 'Pending' && s.paymentStatus === 'Paid');
  const paymentDisplay = isProfessional ? getFormattedPaymentDisplay() : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/admin/users')}
          style={{
            background: 'transparent',
            color: 'var(--accent)',
            border: '1px solid var(--accent)',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13
          }}
        >
          ← Back to Users
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>User Profile</h2>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: user.role === 'Professional' ? 'var(--gradient-primary)' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-inverse)',
            fontSize: 32,
            fontWeight: 600
          }}>
            {user.fullName?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{user.fullName}</h3>
              <span style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                background: user.role === 'Admin' ? 'var(--info-bg)' : user.role === 'Professional' ? 'var(--success-bg)' : 'var(--warning-bg)',
                color: user.role === 'Admin' ? 'var(--info-text)' : user.role === 'Professional' ? 'var(--success-text)' : 'var(--warning-text)'
              }}>
                {user.role}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 4px' }}>{user.email}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Joined: {formatDate(user.dateRegistered)}</p>
          </div>
          {isProfessional && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--success-text)' }}>{formatCurrency(totalEarnings)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Earnings</div>
            </div>
          )}
        </div>

        {isProfessional && user.professionalProfile && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Specialization</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{user.professionalProfile.specialization || 'Not specified'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Bio</p>
                <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>{user.professionalProfile.bio || 'Not specified'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Average Rating</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} style={{ fontSize: 16, color: star <= (user.professionalProfile.averageRating || 0) ? '#FFD700' : 'var(--border)' }}>★</span>
                    ))}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{user.professionalProfile.averageRating?.toFixed(1) || 'No ratings'}</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Split Percentage</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)' }}>
                  {user.professionalProfile.customSplitPercentage || user.professionalProfile.currentSplitPercentage || 60}%
                </p>
              </div>
            </div>
            
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Payment Method</p>
              {paymentDisplay ? (
                <div style={{ 
                  padding: '12px 16px', 
                  background: 'var(--success-bg)', 
                  borderRadius: 8,
                  border: '1px solid var(--secondary)'
                }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--success-text)', margin: 0 }}>
                    {paymentDisplay.method} — {paymentDisplay.detail}
                  </p>
                  {paymentDisplay.sub && (
                    <p style={{ fontSize: 12, color: 'var(--success-text)', margin: '4px 0 0' }}>
                      {paymentDisplay.sub}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ 
                  padding: '12px 16px', 
                  background: 'var(--warning-bg)', 
                  borderRadius: 8,
                  border: '1px solid var(--warning-text)'
                }}>
                  <p style={{ fontSize: 14, color: 'var(--warning-text)', margin: 0 }}>
                    ⚠️ No payment method set up yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'transparent',
            color: activeTab === 'overview' ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '8px 0',
            marginRight: 16,
            cursor: 'pointer'
          }}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          style={{
            background: 'transparent',
            color: activeTab === 'sessions' ? 'var(--accent)' : 'var(--text-muted)',
            border: 'none',
            borderBottom: activeTab === 'sessions' ? '2px solid var(--accent)' : '2px solid transparent',
            padding: '8px 0',
            marginRight: 16,
            cursor: 'pointer'
          }}
        >
          Sessions ({sessions.length})
        </button>
        {isProfessional && (
          <button
            onClick={() => setActiveTab('ratings')}
            style={{
              background: 'transparent',
              color: activeTab === 'ratings' ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: activeTab === 'ratings' ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '8px 0',
              marginRight: 16,
              cursor: 'pointer'
            }}
          >
            Ratings & Reviews ({ratings.length})
          </button>
        )}
        {isProfessional && (
          <button
            onClick={() => setActiveTab('payouts')}
            style={{
              background: 'transparent',
              color: activeTab === 'payouts' ? 'var(--accent)' : 'var(--text-muted)',
              border: 'none',
              borderBottom: activeTab === 'payouts' ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '8px 0',
              marginRight: 16,
              cursor: 'pointer'
            }}
          >
            Payouts
          </button>
        )}
      </div>

      {activeTab === 'overview' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Activity Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-secondary)', borderRadius: 10 }}>
              <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--accent)', margin: 0 }}>{totalSessions}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Total Sessions</p>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-secondary)', borderRadius: 10 }}>
              <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--success-text)', margin: 0 }}>{completedSessions}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Completed Sessions</p>
            </div>
            {isProfessional && (
              <div style={{ textAlign: 'center', padding: 16, background: 'var(--bg-secondary)', borderRadius: 10 }}>
                <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--warning-text)', margin: 0 }}>{formatCurrency(totalEarnings)}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Total Earnings</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {sessions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No sessions found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Client/Professional</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Payment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => {
                    const statusStyle = getStatusColor(session.status);
                    const payoutStyle = getPayoutStatusColor(session.payoutStatus);
                    return (
                      <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{formatDate(session.sessionDate)}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                          {user.role === 'Professional' ? session.clientName : session.professionalName}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-primary)' }}>{formatCurrency(session.amount)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: '4px 12px', borderRadius: 20, fontSize: 11 }}>
                            {session.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ color: session.paymentStatus === 'Paid' ? 'var(--success-text)' : 'var(--warning-text)' }}>
                            {session.paymentStatus}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ background: payoutStyle.bg, color: payoutStyle.color, padding: '4px 12px', borderRadius: 20, fontSize: 11 }}>
                            {session.payoutStatus || 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'ratings' && isProfessional && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          {ratings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No ratings yet</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Client</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Rating</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Review</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map(rating => (
                    <tr key={rating.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{rating.clientName}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} style={{ color: star <= rating.rating ? '#FFD700' : 'var(--border)' }}>★</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{rating.review || '—'}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{formatDate(rating.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'payouts' && isProfessional && (
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 24, border: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 24 }}>
            <div style={{ padding: 16, background: 'var(--success-bg)', borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--success-text)', marginBottom: 4 }}>Pending Payout</p>
              <p style={{ fontSize: 28, fontWeight: 600, color: 'var(--success-text)', margin: 0 }}>
                {formatCurrency(user.professionalProfile?.pendingPayout || 0)}
              </p>
            </div>
            <div style={{ padding: 16, background: 'var(--info-bg)', borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--info-text)', marginBottom: 4 }}>Total Paid Out</p>
              <p style={{ fontSize: 28, fontWeight: 600, color: 'var(--info-text)', margin: 0 }}>
                {formatCurrency(user.professionalProfile?.paidOut || 0)}
              </p>
            </div>
          </div>
          
          {pendingPayoutSessions.length > 0 && (
            <>
              <div style={{ marginBottom: 16, padding: 12, background: 'var(--warning-bg)', borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: 'var(--warning-text)', margin: 0 }}>
                  📋 {pendingPayoutSessions.length} session(s) ready for payout totaling {formatCurrency(pendingPayoutSessions.reduce((sum, s) => sum + (s.professionalEarnings || 0), 0))}
                </p>
              </div>
              <button
                onClick={handleProcessPayout}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Process Payout for {user.fullName}
              </button>
            </>
          )}
          
          {pendingPayoutSessions.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No pending payouts. All earnings have been paid out.
            </div>
          )}
        </div>
      )}
    </div>
  );
}