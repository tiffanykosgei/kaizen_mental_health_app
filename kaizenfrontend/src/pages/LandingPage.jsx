import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';

const roles = [
  {
    key: 'Client',
    icon: '🧠',
    title: 'I am a Client',
    //desc: 'Take assessments, book sessions with professionals, access mental health resources and track your wellness journey.',
    color: 'var(--primary)',
    light: 'rgba(233,30,140,0.08)'
  },
  {
    key: 'Professional',
    icon: '👩‍⚕️',
    title: 'I am a Professional',
    //desc: 'Manage client sessions, upload mental health resources and support clients on their journey to better wellbeing.',
    color: 'var(--secondary)',
    light: 'rgba(0,201,141,0.08)'
  },
  {
    key: 'Admin',
    icon: '🛡️',
    title: 'I am an Admin',
    //desc: 'Oversee the platform, manage users, monitor sessions and generate system-wide reports.',
    color: '#7c63ff',
    light: 'rgba(124,99,255,0.08)'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1.5px solid var(--border)', background: 'var(--bg-card)' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>
            Kaizen
          </h1>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Mental Health Platform</p>
        </div>
        <button
          onClick={toggle}
          className={`theme-toggle ${dark ? 'dark' : ''}`}
          title="Toggle theme"
        >
          <div className="theme-toggle-thumb" />
        </button>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '60px 20px 40px' }}>
        <div style={{ display: 'inline-block', background: 'rgba(233,30,140,0.1)', color: 'var(--primary)', padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, marginBottom: 20 }}>
          Your wellness journey starts here
        </div>
        <h2 style={{ fontSize: 42, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16, lineHeight: 1.2 }}>
          Welcome to <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Kaizen</span>
        </h2>
        <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto 48px' }}>
          A safe, supportive space for mental health assessment, professional guidance and personal growth.
        </p>

        {/* Role cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
          {roles.map(role => (
            <div
              key={role.key}
              onClick={() => navigate(`/login/${role.key.toLowerCase()}`)}
              style={{
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderRadius: 20,
                padding: '32px 24px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = role.color;
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 8px 24px ${role.light}`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{role.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>{role.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>{role.desc}</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/login/${role.key.toLowerCase()}`); }}
                  style={{ flex: 1, padding: '10px', fontSize: 13, background: `linear-gradient(135deg, ${role.color}, ${role.color}cc)`, borderRadius: 8, color: 'white', border: 'none' }}
                >
                  Sign In
                </button>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/register?role=${role.key}`); }}
                  style={{ flex: 1, padding: '10px', fontSize: 13, background: 'transparent', color: role.color, border: `1.5px solid ${role.color}`, borderRadius: 8 }}
                >
                  Register
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}