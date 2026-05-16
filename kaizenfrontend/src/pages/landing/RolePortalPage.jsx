import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import { LegalLinks } from '../../components/LegalConsent';

const roleConfig = {
  client: {
    key: 'Client',
    emoji: '🧠',
    title: 'Client Portal',
    subtitle: 'Client Login Here',
    desc: 'Take assessments, book sessions and track your wellness journey.',
    color: 'var(--primary)',
    bg: 'rgba(233,30,140,0.06)',
    loginPath: '/login/client',
    registerPath: '/register/client',
  },
  professional: {
    key: 'Professional',
    emoji: '👩🏾‍⚕️',
    title: 'Professional Portal',
    subtitle: 'Professional Login Here',
    desc: 'Manage client sessions, upload resources and support clients.',
    color: 'var(--secondary)',
    bg: 'rgba(0,201,141,0.06)',
    loginPath: '/login/professional',
    registerPath: '/register/professional',
  },
  admin: {
    key: 'Admin',
    emoji: '🛡️',
    title: 'Admin Portal',
    subtitle: 'Administrator Login Here',
    desc: 'Oversee the platform, manage users and generate reports.',
    color: 'var(--accent)',
    bg: 'rgba(124,99,255,0.06)',
    loginPath: '/login/admin',
    registerPath: '/register/admin',
  },
};

export default function RolePortalPage() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { dark, toggleTheme } = useTheme();

  const config = roleConfig[role] || roleConfig.client;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
      {/* Navigation - same as LandingPage */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 40px', background: 'var(--bg-card)',
        borderBottom: '1.5px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <span style={{ fontSize: 24 }}>🧠</span>
          <div>
            <h1 style={{
              fontSize: 20, fontWeight: 800, margin: 0,
              background: 'var(--gradient-primary)',
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
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button onClick={toggleTheme} className={`theme-toggle ${dark ? 'dark' : ''}`} type="button">
            <div className="theme-toggle-thumb" />
          </button>
        </div>
      </nav>

      {/* Single card - centered */}
      <div style={{
        maxWidth: 400, margin: '60px auto 40px', padding: '0 24px'
      }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: `1.5px solid ${config.color}`,
            borderRadius: 16,
            padding: '32px 28px',
            transition: 'all 0.2s',
            textAlign: 'left',
            boxShadow: `0 8px 32px ${config.bg}`
          }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: config.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, marginBottom: 20
          }}>
            {config.emoji}
          </div>

          <h3 style={{
            fontSize: 17, fontWeight: 700,
            color: config.color, marginBottom: 6
          }}>
            {config.title}
          </h3>
          <p style={{
            fontSize: 13, fontWeight: 500,
            color: 'var(--text-secondary)', marginBottom: 10
          }}>
            {config.subtitle}
          </p>
          <p style={{
            fontSize: 13, color: 'var(--text-muted)',
            lineHeight: 1.6, marginBottom: 24
          }}>
            {config.desc}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => navigate(config.loginPath)}
              style={{
                flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
                background: config.color, color: 'white',
                border: 'none', borderRadius: 8, cursor: 'pointer'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => navigate(config.registerPath)}
              style={{
                flex: 1, padding: '10px 0', fontSize: 13, fontWeight: 500,
                background: 'transparent', color: config.color,
                border: `1.5px solid ${config.color}`, borderRadius: 8, cursor: 'pointer'
              }}
            >
              Register
            </button>
          </div>
          <LegalLinks color={config.color} style={{ marginTop: 22 }} />
        </div>
      </div>

      {/* Back to Welcome Page Button */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '0 24px 40px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 32px', background: 'transparent',
            border: `2px solid var(--primary)`, borderRadius: 8,
            color: 'var(--primary)', cursor: 'pointer',
            fontSize: 16, fontWeight: 500
          }}
        >
          ← Back to Welcome Page
        </button>
      </div>

      {/* Contact Footer - same as LandingPage */}
      <footer style={{
        background: 'var(--bg-card)', borderTop: '1.5px solid var(--border)',
        padding: '48px 24px 32px', marginTop: 40
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 40 }}>
          <div>
            <h4 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Contact</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div><strong>Faiba Mobile</strong><br />Jami Towers, Upper Hill, Nairobi</div>
              <div>📞 0747 585 100<br />📞 020 8405 100</div>
              <div>✉️ <a href="mailto:csc@jtl.co.ke" style={{ color: 'var(--primary)', textDecoration: 'none' }}>csc@jtl.co.ke</a></div>
            </div>
          </div>
          <div>
            <h4 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Services</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li><a href="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Home</a></li>
              <li><a href="/about" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Our Story</a></li>
              <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Services</a></li>
              <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Careers</a></li>
              <li><a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Contact</a></li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
          © 2025 Kaizen Mental Health Platform — A safe space for mental wellness
        </div>
      </footer>
    </div>
  );
}
