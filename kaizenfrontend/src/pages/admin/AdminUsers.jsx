import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';

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

  const handleDeleteUser = async (userId, userName) => {
    setUserToDelete({ id: userId, name: userName });
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeleteLoading(true);
    try {
      await API.delete(`/admin/users/${userToDelete.id}`);
      
      // Refresh user list
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE');
  };

  const getRoleBadgeStyle = (role) => {
    switch(role) {
      case 'Admin':
        return { bg: '#EEEDFE', color: '#3C3489' };
      case 'Professional':
        return { bg: '#E1F5EE', color: '#085041' };
      default:
        return { bg: '#FAEEDA', color: '#633806' };
    }
  };

  const UserTable = ({ users, title, emptyMessage }) => (
    <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f7f9fc' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a202c' }}>{title}</h3>
      </div>
      {users.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#718096' }}>{emptyMessage}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Email</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Registered</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const badgeStyle = getRoleBadgeStyle(user.role);
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.fullName || 'User';
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 500, color: '#1a202c' }}>{fullName}</div>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 500,
                        background: badgeStyle.bg,
                        color: badgeStyle.color,
                        marginTop: 4
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#718096' }}>{user.email}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#718096' }}>{formatDate(user.dateRegistered)}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          style={{
                            background: 'transparent',
                            color: '#6c63ff',
                            border: '1px solid #6c63ff',
                            padding: '5px 12px',
                            fontSize: 12,
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                        >
                          View
                        </button>
                        
                        {/* Only show delete button for non-admin users */}
                        {user.role !== 'Admin' && (
                          <button
                            onClick={() => handleDeleteUser(user.id, fullName)}
                            style={{
                              background: '#FCEBEB',
                              color: '#791F1F',
                              border: '1px solid #F09595',
                              padding: '5px 12px',
                              fontSize: 12,
                              borderRadius: 6,
                              cursor: 'pointer'
                            }}
                          >
                            Remove
                          </button>
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

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Loading users...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>User Management</h2>
      <p style={{ color: '#718096', marginBottom: 24 }}>View and manage all platform users</p>

      {error && (
        <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Total Clients" value={clients.length} color="purple" icon="👥" />
        <StatsCard title="Professionals" value={professionals.length} color="green" icon="👨‍⚕️" />
        <StatsCard title="Admins" value={admins.length} color="orange" icon="👑" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('clients')}
          style={{
            background: 'transparent',
            color: activeTab === 'clients' ? '#6c63ff' : '#718096',
            border: 'none',
            borderBottom: activeTab === 'clients' ? '2px solid #6c63ff' : '2px solid transparent',
            padding: '8px 0',
            marginRight: 16,
            cursor: 'pointer'
          }}
        >
          Clients ({clients.length})
        </button>
        <button
          onClick={() => setActiveTab('professionals')}
          style={{
            background: 'transparent',
            color: activeTab === 'professionals' ? '#6c63ff' : '#718096',
            border: 'none',
            borderBottom: activeTab === 'professionals' ? '2px solid #6c63ff' : '2px solid transparent',
            padding: '8px 0',
            marginRight: 16,
            cursor: 'pointer'
          }}
        >
          Professionals ({professionals.length})
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          style={{
            background: 'transparent',
            color: activeTab === 'admins' ? '#6c63ff' : '#718096',
            border: 'none',
            borderBottom: activeTab === 'admins' ? '2px solid #6c63ff' : '2px solid transparent',
            padding: '8px 0',
            marginRight: 16,
            cursor: 'pointer'
          }}
        >
          Admins ({admins.length})
        </button>
      </div>

      {activeTab === 'clients' && <UserTable users={clients} title="All Clients" emptyMessage="No clients registered yet." />}
      {activeTab === 'professionals' && <UserTable users={professionals} title="All Professionals" emptyMessage="No professionals registered yet." />}
      {activeTab === 'admins' && <UserTable users={admins} title="All Admins" emptyMessage="No admins registered yet." />}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
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
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 450, width: '90%' }}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#791F1F' }}>Remove User</h3>
            <p style={{ fontSize: 14, color: '#4a5568', marginBottom: 20 }}>
              Are you sure you want to remove <strong>{userToDelete.name}</strong>? 
              This action cannot be undone and all their data will be permanently deleted.
            </p>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={confirmDeleteUser}
                disabled={deleteLoading}
                style={{
                  flex: 1,
                  background: '#FCEBEB',
                  color: '#791F1F',
                  border: '1px solid #F09595',
                  padding: '10px',
                  borderRadius: 8,
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteLoading ? 0.6 : 1
                }}
              >
                {deleteLoading ? 'Removing...' : 'Yes, Remove User'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#6c63ff',
                  border: '1px solid #6c63ff',
                  padding: '10px',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
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