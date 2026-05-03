import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function AdminUsers() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('clients');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // External link edit modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [externalLink, setExternalLink] = useState('');
  const [linkUpdating, setLinkUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await API.get('/admin/users');
      const allUsers = response.data;
      setClients(allUsers.filter(u => u.role === 'Client'));
      setProfessionals(allUsers.filter(u => u.role === 'Professional'));
      setAdmins(allUsers.filter(u => u.role === 'Admin'));
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (url) => {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  };

  const handleUpdateExternalLink = async () => {
    if (!selectedProfessional) return;
    
    if (externalLink && !isValidUrl(externalLink)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    
    setLinkUpdating(true);
    setError('');
    
    try {
      await API.put(`/admin/professionals/${selectedProfessional.id}/external-link`, {
        externalProfileUrl: externalLink || null
      });
      
      await fetchUsers();
      setShowLinkModal(false);
      setSelectedProfessional(null);
      setExternalLink('');
      
      // Show success message briefly
      const successMsg = document.createElement('div');
      successMsg.textContent = 'External profile link updated successfully!';
      successMsg.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#4caf50; color:white; padding:12px 20px; border-radius:8px; z-index:9999;';
      document.body.appendChild(successMsg);
      setTimeout(() => successMsg.remove(), 3000);
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
    setError('');
  };

  const getCurrentUsers = () => {
    let users = [];
    if (activeTab === 'clients') users = [...clients];
    else if (activeTab === 'professionals') users = [...professionals];
    else users = [...admins];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      users = users.filter(user => {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
        return fullName.includes(term) || user.email.toLowerCase().includes(term);
      });
    }
    
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      users = users.filter(user => {
        const userDate = new Date(user.dateRegistered);
        return userDate.toDateString() === filterDate.toDateString();
      });
    }
    
    users.sort((a, b) => {
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim();
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim();
      const aDate = new Date(a.dateRegistered);
      const bDate = new Date(b.dateRegistered);
      switch(sortBy) {
        case 'name_asc': return aName.localeCompare(bName);
        case 'name_desc': return bName.localeCompare(aName);
        case 'date_asc': return aDate - bDate;
        case 'date_desc': return bDate - aDate;
        default: return aName.localeCompare(bName);
      }
    });
    return users;
  };

  const filteredUsers = getCurrentUsers();

  const handleDeleteUser = async (userId, userName) => {
    setUserToDelete({ id: userId, name: userName });
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await API.delete(`/admin/users/${userToDelete.id}`);
      await fetchUsers();
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError(err.response?.data?.message || 'Could not delete user. Please try again.');
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportToExcel = () => {
    const exportData = filteredUsers.map(user => ({
      'Name': `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      'Email': user.email,
      'Role': user.role,
      'Phone': user.phoneNumber || 'N/A',
      'Registered Date': new Date(user.dateRegistered).toLocaleDateString(),
      'External Profile Link': user.role === 'Professional' ? (user.profile?.externalProfileUrl || 'N/A') : 'N/A',
      'Status': 'Active'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${activeTab.toUpperCase()}`);
    XLSX.writeFile(wb, `${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    try {
      const filtered = getCurrentUsers();
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(233, 30, 140);
      doc.text(`${activeTab.toUpperCase()} Report`, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total ${activeTab}: ${filtered.length}`, 14, 37);
      
      const tableData = filtered.map(user => [
        `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
        user.email,
        user.role,
        user.phoneNumber || 'N/A',
        new Date(user.dateRegistered).toLocaleDateString(),
        user.role === 'Professional' ? (user.profile?.externalProfileUrl || 'N/A') : 'N/A'
      ]);
      
      doc.autoTable({
        startY: 45,
        head: [['Name', 'Email', 'Role', 'Phone', 'Registered', 'External Link']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`${activeTab}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Error: ' + err.message);
    }
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
              <button onClick={exportToExcel} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📊 Excel</button>
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
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Registered</th>
                {activeTab === 'professionals' && (
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>External Profile Link</th>
                )}
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const badgeStyle = getRoleBadgeStyle(user.role);
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.fullName || 'User';
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{fullName}</div>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: badgeStyle.bg, color: badgeStyle.color, marginTop: 4 }}>{user.role}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(user.dateRegistered)}</td>
                    {activeTab === 'professionals' && (
                      <td style={{ padding: '12px 16px' }}>
                        {user.profile?.externalProfileUrl ? (
                          <a href={user.profile.externalProfileUrl} target="_blank" rel="noopener noreferrer" 
                             style={{ color: '#e91e8c', textDecoration: 'none', fontSize: 13 }}>
                            View Link ↗
                          </a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Not set</span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => navigate(`/admin/users/${user.id}`)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }}>View</button>
                        {user.role === 'Professional' && (
                          <button onClick={() => openLinkModal(user)} style={{ background: 'transparent', color: '#9c27b0', border: '1px solid #9c27b0', padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }}>🔗 Edit Link</button>
                        )}
                        {user.role !== 'Admin' && (
                          <button onClick={() => handleDeleteUser(user.id, fullName)} style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-text)', padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer' }}>Remove</button>
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

      {error && <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input type="text" placeholder="🔍 Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="date_asc">Date (Oldest First)</option>
            <option value="date_desc">Date (Newest First)</option>
          </select>
        </div>
        {(searchTerm || dateFilter) && (
          <button onClick={() => { setSearchTerm(''); setDateFilter(''); setSortBy('name_asc'); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Clear Filters</button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Total Clients" value={clients.length} color="purple" icon="👥" />
        <StatsCard title="Professionals" value={professionals.length} color="green" icon="👨‍⚕️" />
        <StatsCard title="Admins" value={admins.length} color="orange" icon="👑" />
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('clients')} style={{ background: 'transparent', color: activeTab === 'clients' ? 'var(--accent)' : 'var(--text-muted)', border: 'none', borderBottom: activeTab === 'clients' ? '2px solid var(--accent)' : '2px solid transparent', padding: '8px 0', marginRight: 16, cursor: 'pointer' }}>Clients ({clients.length})</button>
        <button onClick={() => setActiveTab('professionals')} style={{ background: 'transparent', color: activeTab === 'professionals' ? 'var(--accent)' : 'var(--text-muted)', border: 'none', borderBottom: activeTab === 'professionals' ? '2px solid var(--accent)' : '2px solid transparent', padding: '8px 0', marginRight: 16, cursor: 'pointer' }}>Professionals ({professionals.length})</button>
        <button onClick={() => setActiveTab('admins')} style={{ background: 'transparent', color: activeTab === 'admins' ? 'var(--accent)' : 'var(--text-muted)', border: 'none', borderBottom: activeTab === 'admins' ? '2px solid var(--accent)' : '2px solid transparent', padding: '8px 0', marginRight: 16, cursor: 'pointer' }}>Admins ({admins.length})</button>
      </div>

      <UserTable users={filteredUsers} title={`All ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`} emptyMessage={`No ${activeTab} found matching your criteria.`} />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--error-text)' }}>Remove User</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>Are you sure you want to remove <strong>{userToDelete.name}</strong>? This action cannot be undone and all their data will be permanently deleted.</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={confirmDeleteUser} disabled={deleteLoading} style={{ flex: 1, background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-text)', padding: '10px', borderRadius: 8, cursor: deleteLoading ? 'not-allowed' : 'pointer', opacity: deleteLoading ? 0.6 : 1 }}>{deleteLoading ? 'Removing...' : 'Yes, Remove User'}</button>
              <button onClick={() => { setShowDeleteModal(false); setUserToDelete(null); }} style={{ flex: 1, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '10px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* External Link Edit Modal */}
      {showLinkModal && selectedProfessional && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#9c27b0' }}>Edit External Profile Link</h3>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Professional: <strong>{selectedProfessional.firstName} {selectedProfessional.lastName}</strong>
            </p>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                External Profile URL
              </label>
              <input
                type="url"
                value={externalLink}
                onChange={(e) => setExternalLink(e.target.value)}
                placeholder="https://linkedin.com/in/username OR https://government-registry.gov/profile"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Leave empty to remove the link. Must start with http:// or https://
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => { setShowLinkModal(false); setSelectedProfessional(null); setExternalLink(''); setError(''); }}
                style={{ flex: 1, background: 'transparent', color: '#e91e8c', border: '1.5px solid #e91e8c', padding: '10px', borderRadius: 8, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateExternalLink}
                disabled={linkUpdating}
                style={{ flex: 2, background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', color: 'white', border: 'none', padding: '10px', borderRadius: 8, cursor: linkUpdating ? 'not-allowed' : 'pointer', opacity: linkUpdating ? 0.6 : 1 }}
              >
                {linkUpdating ? 'Saving...' : 'Save Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: var(--bg-card);
          border-radius: 18px;
          padding: 28px;
          max-width: 450px;
          width: 100%;
          border: 1.5px solid #e91e8c;
        }
      `}</style>
    </div>
  );
}