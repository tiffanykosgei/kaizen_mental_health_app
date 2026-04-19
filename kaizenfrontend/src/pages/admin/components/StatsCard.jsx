export default function StatsCard({ title, value, color, icon }) {
  const getColorStyles = () => {
    switch(color) {
      case 'purple': return { bg: 'var(--info-bg)', text: 'var(--accent)' };
      case 'green': return { bg: 'var(--success-bg)', text: 'var(--success-text)' };
      case 'orange': return { bg: 'var(--warning-bg)', text: 'var(--warning-text)' };
      case 'red': return { bg: 'var(--error-bg)', text: 'var(--error-text)' };
      default: return { bg: 'var(--bg-hover)', text: 'var(--text-secondary)' };
    }
  };

  const styles = getColorStyles();

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 12,
      padding: 20,
      border: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'all 0.2s ease'
    }}>
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{title}</p>
        <p style={{ fontSize: 28, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{value}</p>
      </div>
      <div style={{
        width: 48,
        height: 48,
        background: styles.bg,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24
      }}>
        {icon}
      </div>
    </div>
  );
}