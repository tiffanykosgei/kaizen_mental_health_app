import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
  { icon: '⚙️', label: 'Settings', path: '/settings' },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const role = localStorage.getItem('role');
  const firstName = localStorage.getItem('firstName') || '';
  const lastName = localStorage.getItem('lastName') || '';
  const fullName = localStorage.getItem('fullName') || `${firstName} ${lastName}`.trim() || 'User';
  
  // State for profile picture
  const [profilePicture, setProfilePicture] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch profile picture on mount and when refreshKey changes
  useEffect(() => {
    const fetchProfilePicture = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await API.get('/auth/profile');
        const pictureUrl = response.data.profilePicture;

        if (pictureUrl) {
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
          // Add timestamp to prevent caching
          setProfilePicture(`${baseUrl}${pictureUrl}?t=${Date.now()}`);
        } else {
          setProfilePicture('');
        }
      } catch (err) {
        console.error('Failed to fetch profile picture:', err);
        setProfilePicture('');
      }
    };

    fetchProfilePicture();
  }, [refreshKey]);

  // Listen for events to update picture
  useEffect(() => {
    // Handle storage events (for cross-tab updates)
    const handleStorageChange = (e) => {
      if (e.key === 'profilePictureUpdated') {
        setRefreshKey(prev => prev + 1);
      }
    };
    
    // Handle custom event (for same-tab updates)
    const handleCustomEvent = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profilePictureChanged', handleCustomEvent);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profilePictureChanged', handleCustomEvent);
    };
  }, []);

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
            {profilePicture ? (
              <img 
                src={profilePicture} 
                alt="Profile" 
                className="profile-avatar-img"
                onError={() => setProfilePicture('')}
              />
            ) : (
              <span className="profile-initials">{initials}</span>
            )}
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

      <style>{`
        /* Profile Avatar with Image Support */
        .profile-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e91e8c, #9c27b0);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        
        .profile-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .profile-initials {
          font-size: 18px;
          font-weight: 600;
          color: white;
        }
        
        /* Profile Section */
        .sidebar-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          margin: 8px 12px;
          background: var(--bg-hover, rgba(233,30,140,0.1));
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .sidebar-profile:hover {
          background: var(--bg-hover, rgba(233,30,140,0.15));
          transform: translateX(2px);
        }
        
        .profile-info {
          flex: 1;
          min-width: 0;
        }
        
        .profile-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #1a202c);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .profile-link {
          font-size: 11px;
          color: #e91e8c;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}