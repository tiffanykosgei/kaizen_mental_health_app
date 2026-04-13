import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { useState } from 'react';
import API from '../api/axios';

// Client navigation
const clientNav = [
  { icon: '🏠', label: 'Dashboard',   path: '/dashboard' },
  { icon: '👤', label: 'Profile',     path: '/profile' },
  { icon: '🧠', label: 'Assessment',  path: '/assessment' },
  { icon: '📚', label: 'Resources',   path: '/resources' },
  { icon: '📔', label: 'Journal',     path: '/journal' },
  { icon: '📅', label: 'Sessions',    path: '/sessions' },
];

// Professional navigation
const professionalNav = [
  { icon: '🏠', label: 'Dashboard',        path: '/dashboard' },
  { icon: '👤', label: 'Profile',          path: '/profile' },
  { icon: '📅', label: 'My Sessions',      path: '/professional-sessions' },
  { icon: '📤', label: 'Upload Resource',  path: '/upload-resource' },
  { icon: '📚', label: 'Resources',        path: '/resources' },
  { icon: '💰', label: 'Payment Settings', path: '/professional-payment' },
];

// Admin navigation
const adminNav = [
  { icon: '🏠', label: 'Dashboard',      path: '/dashboard' },
  { icon: '👤', label: 'Profile',        path: '/profile' },
  { icon: '👥', label: 'Users',          path: '/admin/users' },
  { icon: '📅', label: 'Sessions',       path: '/admin/sessions' },
  { icon: '📊', label: 'Assessments',    path: '/admin/assessments' },
  { icon: '📚', label: 'Resources',      path: '/admin/resources' },
  { icon: '💰', label: 'Revenue',        path: '/admin/revenue' },
  { icon: '💸', label: 'Payouts',        path: '/admin/payouts' },
  { icon: '📈', label: 'Reports',        path: '/admin/reports' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const role = localStorage.getItem('role');
  const firstName = localStorage.getItem('firstName') || '';
  const lastName = localStorage.getItem('lastName') || '';
  const fullName = localStorage.getItem('fullName') || `${firstName} ${lastName}`.trim() || 'User';

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const navItems = role === 'Professional' ? professionalNav
    : role === 'Admin' ? adminNav
    : clientNav;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('firstName');
    localStorage.removeItem('lastName');
    localStorage.removeItem('fullName');
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteLoading(true);
    
    try {
      await API.delete('/auth/account', { 
        data: { password: deletePassword }
      });
      
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      localStorage.removeItem('fullName');
      
      navigate('/');
    } catch (err) {
      console.error('Delete account error:', err);
      setDeleteError(err.response?.data?.message || 'Failed to delete account. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';

  return (
    <div className="app-layout">
      <aside className="sidebar" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100vh',
        overflow: 'hidden'
      }}>
        {/* Logo Section - Fixed at top */}
        <div className="sidebar-logo" style={{ flexShrink: 0 }}>
          <h1>Kaizen</h1>
          <p>Mental Health Platform</p>
        </div>

        {/* Navigation Section - Scrollable */}
        <nav className="sidebar-nav" style={{ 
          flex: 1, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          minHeight: 0
        }}>
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer Section - Fixed at bottom */}
        <div className="sidebar-footer" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{role}</p>
            </div>
            <button onClick={toggle} className={`theme-toggle ${dark ? 'dark' : ''}`} style={{ flexShrink: 0 }}>
              <div className="theme-toggle-thumb" />
            </button>
          </div>
          
          {/* Delete Account Button */}
          <button 
            className="nav-item" 
            onClick={() => setShowDeleteModal(true)} 
            style={{ color: '#791F1F', marginBottom: 4, width: '100%' }}
          >
            <span className="nav-icon">🗑️</span>
            Delete Account
          </button>
          
          {/* Logout Button */}
          <button className="nav-item" onClick={handleLogout} style={{ color: '#c0002a', width: '100%' }}>
            <span className="nav-icon">🚪</span>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
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
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#791F1F' }}>⚠️ Delete Account</h3>
            <p style={{ fontSize: 13, color: '#718096', marginBottom: 20 }}>
              <strong>This action cannot be undone!</strong><br/><br/>
              You will lose:
              <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 20 }}>
                <li>All your profile information</li>
                <li>All session history</li>
                <li>All resources you've uploaded</li>
                <li>All ratings and reviews</li>
                <li>All payment information</li>
              </ul>
              Please confirm with your password below.
            </p>
            
            {deleteError && (
              <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {deleteError}
              </div>
            )}
            
            <div className="form-group">
              <label style={{ fontWeight: 500, fontSize: 13 }}>Enter your password to confirm</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, marginTop: 4 }}
                autoFocus
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || !deletePassword}
                style={{
                  flex: 1,
                  background: '#FCEBEB',
                  color: '#791F1F',
                  border: '1px solid #F09595',
                  padding: '10px',
                  borderRadius: 8,
                  fontWeight: 500,
                  opacity: (deleteLoading || !deletePassword) ? 0.6 : 1,
                  cursor: (deleteLoading || !deletePassword) ? 'not-allowed' : 'pointer'
                }}
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Permanently Delete'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword('');
                  setDeleteError('');
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: '#6c63ff',
                  border: '1px solid #6c63ff',
                  padding: '10px',
                  borderRadius: 8,
                  fontWeight: 500,
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