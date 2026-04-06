export default function Dashboard() {
  const fullName = localStorage.getItem('fullName') || 'there';
  const role = localStorage.getItem('role');

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Role-specific messages
  const getMessage = () => {
    switch(role) {
      case 'Admin':
        return {
          title: 'Lead with Compassion',
          quote: '"A healthy mind is the foundation of a healthy life."',
          author: '— Anonymous'
        };
      case 'Professional':
        return {
          title: 'Healing Starts Here',
          quote: '"The greatest healing therapy is friendship and love."',
          author: '— Hubert H. Humphrey'
        };
      default:
        return {
          title: `Welcome back, ${fullName}`,
          quote: '"You don\'t have to be positive all the time. It\'s perfectly okay to feel sad, angry, annoyed, frustrated, scared, or anxious. Having feelings doesn\'t make you a negative person. It makes you human."',
          author: '— Lori Deschene'
        };
    }
  };

  const message = getMessage();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* Greeting Card with Image */}
      <div style={{
        background: 'linear-gradient(135deg, #fff0f6, #f0fff8)',
        border: '1.5px solid var(--border)',
        borderRadius: 20,
        padding: '32px 28px',
        marginBottom: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        position: 'relative'
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, color: '#e91e8c', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {getGreeting()}
          </p>
          <h2 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.2 }}>
            {fullName} 👋
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 0 }}>
            {role === 'Professional'
              ? 'Your clients are counting on you. Make today count.'
              : role === 'Admin'
              ? 'Oversee the platform and ensure everything runs smoothly.'
              : 'Your mental wellness journey continues here. Take it one step at a time.'}
          </p>
        </div>
        <div style={{ flexShrink: 0, width: 130, height: 130 }}>
          <img
            src="/brain-wellness.jpeg"
            alt="Take care of your mind"
            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12 }}
          />
        </div>
      </div>

      {/* Image and Mental Health Message */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        {/* Enlarged Image */}
        <div style={{
          maxWidth: 450,
          margin: '0 auto 32px auto'
        }}>
          <img 
            src="/brain-wellness.jpeg" 
            alt="Mental Wellness"
            style={{
              width: '100%',
              height: 'auto',
              borderRadius: 24,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none',
            width: '100%',
            aspectRatio: '1/1',
            background: 'linear-gradient(135deg, #6c63ff, #3c3489)',
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 80
          }}>
            🧠
          </div>
        </div>

        {/* Role-specific Mental Health Message */}
        <div style={{ maxWidth: 600 }}>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#1a202c',
            marginBottom: 16,
            lineHeight: 1.3
          }}>
            {message.title}
          </h1>
          <p style={{
            fontSize: 18,
            color: '#4a5568',
            lineHeight: 1.6,
            fontStyle: 'italic'
          }}>
            {message.quote}
          </p>
          <p style={{
            fontSize: 14,
            color: '#718096',
            marginTop: 24,
            lineHeight: 1.5
          }}>
            {message.author}
          </p>
        </div>
      </div>

    </div>
  );
}