import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';

export default function AboutPage() {
  const navigate = useNavigate();
  const { dark, toggleTheme } = useTheme();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
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
        <button onClick={toggleTheme} className={`theme-toggle ${dark ? 'dark' : ''}`} type="button">
          <div className="theme-toggle-thumb" />
        </button>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24 }}>
          About Kaizen
        </h1>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--gradient-primary)', marginBottom: 32 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Kaizen is a comprehensive mental health platform designed to make professional mental healthcare accessible, personalized, and stigma-free. Our name comes from the Japanese philosophy of "continuous improvement" — because we believe that small, consistent steps lead to lasting wellbeing.
          </p>
          
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>Our Mission</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            To democratize mental health support by providing a secure, integrated platform where individuals can access assessments, connect with licensed professionals, and track their journey toward emotional wellness.
          </p>
          
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>What We Offer</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 24 }}>
            <li>Evidence-based mental health assessments</li>
            <li>Secure video sessions with licensed therapists</li>
            <li>Personalized wellness tracking and analytics</li>
            <li>Resource library with coping strategies and tools</li>
            <li>For professionals: client management and resource sharing</li>
          </ul>
          
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>Our Values</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            We prioritize privacy, compassion, and continuous improvement. Every feature is designed with input from mental health professionals and users to ensure it truly serves those who need it most.
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
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
      </div>
    </div>
  );
}