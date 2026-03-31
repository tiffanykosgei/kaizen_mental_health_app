export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: 16
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid var(--border)',
        borderTop: '3px solid #e91e8c',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{message}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}