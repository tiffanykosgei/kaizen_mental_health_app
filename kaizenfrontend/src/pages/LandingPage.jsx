import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';

const roles = [
  {
    key: 'Client',
    emoji: '🧠',
    title: 'Client Portal',
    subtitle: 'Client Login Here',
    desc: 'Take assessments, book sessions and track your wellness journey.',
    color: '#e91e8c',
    bg: 'rgba(233,30,140,0.06)'
  },
  {
    key: 'Professional',
    emoji: '👩‍⚕️',
    title: 'Professional Portal',
    subtitle: 'Professional Login Here',
    desc: 'Manage client sessions, upload resources and support clients.',
    color: '#00c98d',
    bg: 'rgba(0,201,141,0.06)'
  },
  {
    key: 'Admin',
    emoji: '🛡️',
    title: 'Admin Portal',
    subtitle: 'Administrator Login Here',
    desc: 'Oversee the platform, manage users and generate reports.',
    color: '#7c63ff',
    bg: 'rgba(124,99,255,0.06)'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 40px', background: 'var(--bg-card)',
        borderBottom: '1.5px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>🧠</span>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              background: 'linear-gradient(135deg, #e91e8c, #00c98d)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Kaizen
            </h1>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
              Mental Health Platform
            </p>
          </div>
        </div>
        <button onClick={toggle} className={`theme-toggle ${dark ? 'dark' : ''}`} type="button">
          <div className="theme-toggle-thumb" />
        </button>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '56px 20px 40px' }}>
        <h2 style={{
          fontSize: 36, fontWeight: 800,
          color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.2
        }}>
          Kaizen Mental Health Portal
        </h2>
        <div style={{
          width: 60, height: 4, borderRadius: 2,
          background: 'linear-gradient(135deg, #e91e8c, #00c98d)',
          margin: '0 auto 20px'
        }} />
        <p style={{
          fontSize: 16, color: 'var(--text-secondary)',
          maxWidth: 600, margin: '0 auto'
        }}>
          Log into the portal to access your mental health services, connect with professionals and track your wellness journey.
        </p>
      </div>

      {/* Portal cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 24, maxWidth: 860, margin: '0 auto',
        padding: '0 24px 60px'
      }}>
        {roles.map(role => (
          <div
            key={role.key}
            style={{
              background: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: 16,
              padding: '32px 28px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = role.color;
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 8px 32px ${role.bg}`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: role.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, marginBottom: 20
            }}>
              {role.emoji}
            </div>

            <h3 style={{
              fontSize: 17, fontWeight: 700,
              color: role.color, marginBottom: 6
            }}>
              {role.title}
            </h3>
            <p style={{
              fontSize: 13, fontWeight: 500,
              color: 'var(--text-secondary)', marginBottom: 10
            }}>
              {role.subtitle}
            </p>
            <p style={{
              fontSize: 13, color: 'var(--text-muted)',
              lineHeight: 1.6, marginBottom: 24
            }}>
              {role.desc}
            </p>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => navigate(`/login/${role.key.toLowerCase()}`)}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
                  background: role.color, color: 'white',
                  border: 'none', borderRadius: 8, cursor: 'pointer'
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => navigate(`/register/${role.key.toLowerCase()}`)}
                style={{
                  flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
                  background: 'transparent', color: role.color,
                  border: `1.5px solid ${role.color}`, borderRadius: 8, cursor: 'pointer'
                }}
              >
                Register
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '20px',
        borderTop: '1.5px solid var(--border)',
        color: 'var(--text-muted)', fontSize: 12
      }}>
        Kaizen Mental Health Platform — A safe space for mental wellness
      </div>
    </div>
  );
}