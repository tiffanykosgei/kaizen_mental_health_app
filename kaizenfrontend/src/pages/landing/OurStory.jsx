import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import { getReturnDestination } from '../../utils/returnDestination';

export default function OurStory() {
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
          Our Story
        </h1>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--gradient-primary)', marginBottom: 32 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Kaizen was born from a simple belief: mental healthcare should be accessible, compassionate, and continuous. 
            Founded in 2024 by a team of therapists, technologists, and wellness advocates, we set out to break down 
            barriers that prevent people from seeking help.
          </p>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            The name "Kaizen" (改善) is a Japanese term meaning "continuous improvement." It reflects our core philosophy — 
            that small, consistent steps lead to profound change. We've built a platform that supports you at every stage, 
            from first assessment to ongoing growth.
          </p>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Today, Kaizen serves thousands of users across Kenya and beyond, partnering with licensed professionals 
            and organizations to make mental wellness a daily practice. Our journey is just beginning, and we're 
            honored to walk alongside you.
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
