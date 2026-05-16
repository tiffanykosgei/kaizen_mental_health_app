import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addReportHeader } from '../../utils/pdfReportBranding';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('clients');
  const [showModal, setShowModal] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [actionType, setActionType] = useState(''); // 'deactivate' or 'reactivate'
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [statusFilter, setStatusFilter] = useState('all'); // NEW: 'all', 'active', 'deactivated'
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [externalLink, setExternalLink] = useState('');
  const [linkUpdating, setLinkUpdating] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await API.get('/admin/users');
      const allUsers = response.data;
      setClients(allUsers.filter(u => u.role === 'Client'));
      setProfessionals(allUsers.filter(u => u.role === 'Professional'));
      setAdmins(allUsers.filter(u => u.role === 'Admin'));
    } catch (err) {
      console.error(err);
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUser = (user, action) => {
    setUserToToggle(user);
    setActionType(action);
    setShowModal(true);
  };

  const confirmToggleUser = async () => {
    if (!userToToggle) return;
    setActionLoading(true);
    try {
      if (actionType === 'deactivate') {
        await API.put(`/admin/users/${userToToggle.id}/deactivate`);
        setSuccess(`${userToToggle.firstName} ${userToToggle.lastName} has been deactivated.`);
      } else {
        await API.put(`/admin/users/${userToToggle.id}/reactivate`);
        setSuccess(`${userToToggle.firstName} ${userToToggle.lastName} has been reactivated.`);
      }
      await fetchUsers();
      setShowModal(false);
      setUserToToggle(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const isValidUrl = (url) => {
    try { new URL(url); return url.startsWith('http://') || url.startsWith('https://'); } catch { return false; }
  };

  const handleUpdateExternalLink = async () => {
    if (!selectedProfessional) return;
    if (externalLink && !isValidUrl(externalLink)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setLinkUpdating(true);
    try {
      await API.put(`/admin/professionals/${selectedProfessional.id}/external-link`, { externalProfileUrl: externalLink || null });
      await fetchUsers();
      setShowLinkModal(false);
      setSelectedProfessional(null);
      setExternalLink('');
      setSuccess('External profile link updated!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update link');
    } finally {
      setLinkUpdating(false);
    }
  };

  const openLinkModal = (professional) => {
    setSelectedProfessional(professional);
    setExternalLink(professional.profile?.externalProfileUrl || '');
    setShowLinkModal(true);
  };

  const getCurrentUsers = () => {
    let users = [];
    if (activeTab === 'clients') users = [...clients];
    else if (activeTab === 'professionals') users = [...professionals];
    else users = [...admins];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(u =>
        String(u.id || '').toLowerCase().includes(term) ||
        `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term)
      );
    }
    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0,0,0,0);
      users = users.filter(u => new Date(u.dateRegistered) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23,59,59,999);
      users = users.filter(u => new Date(u.dateRegistered) <= end);
    }
    // NEW: Status filter (only for Clients and Professionals; Admins are always active)
    if (activeTab !== 'admins' && statusFilter !== 'all') {
      const activeStatus = statusFilter === 'active';
      users = users.filter(u => u.isActive === activeStatus);
    }

    // Sorting
    users.sort((a, b) => {
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim();
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim();
      const aDate = new Date(a.dateRegistered);
      const bDate = new Date(b.dateRegistered);
      if (sortBy === 'name_asc') return aName.localeCompare(bName);
      if (sortBy === 'name_desc') return bName.localeCompare(aName);
      if (sortBy === 'date_asc') return aDate - bDate;
      return bDate - aDate;
    });
    return users;
  };

  const filteredUsers = getCurrentUsers();
  const getReportTitle = () => {
    const roleLabel = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    const statusLabel = activeTab !== 'admins' && statusFilter !== 'all'
      ? `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} `
      : 'All ';
    return `${statusLabel}${roleLabel} Report`;
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    const reportTitle = getReportTitle();
    const startY = addReportHeader(doc, reportTitle, [
      `Generated: ${new Date().toLocaleString()}`,
      `Total ${reportTitle.replace(' Report', '').toLowerCase()}: ${filteredUsers.length}`
    ]);
    
    const tableData = filteredUsers.map(u => [
      String(u.id || 'N/A'),
      `${u.firstName || ''} ${u.lastName || ''}`.trim(),
      u.email,
      u.role,
      u.phoneNumber || 'N/A',
      new Date(u.dateRegistered).toLocaleDateString()
    ]);
    
    doc.autoTable({
      startY,
      head: [['ID', 'Name', 'Email', 'Role', 'Phone', 'Registered']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { bottom: 30 }
    });
    
    // Footer
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Contact: +254 729 604375 | Email: kosgeitiffany@gmail.com', 14, finalY);
    doc.text('Services: Home | Our Story | Careers', 14, finalY + 5);
    doc.text('Legal: T&Cs | Privacy Policy', 14, finalY + 10);
    doc.text('© 2025 Kaizen Mental Health Platform — A safe space for mental wellness', 14, finalY + 15);
    
    doc.save(`${reportTitle.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportMenu(false);
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-KE');
  const getRoleBadgeStyle = (role) => {
    switch(role) {
      case 'Admin': return { bg: 'var(--info-bg)', color: 'var(--info-text)' };
      case 'Professional': return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      default: return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
    }
  };

  const UserTable = ({ users, title, emptyMessage }) => (
    <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{title}</h3>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>📥 Export</button>
          {showExportMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10 }}>
              <button onClick={exportToPDF} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📄 PDF</button>
            </div>
          )}
        </div>
      </div>
      {users.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>{emptyMessage}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Registered</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>Status</th>
                {activeTab === 'professionals' && <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12 }}>External Link</th>}
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const badgeStyle = getRoleBadgeStyle(user.role);
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.fullName || 'User';
                const isActive = user.role === 'Admin' ? true : (user.isActive !== false); // admins always active
                const showDeactivateButton = user.role !== 'Admin';
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>#{user.id || 'N/A'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{fullName}</div>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, background: badgeStyle.bg, color: badgeStyle.color, marginTop: 4 }}>{user.role}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(user.dateRegistered)}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, 
                        background: isActive ? 'var(--success-bg)' : 'var(--error-bg)', 
                        color: isActive ? 'var(--success-text)' : 'var(--error-text)' }}>
                        {isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    {activeTab === 'professionals' && (
                      <td style={{ padding: '12px 16px' }}>
                        {user.profile?.externalProfileUrl ? (
                          <a href={user.profile.externalProfileUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#e91e8c', textDecoration: 'none', fontSize: 13 }}>View Link ↗</a>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Not set</span>}
                      </td>
                    )}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(`/admin/users/${user.id}`)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }}>View</button>
                        {user.role === 'Professional' && (
                          <button onClick={() => openLinkModal(user)} style={{ background: 'transparent', color: '#9c27b0', border: '1px solid #9c27b0', padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }}>🔗 Edit Link</button>
                        )}
                        {showDeactivateButton && (
                          isActive ? (
                            <button onClick={() => handleToggleUser(user, 'deactivate')} style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-text)', padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }}>Deactivate</button>
                          ) : (
                            <button onClick={() => handleToggleUser(user, 'reactivate')} style={{ background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-text)', padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }}>Reactivate</button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading users...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>User Management</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>View and manage all platform users</p>

      {error && <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '12px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '12px', borderRadius: 8, marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input type="text" placeholder="🔍 Search by ID, name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <input type="date" placeholder="Start Date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
          <span style={{ fontSize: 12, margin: '0 4px', color: 'var(--text-muted)' }}>Start Date</span>
        </div>
        <div>
          <input type="date" placeholder="End Date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
          <span style={{ fontSize: 12, margin: '0 4px', color: 'var(--text-muted)' }}>End Date</span>
        </div>
        <div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="date_asc">Date (Oldest First)</option>
            <option value="date_desc">Date (Newest First)</option>
          </select>
        </div>
        {/* NEW: Status filter dropdown - only visible for Clients and Professionals */}
        {activeTab !== 'admins' && (
          <div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>
        )}
        {(searchTerm || startDate || endDate || statusFilter !== 'all') && 
          <button onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); setStatusFilter('all'); setSortBy('name_asc'); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
            Clear Filters
          </button>
        }
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Total Clients" value={clients.length} color="purple" icon="👥" />
        <StatsCard title="Professionals" value={professionals.length} color="green" icon="👨🏾‍⚕️" />
        <StatsCard title="Admins" value={admins.length} color="orange" icon="👑" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('clients')} style={{ background: 'transparent', color: activeTab === 'clients' ? 'var(--accent)' : 'var(--text-muted)', border: 'none', borderBottom: activeTab === 'clients' ? '2px solid var(--accent)' : '2px solid transparent', padding: '8px 0', marginRight: 16, cursor: 'pointer' }}>Clients ({clients.length})</button>
        <button onClick={() => setActiveTab('professionals')} style={{ background: 'transparent', color: activeTab === 'professionals' ? 'var(--accent)' : 'var(--text-muted)', border: 'none', borderBottom: activeTab === 'professionals' ? '2px solid var(--accent)' : '2px solid transparent', padding: '8px 0', marginRight: 16, cursor: 'pointer' }}>Professionals ({professionals.length})</button>
        <button onClick={() => setActiveTab('admins')} style={{ background: 'transparent', color: activeTab === 'admins' ? 'var(--accent)' : 'var(--text-muted)', border: 'none', borderBottom: activeTab === 'admins' ? '2px solid var(--accent)' : '2px solid transparent', padding: '8px 0', marginRight: 16, cursor: 'pointer' }}>Admins ({admins.length})</button>
      </div>

      <UserTable users={filteredUsers} title={`All ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`} emptyMessage={`No ${activeTab} found matching your criteria.`} />

      {/* Confirmation Modal */}
      {showModal && userToToggle && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: 18, marginBottom: 8, color: actionType === 'deactivate' ? 'var(--warning-text)' : 'var(--success-text)' }}>
              {actionType === 'deactivate' ? 'Deactivate User' : 'Reactivate User'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {actionType === 'deactivate' ? (
                <>Are you sure you want to <strong>deactivate</strong> <strong>{userToToggle.firstName} {userToToggle.lastName}</strong>?<br />They will not be able to log in, but their data will be preserved.</>
              ) : (
                <>Are you sure you want to <strong>reactivate</strong> <strong>{userToToggle.firstName} {userToToggle.lastName}</strong>?<br />They will be able to log in again.</>
              )}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={confirmToggleUser} disabled={actionLoading} style={{ flex: 1, background: actionType === 'deactivate' ? 'var(--warning-bg)' : 'var(--success-bg)', color: actionType === 'deactivate' ? 'var(--warning-text)' : 'var(--success-text)', border: 'none', padding: '10px', borderRadius: 8, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}>{actionLoading ? 'Processing...' : (actionType === 'deactivate' ? 'Yes, Deactivate' : 'Yes, Reactivate')}</button>
              <button onClick={() => { setShowModal(false); setUserToToggle(null); }} style={{ flex: 1, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '10px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* External Link Modal (unchanged) */}
      {showLinkModal && selectedProfessional && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#9c27b0' }}>Edit External Profile Link</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Professional: <strong>{selectedProfessional.firstName} {selectedProfessional.lastName}</strong></p>
            <input type="url" value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://linkedin.com/in/username" style={{ width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setShowLinkModal(false)} style={{ flex: 1, background: 'transparent', color: '#e91e8c', border: '1.5px solid #e91e8c', padding: '10px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleUpdateExternalLink} disabled={linkUpdating} style={{ flex: 2, background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', color: 'white', border: 'none', padding: '10px', borderRadius: 8, cursor: linkUpdating ? 'not-allowed' : 'pointer', opacity: linkUpdating ? 0.6 : 1 }}>{linkUpdating ? 'Saving...' : 'Save Link'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
        .modal-content { background: var(--bg-card); border-radius: 18px; padding: 28px; max-width: 450px; width:100%; border: 1.5px solid #e91e8c; }
      `}</style>
    </div>
  );
}
