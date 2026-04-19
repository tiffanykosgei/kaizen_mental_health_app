import { useNavigate, useLocation } from 'react-router-dom';
//import { useTheme } from '../context/useTheme';
import API from '../api/axios';

// Client navigation - Added Settings
const clientNav = [
  { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
  { icon: '🧠', label: 'Assessment', path: '/assessment' },
  { icon: '📚', label: 'Resources', path: '/resources' },
  { icon: '📔', label: 'Journal', path: '/journal' },
  { icon: '📅', label: 'Sessions', path: '/sessions' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
];

// Professional navigation - Added Settings
const professionalNav = [
  { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
  { icon: '📅', label: 'My Sessions', path: '/professional-sessions' },
  { icon: '📤', label: 'Upload Resource', path: '/upload-resource' },
  { icon: '📚', label: 'Resources', path: '/resources' },
  { icon: '💰', label: 'Payment Settings', path: '/professional-payment' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
];

// Admin navigation - Added Settings
const adminNav = [
  { icon: '🏠', label: 'Dashboard', path: '/dashboard' },
  { icon: '👥', label: 'Users', path: '/admin/users' },
  { icon: '📅', label: 'Sessions', path: '/admin/sessions' },
  { icon: '📊', label: 'Assessments', path: '/admin/assessments' },
  { icon: '📚', label: 'Resources', path: '/admin/resources' },
  { icon: '💰', label: 'Revenue', path: '/admin/revenue' },
  { icon: '💸', label: 'Payouts', path: '/admin/payouts' },
  { icon: '📈', label: 'Reports', path: '/admin/reports' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const firstName = localStorage.getItem('firstName') || '';
  const lastName = localStorage.getItem('lastName') || '';
  const fullName = localStorage.getItem('fullName') || `${firstName} ${lastName}`.trim() || 'User';

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

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        {/* Logo Section */}
        <div className="sidebar-logo">
          <h1>Kaizen</h1>
          <p>Mental Health Platform</p>
        </div>

        {/* Profile Section */}
        <div className="sidebar-profile" onClick={handleProfileClick}>
          <div className="profile-avatar">
            <span className="profile-initials">{initials}</span>
          </div>
          <div className="profile-info">
            <div className="profile-name">{fullName.split(' ')[0]}</div>
            <div className="profile-link">View Profile</div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="sidebar-nav">
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

        {/* Footer Section - Only Logout Button */}
        <div className="sidebar-footer">
          {/* Logout Button */}
          <button className="logout-btn" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}