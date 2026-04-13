//import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  //const navigate = useNavigate();
  const role      = localStorage.getItem('role');
  const firstName = localStorage.getItem('firstName') || '';
  const fullName  = localStorage.getItem('fullName') || '';

  // Use first name if available, fall back to first word of fullName, then empty
  const displayName = firstName.trim()
    || fullName.split(' ')[0].trim()
    || '';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleMessage = () => {
    switch (role) {
      case 'Professional':
        return 'Your clients are counting on you. Make today count.';
      case 'Admin':
        return 'Oversee the platform and ensure everything runs smoothly.';
      default:
        return 'Your mental wellness journey continues here. Take it one step at a time.';
    }
  };

  const getDailyQuote = () => {
    switch (role) {
      case 'Professional':
        return {
          quote: '"The greatest healing therapy is friendship and love."',
          author: '— Hubert H. Humphrey'
        };
      case 'Admin':
        return {
          quote: '"A healthy mind is the foundation of a healthy life."',
          author: '— Anonymous'
        };
      default:
        return {
          quote: '"You don\'t have to be positive all the time. Having feelings doesn\'t make you a negative person. It makes you human."',
          author: '— Lori Deschene'
        };
    }
  };

  const quote = getDailyQuote();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Greeting hero card */}
      <div style={{
        background: 'linear-gradient(135deg, #fff0f6, #f0fff8)',
        border: '1.5px solid var(--border)',
        borderRadius: 20,
        padding: '32px 28px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        overflow: 'hidden'
      }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: 13,
            color: '#e91e8c',
            fontWeight: 600,
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {getGreeting()}
          </p>
          <h2 style={{
            fontSize: 26,
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: 10,
            lineHeight: 1.2
          }}>
            {displayName ? `${getGreeting()}, ${displayName}!` : `${getGreeting()}!`}
          </h2>
          <p style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: 0
          }}>
            {getRoleMessage()}
          </p>
        </div>
        <div style={{ flexShrink: 0, width: 120, height: 120 }}>
          <img
            src="/brain-wellness.jpeg"
            alt="Take care of your mind"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }}
            onError={e => e.target.style.display = 'none'}
          />
        </div>
      </div>

      {/* Daily quote */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border)',
        borderRadius: 14,
        padding: '16px 20px',
        borderLeft: '4px solid #e91e8c',
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0
      }}>
        <p style={{ fontSize: 13, color: '#e91e8c', fontWeight: 600, marginBottom: 4 }}>
          Daily reminder
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
          {quote.quote}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
          {quote.author}
        </p>
      </div>

    </div>
  );
}