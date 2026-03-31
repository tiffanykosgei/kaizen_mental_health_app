import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/useTheme';

const clientNav = [
  { icon: '🏠', label: 'Dashboard',   path: '/dashboard' },
  { icon: '🧠', label: 'Assessment',  path: '/assessment' },
  { icon: '📚', label: 'Resources',   path: '/resources' },
  { icon: '📔', label: 'Journal',     path: '/journal' },
  { icon: '📅', label: 'Sessions',    path: '/sessions' },
];

const professionalNav = [
  { icon: '🏠', label: 'Dashboard',   path: '/dashboard' },
  { icon: '📅', label: 'My Sessions', path: '/professional-sessions' },
  { icon: '📤', label: 'Upload Resource', path: '/upload-resource' },
  { icon: '📚', label: 'Resources',   path: '/resources' },
];

const adminNav = [
  { icon: '🏠', label: 'Dashboard',   path: '/dashboard' },
  { icon: '🛡️', label: 'Admin Panel', path: '/admin' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const role = localStorage.getItem('role');
  const fullName = localStorage.getItem('fullName') || 'User';

  const navItems = role === 'Professional' ? professionalNav
    : role === 'Admin' ? adminNav
    : clientNav;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    navigate('/');
  };

  const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Kaizen</h1>
          <p>Mental Health Platform</p>
        </div>

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

        <div className="sidebar-footer">
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
          <button className="nav-item" onClick={handleLogout} style={{ color: '#c0002a' }}>
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