export default function AlertMessage({ type = 'error', message }) {
  if (!message) return null;

  const styles = {
    error: {
      background: '#fff0f0',
      color: '#c0002a',
      border: '1.5px solid #ffc0c8'
    },
    success: {
      background: '#f0fff8',
      color: '#006040',
      border: '1.5px solid #a0f0d0'
    },
    warning: {
      background: '#fffbea',
      color: '#854f0b',
      border: '1.5px solid #fcd34d'
    },
    info: {
      background: '#eff6ff',
      color: '#1e40af',
      border: '1.5px solid #bfdbfe'
    }
  };

  const icons = {
    error: '✕',
    success: '✓',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div style={{
      ...styles[type],
      padding: '10px 14px',
      borderRadius: 8,
      fontSize: 13,
      marginBottom: 16,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      lineHeight: 1.5
    }}>
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}