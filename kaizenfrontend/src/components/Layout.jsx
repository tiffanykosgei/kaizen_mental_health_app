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
  const [notifications, setNotifications] = useState([]);

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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !role) return;

    let cancelled = false;
    let hasBaseline = false;
    let previousSessions = new Map();
    let previousEarnings = null;
    const reminderKey = `kaizenSessionReminderSent:${role}`;

    const readReminderSettings = () => {
      try {
        return JSON.parse(localStorage.getItem('reminderSettings') || '{}');
      } catch {
        return {};
      }
    };

    const browserNotificationsEnabled = () => {
      const settings = readReminderSettings();
      return settings.browserNotifications?.enabled === true;
    };

    const pushEnabled = (category, key) => {
      const settings = readReminderSettings();
      if (!browserNotificationsEnabled()) return false;
      if (!category || !key) return true;
      const reminder = settings[category]?.[key];
      return reminder?.enabled !== false && reminder?.pushNotification !== false;
    };

    const emailNotificationsEnabled = () => {
      const settings = readReminderSettings();
      return settings.emailNotifications?.enabled !== false;
    };

    const getSessionReminderMinutes = () => {
      const settings = readReminderSettings();
      const category = role === 'Professional' ? 'professionalReminders' : 'clientReminders';
      return settings[category]?.sessionStartReminder?.minutesBefore || 30;
    };

    const notify = (title, body, options = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setNotifications(prev => [...prev, { id, title, body }].slice(-3));
      window.setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 7000);

      if (
        browserNotificationsEnabled() &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(title, {
            body,
            tag: options.tag,
            silent: false
          });
        } catch (err) {
          console.warn('Browser notification failed:', err);
        }
      }

      if (emailNotificationsEnabled()) {
        API.post('/notifications/email', { subject: title, message: body })
          .catch(err => {
            if (err.response?.status !== 401 && err.response?.status !== 403) {
              console.warn('Notification email failed:', err);
            }
          });
      }
    };

    const getPersonName = (session) => {
      if (role === 'Professional') {
        return session.client?.clientFullName
          || `${session.client?.clientFirstName || ''} ${session.client?.clientLastName || ''}`.trim()
          || 'a client';
      }
      return session.professional?.professionalFullName
        || `${session.professional?.professionalFirstName || ''} ${session.professional?.professionalLastName || ''}`.trim()
        || 'your professional';
    };

    const readSentReminders = () => {
      try {
        return JSON.parse(localStorage.getItem(reminderKey) || '{}');
      } catch {
        return {};
      }
    };

    const writeSentReminders = (value) => {
      localStorage.setItem(reminderKey, JSON.stringify(value));
    };

    const checkSessionStartReminders = (sessions) => {
      const category = role === 'Professional' ? 'professionalReminders' : 'clientReminders';
      if (!pushEnabled(category, 'sessionStartReminder')) return;

      const minutesBefore = getSessionReminderMinutes();
      const now = Date.now();
      const sent = readSentReminders();

      sessions.forEach(session => {
        if (session.status !== 'Confirmed' || session.paymentStatus !== 'Paid') return;
        const sessionTime = new Date(session.sessionDate).getTime();
        if (Number.isNaN(sessionTime)) return;

        const minutesUntil = (sessionTime - now) / 60000;
        const sentKey = `${session.id}:${minutesBefore}`;
        if (minutesUntil <= minutesBefore && minutesUntil >= -5 && !sent[sentKey]) {
          notify(
            'Session reminder',
            `Your session with ${getPersonName(session)} starts ${minutesUntil <= 1 ? 'soon' : `in about ${Math.ceil(minutesUntil)} minutes`}.`,
            { tag: `session-reminder-${session.id}` }
          );
          sent[sentKey] = true;
        }
      });

      writeSentReminders(sent);
    };

    const compareSessions = (sessions) => {
      const current = new Map(sessions.map(session => [session.id, session]));

      if (!hasBaseline) {
        previousSessions = current;
        hasBaseline = true;
        checkSessionStartReminders(sessions);
        return;
      }

      sessions.forEach(session => {
        const previous = previousSessions.get(session.id);

        if (!previous) {
          if (role === 'Professional' && pushEnabled('professionalReminders', 'newSessionBookedReminder')) {
            notify(
              'New session booked',
              `${getPersonName(session)} booked a session for ${session.formattedDate || 'an upcoming time'}.`,
              { tag: `session-new-${session.id}` }
            );
          }
          return;
        }

        if (
          session.status !== previous.status &&
          session.status === 'Cancelled'
        ) {
          const category = role === 'Professional' ? 'professionalReminders' : 'clientReminders';
          const key = role === 'Professional' ? 'sessionCancelledReminder' : 'sessionStartReminder';
          if (pushEnabled(category, key)) {
            notify(
              'Session cancelled',
              `A session with ${getPersonName(session)} was cancelled.`,
              { tag: `session-cancelled-${session.id}` }
            );
          }
        }

        if (
          role === 'Client' &&
          session.paymentStatus !== previous.paymentStatus &&
          session.paymentStatus === 'Paid' &&
          pushEnabled('clientReminders', 'paymentProcessedReminder')
        ) {
          notify(
            'Payment processed',
            `Payment for your session with ${getPersonName(session)} was processed successfully.`,
            { tag: `payment-paid-${session.id}` }
          );
        }
      });

      checkSessionStartReminders(sessions);
      previousSessions = current;
    };

    const checkProfessionalEarnings = async () => {
      if (role !== 'Professional') return;
      if (!pushEnabled('professionalReminders', 'professionalPaidReminder')) return;

      const response = await API.get('/payment/my-earnings');
      const earnings = response.data;
      if (!previousEarnings) {
        previousEarnings = earnings;
        return;
      }

      if ((earnings.paidOut || 0) > (previousEarnings.paidOut || 0)) {
        notify(
          'Payout processed',
          'A professional payout has been marked as paid.',
          { tag: 'professional-payout-paid' }
        );
      }
      previousEarnings = earnings;
    };

    const pollNotifications = async () => {
      try {
        const response = await API.get('/session/my-sessions');
        if (cancelled) return;
        const sessions = Array.isArray(response.data) ? response.data : [];
        compareSessions(sessions);
        await checkProfessionalEarnings();
      } catch (err) {
        if (err.response?.status !== 401 && err.response?.status !== 403) {
          console.warn('Notification check failed:', err);
        }
      }
    };

    const handleTestNotification = () => {
      notify(
        'Notifications are working',
        'You will see alerts here when relevant session or payment updates happen.',
        { tag: 'kaizen-test-notification' }
      );
    };

    window.addEventListener('kaizenNotificationTest', handleTestNotification);
    pollNotifications();
    const interval = window.setInterval(pollNotifications, 45000);

    return () => {
      cancelled = true;
      window.removeEventListener('kaizenNotificationTest', handleTestNotification);
      window.clearInterval(interval);
    };
  }, [role]);

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
            <span className="nav-icon">&larr;</span>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>

      <div className="notification-stack" aria-live="polite">
        {notifications.map(notification => (
          <div key={notification.id} className="notification-toast">
            <button
              type="button"
              className="notification-close"
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              aria-label="Dismiss notification"
            >
              x
            </button>
            <div className="notification-title">{notification.title}</div>
            <div className="notification-body">{notification.body}</div>
          </div>
        ))}
      </div>

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

        .notification-stack {
          position: fixed;
          right: 20px;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 2000;
          pointer-events: none;
        }

        .notification-toast {
          width: min(360px, calc(100vw - 40px));
          position: relative;
          background: var(--bg-card, #fff);
          color: var(--text-primary, #1a202c);
          border: 1px solid var(--border, #e2e8f0);
          border-left: 4px solid #e91e8c;
          border-radius: 10px;
          box-shadow: var(--shadow-lg, 0 18px 45px rgba(15, 23, 42, 0.18));
          padding: 14px 38px 14px 16px;
          pointer-events: auto;
        }

        .notification-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .notification-body {
          font-size: 13px;
          line-height: 1.45;
          color: var(--text-secondary, #4a5568);
        }

        .notification-close {
          position: absolute;
          top: 8px;
          right: 10px;
          border: none;
          background: transparent;
          color: var(--text-muted, #718096);
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
          padding: 2px 4px;
        }
      `}</style>
    </div>
  );
}
