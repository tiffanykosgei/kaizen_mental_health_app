import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import { getReturnDestination } from '../../utils/returnDestination';

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--gradient-primary)', marginBottom: 32 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>Effective date:</strong> May 4, 2026
          </p>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            At Kaizen, your privacy is our highest priority. This policy explains how we collect, use, and protect 
            your personal and health information when you use our platform.
          </p>
          
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>Information We Collect</h2>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 24 }}>
            <li>Account details (name, email, phone)</li>
            <li>Assessment responses and mood logs</li>
            <li>Session notes (only visible to you and your therapist)</li>
            <li>Payment information (processed securely by third‑party providers)</li>
          </ul>
          
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>How We Use Your Data</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            We use your data to provide personalized care, improve our services, and comply with legal obligations. 
            We never sell your data to third parties.
          </p>
          
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>Data Security</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            All data is encrypted in transit and at rest. We undergo regular security audits and comply with industry 
            standards for health information protection.
          </p>
          
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>Your Rights</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            You can access, correct, or delete your personal data at any time. Contact us at <a href="mailto:kosgeitiffany@gmail.com" style={{ color: 'var(--primary)' }}>kosgeitiffany@gmail.com</a> 
            for assistance. You may also request a copy of your data in a portable format.
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
