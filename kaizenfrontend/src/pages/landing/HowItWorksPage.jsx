import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';

const roleInfo = {
  client: {
    title: 'Client Portal',
    description: [
      'Take anonymous mental health assessments to understand your current state.',
      'Book video or in-person sessions with licensed professionals.',
      'Track your mood, sleep, and wellness metrics over time.',
      'Access personalized resources and exercises based on your needs.',
      'Receive progress reports and insights from your therapist.'
    ]
  },
  professional: {
    title: 'Professional Portal',
    description: [
      'Manage your client schedule and session notes securely.',
      'Upload therapeutic resources, worksheets, and exercises for clients.',
      'Monitor client progress through assessment data and mood tracking.',
      'Communicate with clients through secure messaging.',
      'Generate clinical reports and track outcomes.'
    ]
  },
  admin: {
    title: 'Admin Portal',
    description: [
      'Oversee platform operations and user management.',
      'Generate analytics and compliance reports.',
      'Manage professional credentials and client assignments.',
      'Configure organizational settings and policies.',
      'Monitor system health and support tickets.'
    ]
  }
};

export default function HowItWorksPage() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { dark, toggleTheme } = useTheme();
  const info = roleInfo[role] || roleInfo.client;

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

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
          How It Works: {info.title}
        </h1>
        <div style={{ width: 60, height: 4, borderRadius: 2, background: 'var(--gradient-primary)', marginBottom: 32 }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {info.description.map((text, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                minWidth: 32, height: 32, borderRadius: 16,
                background: 'var(--primary)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold'
              }}>{idx + 1}</div>
              <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {text}
              </p>
            </div>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 48 }}>
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
          <button
            onClick={() => navigate(`/portal/${role}`)}
            style={{
              padding: '12px 32px', background: 'var(--primary)',
              color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 16, fontWeight: 500
            }}
          >
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}