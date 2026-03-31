import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const fullName = localStorage.getItem('fullName') || 'there';
  const role = localStorage.getItem('role');

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const btnPrimary = {
    background: '#e91e8c',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    padding: '13px 16px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  };

  const btnOutline = {
    background: 'var(--bg-card)',
    color: 'var(--text-primary)',
    border: '1.5px solid var(--border)',
    borderRadius: 10,
    padding: '13px 16px',
    fontSize: 14,
    fontWeight: 400,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center',
    gap: 10
  };

  const clientActions = [
    { label: 'Take self-assessment', icon: '🧠', path: '/assessment', primary: true },
    { label: 'Browse resources',     icon: '📚', path: '/resources' },
    { label: 'Journal entries',      icon: '📔', path: '/journal' },
    { label: 'Book a session',       icon: '📅', path: '/sessions' },
  ];

  const professionalActions = [
    { label: 'My sessions',          icon: '📅', path: '/professional-sessions', primary: true },
    { label: 'Upload a resource',    icon: '📤', path: '/upload-resource' },
    { label: 'Browse all resources', icon: '📚', path: '/resources' },
  ];

  const adminActions = [
    { label: 'Admin panel',          icon: '🛡️', path: '/admin', primary: true },
  ];

  const actions = role === 'Professional' ? professionalActions
    : role === 'Admin' ? adminActions
    : clientActions;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Hero card with image */}
      <div style={{
        background: 'linear-gradient(135deg, #fff0f6, #f0fff8)',
        border: '1.5px solid var(--border)',
        borderRadius: 20,
        padding: '32px 28px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: '#e91e8c', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {getGreeting()}
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.2 }}>
            {fullName} 👋
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 0 }}>
            {role === 'Professional'
              ? 'You have client sessions waiting for your attention. Check your upcoming appointments.'
              : role === 'Admin'
              ? 'Monitor the platform, manage users and keep everything running smoothly.'
              : 'Your mental wellness journey continues here. Take it one step at a time.'}
          </p>
        </div>
        <div style={{ flexShrink: 0, width: 130, height: 130 }}>
          <img
            src="/brain-wellness.jpeg"
            alt="Take care of your mind"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }}
          />
        </div>
      </div>

      {/* Daily quote — clients only */}
      {role === 'Client' && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 14,
          padding: '16px 20px',
          marginBottom: 24,
          borderLeft: '4px solid #e91e8c'
        }}>
          <p style={{ fontSize: 13, color: '#e91e8c', fontWeight: 600, marginBottom: 4 }}>Daily reminder</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
            "You don't have to be positive all the time. It's perfectly okay to feel sad, angry, annoyed, frustrated, scared, or anxious. Having feelings doesn't make you a negative person. It makes you human."
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Quick actions
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {actions.map(action => (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              style={action.primary ? btnPrimary : btnOutline}
              onMouseEnter={e => {
                if (!action.primary) {
                  e.currentTarget.style.borderColor = '#e91e8c';
                  e.currentTarget.style.color = '#e91e8c';
                }
              }}
              onMouseLeave={e => {
                if (!action.primary) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
            >
              <span style={{ fontSize: 18 }}>{action.icon}</span>
              {action.label}
              <span style={{ marginLeft: 'auto', fontSize: 16, opacity: 0.5 }}>→</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}