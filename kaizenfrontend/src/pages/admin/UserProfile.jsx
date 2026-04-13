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

  // Wrap fetchUserData in useCallback to fix the React Hook dependency warning
  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const userRes = await API.get(`/Admin/users/${userId}`);
      console.log('User API Response - Full data:', userRes.data);
      console.log('Professional Profile:', userRes.data.professionalProfile);
      console.log('Payment Method:', userRes.data.professionalProfile?.paymentMethod);
      console.log('Payment Account:', userRes.data.professionalProfile?.paymentAccount);
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
  }, [userId]); // Only re-create when userId changes

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]); // Now depends on the memoized fetchUserData

  const formatCurrency = (amount) => `KSh ${amount?.toLocaleString() || 0}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-KE');

  const getStatusColor = (status) => {
    switch(status) {
      case 'Confirmed': return { bg: '#E1F5EE', color: '#085041' };
      case 'Pending': return { bg: '#FAEEDA', color: '#633806' };
      case 'Completed': return { bg: '#EAF3DE', color: '#27500A' };
      case 'Cancelled': return { bg: '#FCEBEB', color: '#791F1F' };
      default: return { bg: '#F1EFE8', color: '#444441' };
    }
  };

  const getPayoutStatusColor = (status) => {
    switch(status) {
      case 'PaidOut': return { bg: '#E1F5EE', color: '#085041' };
      case 'Pending': return { bg: '#FAEEDA', color: '#633806' };
      default: return { bg: '#F1EFE8', color: '#444441' };
    }
  };

  const getFormattedPaymentDisplay = () => {
    if (!user?.professionalProfile?.paymentAccount) {
      console.log('No payment account found in professionalProfile');
      return null;
    }
    
    const account = user.professionalProfile.paymentAccount;
    console.log('Raw payment account:', account);
    
    if (account.includes('|')) {
      const parts = account.split('|');
      console.log('Bank parts:', parts);
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Loading profile...</div>;
  if (error) return <div style={{ color: '#791F1F', padding: 40, textAlign: 'center' }}>{error}</div>;
  if (!user) return <div style={{ padding: 40, textAlign: 'center' }}>User not found</div>;

  const isProfessional = user.role === 'Professional';
  const totalEarnings = sessions.reduce((sum, s) => sum + (s.professionalEarnings || 0), 0);
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.status === 'Completed').length;
  const pendingPayoutSessions = sessions.filter(s => s.payoutStatus === 'Pending' && s.paymentStatus === 'Paid');
  const paymentDisplay = isProfessional ? getFormattedPaymentDisplay() : null;

  return (
    <div>
      {/* Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/admin/users')}
          style={{
            background: 'transparent',
            color: '#6c63ff',
            border: '1px solid #6c63ff',
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13
          }}
        >
          ← Back to Users
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: '#1a202c' }}>User Profile</h2>
      </div>

      {/* User Info Card */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: user.role === 'Professional' ? 'linear-gradient(135deg, #6c63ff, #3c3489)' : 'linear-gradient(135deg, #e91e8c, #c2185b)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 32,
            fontWeight: 600
          }}>
            {user.fullName?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: '#1a202c' }}>{user.fullName}</h3>
              <span style={{
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                background: user.role === 'Admin' ? '#EEEDFE' : user.role === 'Professional' ? '#E1F5EE' : '#FAEEDA',
                color: user.role === 'Admin' ? '#3C3489' : user.role === 'Professional' ? '#085041' : '#633806'
              }}>
                {user.role}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#718096', margin: '8px 0 4px' }}>{user.email}</p>
            <p style={{ fontSize: 12, color: '#a0aec0', margin: 0 }}>Joined: {formatDate(user.dateRegistered)}</p>
          </div>
          {isProfessional && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#085041' }}>{formatCurrency(totalEarnings)}</div>
              <div style={{ fontSize: 12, color: '#718096' }}>Total Earnings</div>
            </div>
          )}
        </div>

        {/* Professional-specific details */}
        {isProfessional && user.professionalProfile && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Specialization</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#1a202c' }}>{user.professionalProfile.specialization || 'Not specified'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Bio</p>
                <p style={{ fontSize: 14, color: '#1a202c' }}>{user.professionalProfile.bio || 'Not specified'}</p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Average Rating</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} style={{ fontSize: 16, color: star <= (user.professionalProfile.averageRating || 0) ? '#FFD700' : '#e2e8f0' }}>★</span>
                    ))}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{user.professionalProfile.averageRating?.toFixed(1) || 'No ratings'}</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Split Percentage</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#6c63ff' }}>
                  {user.professionalProfile.customSplitPercentage || user.professionalProfile.currentSplitPercentage || 60}%
                </p>
              </div>
            </div>
            
            {/* Payment Method Section */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: 12, color: '#718096', marginBottom: 8 }}>Payment Method</p>
              {paymentDisplay ? (
                <div style={{ 
                  padding: '12px 16px', 
                  background: '#E1F5EE', 
                  borderRadius: 8,
                  border: '1px solid #1D9E75'
                }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#085041', margin: 0 }}>
                    {paymentDisplay.method} — {paymentDisplay.detail}
                  </p>
                  {paymentDisplay.sub && (
                    <p style={{ fontSize: 12, color: '#085041', margin: '4px 0 0' }}>
                      {paymentDisplay.sub}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ 
                  padding: '12px 16px', 
                  background: '#FAEEDA', 
                  borderRadius: 8,
                  border: '1px solid #EF9F27'
                }}>
                  <p style={{ fontSize: 14, color: '#633806', margin: 0 }}>
                    ⚠️ No payment method set up yet
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            background: 'transparent',
            color: activeTab === 'overview' ? '#6c63ff' : '#718096',
            border: 'none',
            borderBottom: activeTab === 'overview' ? '2px solid #6c63ff' : '2px solid transparent',
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
            color: activeTab === 'sessions' ? '#6c63ff' : '#718096',
            border: 'none',
            borderBottom: activeTab === 'sessions' ? '2px solid #6c63ff' : '2px solid transparent',
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
              color: activeTab === 'ratings' ? '#6c63ff' : '#718096',
              border: 'none',
              borderBottom: activeTab === 'ratings' ? '2px solid #6c63ff' : '2px solid transparent',
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
              color: activeTab === 'payouts' ? '#6c63ff' : '#718096',
              border: 'none',
              borderBottom: activeTab === 'payouts' ? '2px solid #6c63ff' : '2px solid transparent',
              padding: '8px 0',
              marginRight: 16,
              cursor: 'pointer'
            }}
          >
            Payouts
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Activity Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: 16, background: '#f7f9fc', borderRadius: 10 }}>
              <p style={{ fontSize: 24, fontWeight: 600, color: '#6c63ff', margin: 0 }}>{totalSessions}</p>
              <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Total Sessions</p>
            </div>
            <div style={{ textAlign: 'center', padding: 16, background: '#f7f9fc', borderRadius: 10 }}>
              <p style={{ fontSize: 24, fontWeight: 600, color: '#085041', margin: 0 }}>{completedSessions}</p>
              <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Completed Sessions</p>
            </div>
            {isProfessional && (
              <div style={{ textAlign: 'center', padding: 16, background: '#f7f9fc', borderRadius: 10 }}>
                <p style={{ fontSize: 24, fontWeight: 600, color: '#633806', margin: 0 }}>{formatCurrency(totalEarnings)}</p>
                <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Total Earnings</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {sessions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No sessions found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Client/Professional</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Amount</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Payment</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => {
                    const statusStyle = getStatusColor(session.status);
                    const payoutStyle = getPayoutStatusColor(session.payoutStatus);
                    return (
                      <tr key={session.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 16px' }}>{formatDate(session.sessionDate)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {user.role === 'Professional' ? session.clientName : session.professionalName}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>{formatCurrency(session.amount)}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: '4px 12px', borderRadius: 20, fontSize: 11 }}>
                            {session.status}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ color: session.paymentStatus === 'Paid' ? '#085041' : '#633806' }}>
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

      {/* Ratings Tab (Professional only) */}
      {activeTab === 'ratings' && isProfessional && (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {ratings.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>No ratings yet</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Client</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Rating</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Review</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map(rating => (
                    <tr key={rating.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px' }}>{rating.clientName}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <span key={star} style={{ color: star <= rating.rating ? '#FFD700' : '#e2e8f0' }}>★</span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>{rating.review || '—'}</td>
                      <td style={{ padding: '12px 16px' }}>{formatDate(rating.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payouts Tab (Professional only) */}
      {activeTab === 'payouts' && isProfessional && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
            <div style={{ padding: 16, background: '#E1F5EE', borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: '#085041', marginBottom: 4 }}>Pending Payout</p>
              <p style={{ fontSize: 28, fontWeight: 600, color: '#085041', margin: 0 }}>
                {formatCurrency(user.professionalProfile?.pendingPayout || 0)}
              </p>
            </div>
            <div style={{ padding: 16, background: '#EEEDFE', borderRadius: 10 }}>
              <p style={{ fontSize: 12, color: '#3C3489', marginBottom: 4 }}>Total Paid Out</p>
              <p style={{ fontSize: 28, fontWeight: 600, color: '#3C3489', margin: 0 }}>
                {formatCurrency(user.professionalProfile?.paidOut || 0)}
              </p>
            </div>
          </div>
          
          {pendingPayoutSessions.length > 0 && (
            <>
              <div style={{ marginBottom: 16, padding: 12, background: '#FAEEDA', borderRadius: 8 }}>
                <p style={{ fontSize: 13, color: '#633806', margin: 0 }}>
                  📋 {pendingPayoutSessions.length} session(s) ready for payout totaling {formatCurrency(pendingPayoutSessions.reduce((sum, s) => sum + (s.professionalEarnings || 0), 0))}
                </p>
              </div>
              <button
                onClick={handleProcessPayout}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#6c63ff',
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
            <div style={{ padding: 40, textAlign: 'center', color: '#718096' }}>
              No pending payouts. All earnings have been paid out.
            </div>
          )}
        </div>
      )}
    </div>
  );
}