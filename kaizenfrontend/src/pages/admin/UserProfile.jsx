import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import API from '../../api/axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addReportHeader } from '../../utils/pdfReportBranding';

const SESSION_FEE = 1500;

export default function UserProfile() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [tableSearchTerm, setTableSearchTerm] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [counterpartStatusFilter, setCounterpartStatusFilter] = useState('all'); // NEW
  const [tableSortBy, setTableSortBy] = useState('date_desc');

  const fetchUserData = useCallback(async () => {
    setLoading(true);
    try {
      const userRes = await API.get(`/Admin/users/${userId}`);
      setUser(userRes.data);

      // Admins don't have sessions — skip the sessions fetch
      if (userRes.data.role !== 'Admin') {
        const sessionsRes = await API.get(`/Admin/users/${userId}/sessions`);
        setSessions(sessionsRes.data);
      }

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

  // Reset filters whenever the active tab or user role changes
  useEffect(() => {
    setTableSearchTerm('');
    setSessionStatusFilter('all');
    setPaymentStatusFilter('all');
    setPayoutStatusFilter('all');
    setCounterpartStatusFilter('all'); // NEW
    setTableSortBy('date_desc');
  }, [activeTab, user?.role]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const normalizeMoney = (amount) => {
    const value = Number(amount || 0);
    return value > 0 && value < 100 ? value * 150 : value;
  };

  const getSplitPercentage = () =>
    user?.professionalProfile?.customSplitPercentage ||
    user?.professionalProfile?.currentSplitPercentage ||
    60;

  const getProfessionalEarning = (session) => {
    const raw = normalizeMoney(session.professionalEarnings);
    if (raw > 0) return raw;
    return Math.round(SESSION_FEE * (getSplitPercentage() / 100));
  };

  const getSessionAmount = (session) => normalizeMoney(session.amount) || SESSION_FEE;
  const formatCurrency = (amount) => `KSh ${normalizeMoney(amount)?.toLocaleString() || 0}`;
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-KE');
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const getProfilePictureUrl = (picturePath) => picturePath ? `${baseUrl}${picturePath}` : '';

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'Pending':   return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
      case 'Completed': return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'Cancelled': return { bg: 'var(--error-bg)',   color: 'var(--error-text)'   };
      default:          return { bg: 'var(--bg-hover)',   color: 'var(--text-secondary)' };
    }
  };

  const getPayoutStatusColor = (status) => {
    switch (status) {
      case 'PaidOut': return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'Pending': return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
      default:        return { bg: 'var(--bg-hover)',   color: 'var(--text-secondary)' };
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
        sub:    `Account name: ${parts[2]}`
      };
    }
    return { method: '📱 M-Pesa', detail: account, sub: null };
  };

  const handleProcessPayout = async () => {
    const pendingSessions = sessions.filter(
      s => s.payoutStatus === 'Pending' && s.paymentStatus === 'Paid'
    );
    if (pendingSessions.length === 0) {
      setError('No pending payouts for this professional');
      return;
    }
    if (!window.confirm(
      `Process payout for ${user.fullName}? This will mark ${pendingSessions.length} session(s) as paid out.`
    )) return;

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

  // ── Early returns ────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
      Loading profile...
    </div>
  );
  if (error) return (
    <div style={{ color: 'var(--error-text)', padding: 40, textAlign: 'center' }}>{error}</div>
  );
  if (!user) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
      User not found
    </div>
  );

  // ── Derived values ───────────────────────────────────────────────────────

  const isProfessional  = user.role === 'Professional';
  const isClient        = user.role === 'Client';
  const isAdmin         = user.role === 'Admin';
  const profileTitle    = isProfessional ? 'Professional Profile'
    : isClient ? 'Client Profile' : 'Admin Profile';
  const sessionPersonLabel  = isProfessional ? 'Client' : isClient ? 'Professional' : 'Client/Professional';
  const showPayoutColumn    = isProfessional;
  const totalEarnings       = sessions
    .filter(s => s.paymentStatus === 'Paid')
    .reduce((sum, s) => sum + getProfessionalEarning(s), 0);
  const totalSessions       = sessions.length;
  const completedSessions   = sessions.filter(s => s.status === 'Completed').length;
  const pendingPayoutSessions = sessions.filter(
    s => s.payoutStatus === 'Pending' && s.paymentStatus === 'Paid'
  );
  const paymentDisplay = isProfessional ? getFormattedPaymentDisplay() : null;

  const getCounterpartName = (session) =>
    user.role === 'Professional' ? session.clientName : session.professionalName;
  const getCounterpartId = (session) =>
    user.role === 'Professional' ? session.clientId : session.professionalId;
  const getCounterpartEmail = (session) =>
    user.role === 'Professional' ? session.clientEmail : session.professionalEmail;

  // ── Filter / sort sessions ───────────────────────────────────────────────

  const filterAndSortSessions = () => {
    let filtered = [...sessions];

    if (tableSearchTerm) {
      const term = tableSearchTerm.toLowerCase();
      filtered = filtered.filter(session => {
        const values = [
          String(getCounterpartId(session) || ''),
          formatDate(session.sessionDate),
          getCounterpartName(session) || '',
          getCounterpartEmail(session) || '',
          String(getSessionAmount(session)),
          session.status || '',
          session.paymentStatus || '',
          ...(showPayoutColumn ? [session.payoutStatus || 'Pending'] : [])
        ];
        return values.some(v => v.toLowerCase().includes(term));
      });
    }

    if (sessionStatusFilter !== 'all')
      filtered = filtered.filter(s => s.status === sessionStatusFilter);
    if (paymentStatusFilter !== 'all')
      filtered = filtered.filter(s => s.paymentStatus === paymentStatusFilter);
    if (showPayoutColumn && payoutStatusFilter !== 'all')
      filtered = filtered.filter(s => (s.payoutStatus || 'Pending') === payoutStatusFilter);
    
    // NEW: Filter by counterpart active status
    if (counterpartStatusFilter !== 'all') {
      filtered = filtered.filter(s => {
        if (counterpartStatusFilter === 'active') return s.counterpartActive === true;
        if (counterpartStatusFilter === 'deactivated') return s.counterpartActive === false;
        return true;
      });
    }

    filtered.sort((a, b) => {
      switch (tableSortBy) {
        case 'date_asc':    return new Date(a.sessionDate) - new Date(b.sessionDate);
        case 'amount_desc': return getSessionAmount(b) - getSessionAmount(a);
        case 'amount_asc':  return getSessionAmount(a) - getSessionAmount(b);
        case 'person_asc':  return (getCounterpartName(a) || '').localeCompare(getCounterpartName(b) || '');
        case 'status_asc':  return (a.status || '').localeCompare(b.status || '');
        default:            return new Date(b.sessionDate) - new Date(a.sessionDate);
      }
    });

    return filtered;
  };

  // ── Filter / sort ratings ────────────────────────────────────────────────

  const filterAndSortRatings = () => {
    let filtered = [...ratings];

    if (tableSearchTerm) {
      const term = tableSearchTerm.toLowerCase();
      filtered = filtered.filter(rating => {
        const values = [
          String(rating.clientId || ''),
          rating.clientName || '',
          rating.clientEmail || '',
          String(rating.rating || ''),
          rating.review || '',
          formatDate(rating.createdAt)
        ];
        return values.some(v => v.toLowerCase().includes(term));
      });
    }

    filtered.sort((a, b) => {
      switch (tableSortBy) {
        case 'date_asc':    return new Date(a.createdAt) - new Date(b.createdAt);
        case 'rating_desc': return (b.rating || 0) - (a.rating || 0);
        case 'rating_asc':  return (a.rating || 0) - (b.rating || 0);
        case 'client_asc':  return (a.clientName || '').localeCompare(b.clientName || '');
        default:            return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return filtered;
  };

  const filteredSessions = filterAndSortSessions();
  const filteredRatings  = filterAndSortRatings();

  const resetTableControls = () => {
    setTableSearchTerm('');
    setSessionStatusFilter('all');
    setPaymentStatusFilter('all');
    setPayoutStatusFilter('all');
    setCounterpartStatusFilter('all'); // NEW
    setTableSortBy('date_desc');
  };

  const hasActiveFilters =
    tableSearchTerm ||
    sessionStatusFilter !== 'all' ||
    paymentStatusFilter !== 'all' ||
    (showPayoutColumn && payoutStatusFilter !== 'all') ||
    counterpartStatusFilter !== 'all' || // NEW
    tableSortBy !== 'date_desc';

  // ── PDF export ───────────────────────────────────────────────────────────

  const exportActiveTable = () => {
    const doc = new jsPDF('landscape');
    const isRatingsExport = activeTab === 'ratings';
    const sessionTitleParts = [
      sessionStatusFilter !== 'all' ? sessionStatusFilter : '',
      paymentStatusFilter !== 'all' ? `${paymentStatusFilter} Payment` : '',
      showPayoutColumn && payoutStatusFilter !== 'all' ? `${payoutStatusFilter} Payout` : '',
      `${profileTitle} Sessions Report`
    ].filter(Boolean);
    const title = isRatingsExport
      ? `${profileTitle} Ratings & Reviews Report`
      : sessionTitleParts.join(' ');
    const sessionHeaders = ['Date', `${sessionPersonLabel} ID`, sessionPersonLabel, 'Amount'];
    if (sessionStatusFilter === 'all') sessionHeaders.push('Status');
    if (paymentStatusFilter === 'all') sessionHeaders.push('Payment');
    if (showPayoutColumn && payoutStatusFilter === 'all') sessionHeaders.push('Payout');
    const rows = isRatingsExport
      ? filteredRatings.map(r => [
          String(r.clientId || 'N/A'),
          r.clientName || 'N/A',
          String(r.rating || ''),
          r.review || '-',
          formatDate(r.createdAt)
        ])
      : filteredSessions.map(s => [
          formatDate(s.sessionDate),
          String(getCounterpartId(s) || 'N/A'),
          getCounterpartName(s) || 'N/A',
          formatCurrency(getSessionAmount(s)),
          ...(sessionStatusFilter === 'all' ? [s.status] : []),
          ...(paymentStatusFilter === 'all' ? [s.paymentStatus] : []),
          ...(showPayoutColumn && payoutStatusFilter === 'all' ? [s.payoutStatus || 'Pending'] : [])
        ]);

    const startY = addReportHeader(doc, title, [
      `Generated: ${new Date().toLocaleString()}`,
      `Profile: ${user.fullName}`,
      `Rows: ${rows.length}`,
      sessionStatusFilter !== 'all' ? `Session Status Filter: ${sessionStatusFilter}` : '',
      paymentStatusFilter !== 'all' ? `Payment Filter: ${paymentStatusFilter}` : '',
      showPayoutColumn && payoutStatusFilter !== 'all' ? `Payout Filter: ${payoutStatusFilter}` : ''
    ]);
    doc.autoTable({
      startY,
      head: [isRatingsExport
        ? ['Client ID', 'Client', 'Rating', 'Review', 'Date']
        : sessionHeaders],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });
    doc.save(
      `${title.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
    );
  };

  // ── Shared input style ───────────────────────────────────────────────────

  const selectStyle = {
    padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  return (
    <div>
      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => navigate('/admin/users')}
          style={{
            background: 'transparent', color: 'var(--accent)',
            border: '1px solid var(--accent)', padding: '6px 12px',
            borderRadius: 8, cursor: 'pointer', fontSize: 13
          }}
        >
          ← Back to Users
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          {profileTitle}
        </h2>
      </div>

      {/* Profile header card */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, padding: 24,
        border: '1px solid var(--border)', marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
            background: isProfessional
              ? 'var(--gradient-primary)'
              : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-inverse)', fontSize: 32, fontWeight: 600
          }}>
            {getProfilePictureUrl(user.profilePicture) ? (
              <img
                src={getProfilePictureUrl(user.profilePicture)}
                alt={`${user.fullName} profile`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              user.fullName?.charAt(0).toUpperCase()
            )}
          </div>

          {/* Name / email / meta */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                {user.fullName}
              </h3>
              <span style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: isAdmin      ? 'var(--info-bg)'    :
                            isProfessional ? 'var(--success-bg)' : 'var(--warning-bg)',
                color:      isAdmin      ? 'var(--info-text)'  :
                            isProfessional ? 'var(--success-text)' : 'var(--warning-text)'
              }}>
                {user.role}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 4px' }}>{user.email}</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 4px' }}>
              Phone: {user.phoneNumber || 'N/A'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 4px' }}>
              Status: {user.isActive ? 'Active' : 'Deactivated'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Joined: {formatDate(user.dateRegistered)}
            </p>
          </div>

          {isProfessional && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--success-text)' }}>
                {formatCurrency(totalEarnings)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Earnings</div>
            </div>
          )}
        </div>

        {/* Professional extra info */}
        {isProfessional && user.professionalProfile && (
          <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Specialization</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {user.professionalProfile.specialization || 'Not specified'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Bio</p>
                <p style={{ fontSize: 14, color: 'var(--text-primary)' }}>
                  {user.professionalProfile.bio || 'Not specified'}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Average Rating</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <span key={star} style={{
                        fontSize: 16,
                        color: star <= (user.professionalProfile.averageRating || 0)
                          ? '#FFD700' : 'var(--border)'
                      }}>★</span>
                    ))}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {user.professionalProfile.averageRating?.toFixed(1) || 'No ratings'}
                  </span>
                </div>
              </div>
              <div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Split Percentage</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)' }}>
                  {getSplitPercentage()}%
                </p>
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Payment Method</p>
              {paymentDisplay ? (
                <div style={{
                  padding: '12px 16px', background: 'var(--success-bg)',
                  borderRadius: 8, border: '1px solid var(--secondary)'
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
                  padding: '12px 16px', background: 'var(--warning-bg)',
                  borderRadius: 8, border: '1px solid var(--warning-text)'
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

      {/* ── TABS ──
          Admin: no tabs at all — profile card above is enough.
          Client: Overview + Sessions.
          Professional: Overview + Sessions + Ratings + Payouts.
      */}
      {!isAdmin && (
        <>
          <div style={{
            display: 'flex', gap: 12, marginBottom: 24,
            borderBottom: '1px solid var(--border)'
          }}>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'sessions', label: `Sessions (${sessions.length})` },
              ...(isProfessional ? [
                { id: 'ratings', label: `Ratings & Reviews (${ratings.length})` },
                { id: 'payouts', label: 'Payouts' }
              ] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'transparent',
                  color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                  padding: '8px 0', marginRight: 16, cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Overview tab ── */}
          {activeTab === 'overview' && (
            <div style={{
              background: 'var(--bg-card)', borderRadius: 12, padding: 24,
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
                Activity Summary
              </h3>
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
                    <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--warning-text)', margin: 0 }}>
                      {formatCurrency(totalEarnings)}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Total Earnings</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Sessions tab ── */}
          {activeTab === 'sessions' && (
            <div>
              {sessions.length > 0 && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Search — no field selector */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <input
                      type="text"
                      placeholder="🔍 Search sessions..."
                      value={tableSearchTerm}
                      onChange={e => setTableSearchTerm(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13
                      }}
                    />
                  </div>

                  <select value={sessionStatusFilter} onChange={e => setSessionStatusFilter(e.target.value)} style={selectStyle}>
                    <option value="all">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  <select value={paymentStatusFilter} onChange={e => setPaymentStatusFilter(e.target.value)} style={selectStyle}>
                    <option value="all">All Payments</option>
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>

                  {showPayoutColumn && (
                    <select value={payoutStatusFilter} onChange={e => setPayoutStatusFilter(e.target.value)} style={selectStyle}>
                      <option value="all">All Payouts</option>
                      <option value="Pending">Pending</option>
                      <option value="PaidOut">Paid Out</option>
                    </select>
                  )}

                  {/* NEW: Counterpart Status filter */}
                  <select value={counterpartStatusFilter} onChange={e => setCounterpartStatusFilter(e.target.value)} style={selectStyle}>
                    <option value="all">All Counterpart Status</option>
                    <option value="active">Counterpart Active</option>
                    <option value="deactivated">Counterpart Deactivated</option>
                  </select>

                  <select value={tableSortBy} onChange={e => setTableSortBy(e.target.value)} style={selectStyle}>
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="amount_desc">Amount High-Low</option>
                    <option value="amount_asc">Amount Low-High</option>
                    <option value="person_asc">{sessionPersonLabel} A-Z</option>
                    <option value="status_asc">Status A-Z</option>
                  </select>

                  <button onClick={exportActiveTable} style={{ ...selectStyle, cursor: 'pointer' }}>
                    📥 Export
                  </button>

                  {hasActiveFilters && (
                    <button onClick={resetTableControls} style={{ ...selectStyle, background: 'transparent', cursor: 'pointer' }}>
                      Clear Filters
                    </button>
                  )}
                </div>
              )}

              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {sessions.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No sessions found
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>{sessionPersonLabel} ID</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>{sessionPersonLabel}</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Amount</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Status</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Payment</th>
                          {showPayoutColumn && (
                            <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Payout</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSessions.map(session => {
                          const statusStyle = getStatusColor(session.status);
                          const payoutStyle = getPayoutStatusColor(session.payoutStatus);
                          return (
                            <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                                {formatDate(session.sessionDate)}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                                #{getCounterpartId(session) || 'N/A'}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                                {getCounterpartName(session)}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-primary)' }}>
                                {formatCurrency(getSessionAmount(session))}
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  background: statusStyle.bg, color: statusStyle.color,
                                  padding: '4px 12px', borderRadius: 20, fontSize: 11
                                }}>
                                  {session.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                <span style={{
                                  color: session.paymentStatus === 'Paid'
                                    ? 'var(--success-text)' : 'var(--warning-text)'
                                }}>
                                  {session.paymentStatus}
                                </span>
                              </td>
                              {showPayoutColumn && (
                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                  <span style={{
                                    background: payoutStyle.bg, color: payoutStyle.color,
                                    padding: '4px 12px', borderRadius: 20, fontSize: 11
                                  }}>
                                    {session.payoutStatus || 'Pending'}
                                  </span>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Showing {filteredSessions.length} of {sessions.length} sessions
              </div>
            </div>
          )}

          {/* ── Ratings tab (Professional only) ── */}
          {activeTab === 'ratings' && isProfessional && (
            <div>
              {ratings.length > 0 && (
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Search — no field selector */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <input
                      type="text"
                      placeholder="🔍 Search ratings..."
                      value={tableSearchTerm}
                      onChange={e => setTableSearchTerm(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13
                      }}
                    />
                  </div>

                  <select value={tableSortBy} onChange={e => setTableSortBy(e.target.value)} style={selectStyle}>
                    <option value="date_desc">Newest First</option>
                    <option value="date_asc">Oldest First</option>
                    <option value="rating_desc">Rating High-Low</option>
                    <option value="rating_asc">Rating Low-High</option>
                    <option value="client_asc">Client A-Z</option>
                  </select>

                  <button onClick={exportActiveTable} style={{ ...selectStyle, cursor: 'pointer' }}>
                    📥 Export
                  </button>

                  {(tableSearchTerm || tableSortBy !== 'date_desc') && (
                    <button onClick={resetTableControls} style={{ ...selectStyle, background: 'transparent', cursor: 'pointer' }}>
                      Clear Filters
                    </button>
                  )}
                </div>
              )}

              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                {ratings.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No ratings yet
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Client</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Client ID</th>
                          <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>Rating</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Review</th>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRatings.map(rating => (
                          <tr key={rating.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>{rating.clientName}</td>
                            <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>#{rating.clientId || 'N/A'}</td>
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

              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                Showing {filteredRatings.length} of {ratings.length} ratings
              </div>
            </div>
          )}

          {/* ── Payouts tab (Professional only) ── */}
          {activeTab === 'payouts' && isProfessional && (
            <div style={{
              background: 'var(--bg-card)', borderRadius: 12, padding: 24,
              border: '1px solid var(--border)'
            }}>
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

              {pendingPayoutSessions.length > 0 ? (
                <>
                  <div style={{ marginBottom: 16, padding: 12, background: 'var(--warning-bg)', borderRadius: 8 }}>
                    <p style={{ fontSize: 13, color: 'var(--warning-text)', margin: 0 }}>
                      📋 {pendingPayoutSessions.length} session(s) ready for payout totalling{' '}
                      {formatCurrency(pendingPayoutSessions.reduce((sum, s) => sum + getProfessionalEarning(s), 0))}
                    </p>
                  </div>
                  <button
                    onClick={handleProcessPayout}
                    style={{
                      width: '100%', padding: '12px', background: 'var(--accent)',
                      color: 'white', border: 'none', borderRadius: 8,
                      fontSize: 14, fontWeight: 500, cursor: 'pointer'
                    }}
                  >
                    Process Payout for {user.fullName}
                  </button>
                </>
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No pending payouts. All earnings have been paid out.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
