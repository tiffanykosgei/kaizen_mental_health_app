import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import { getReturnDestination } from '../../utils/returnDestination';

export default function Terms() {
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
          Terms & Conditions
        </h1>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--gradient-primary)', marginBottom: 32 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong>Last updated:</strong> May 4, 2026
          </p>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            By using Kaizen Mental Health Platform, you agree to these terms. We provide services for informational and 
            therapeutic support, but they are not a substitute for emergency care. If you're in crisis, contact local 
            emergency services immediately.
          </p>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>1. Eligibility</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            You must be at least 18 years old to use our services. For minors, parental consent is required.
          </p>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>2. Privacy</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Your data is protected as described in our Privacy Policy. We comply with Kenya's Data Protection Act.
          </p>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>3. Payments & Refunds</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Session fees are charged in advance. Cancellations within 24 hours may not be refunded. Contact support for issues.
          </p>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginTop: 16 }}>4. Limitation of Liability</h2>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Kaizen is not liable for indirect damages arising from use of the platform. Professional advice given by therapists 
            is their own responsibility.
          </p>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 16 }}>
            For any legal questions, contact us at <a href="mailto:kosgeitiffany@gmail.com" style={{ color: 'var(--primary)' }}>kosgeitiffany@gmail.com</a>.
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
