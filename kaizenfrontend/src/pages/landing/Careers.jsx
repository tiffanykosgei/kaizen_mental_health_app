import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import { getReturnDestination } from '../../utils/returnDestination';

export default function Careers() {
  const navigate = useNavigate();
  const { dark, toggleTheme } = useTheme();
  const returnDestination = getReturnDestination();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)' }}>
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 40px', background: 'var(--bg-card)',
        borderBottom: '1.5px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate(returnDestination.path)}>
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
          Careers at Kaizen
        </h1>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--gradient-primary)', marginBottom: 32 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Join a passionate team dedicated to transforming mental health care. At Kaizen, you'll work on meaningful 
            technology that directly impacts people's lives. We're looking for engineers, therapists, designers, 
            and advocates who share our vision of accessible wellness.
          </p>
          
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>Open Positions</h2>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Full‑Stack Developer</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nairobi (Hybrid) – Full time</p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Licensed Therapist (Remote)</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Kenya – Part time / Contract</p>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Community Manager</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nairobi – Full time</p>
          </div>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 16 }}>
            To apply, send your CV and a brief note to <a href="mailto:kosgeitiffany@gmail.com" style={{ color: 'var(--primary)' }}>kosgeitiffany@gmail.com</a>.
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 48 }}>
          <button
            onClick={() => navigate(returnDestination.path)}
            style={{
              padding: '12px 32px', background: 'transparent',
              border: `2px solid var(--primary)`, borderRadius: 8,
              color: 'var(--primary)', cursor: 'pointer',
              fontSize: 16, fontWeight: 500
            }}
          >
            ← {returnDestination.label}
          </button>
        </div>
      </div>
    </div>
  );
}
