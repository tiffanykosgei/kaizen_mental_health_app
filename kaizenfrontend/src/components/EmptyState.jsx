export default function EmptyState({ icon, title, message, actionLabel, onAction }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 16,
      padding: '48px 24px',
      textAlign: 'center',
      border: '1.5px solid var(--border)'
    }}>
      {icon && (
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      )}
      <h3 style={{
        fontSize: 18,
        fontWeight: 600,
        marginBottom: 8,
        color: 'var(--text-primary)'
      }}>
        {title}
      </h3>
      <p style={{
        color: 'var(--text-secondary)',
        fontSize: 14,
        marginBottom: onAction ? 24 : 0,
        lineHeight: 1.6
      }}>
        {message}
      </p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          style={{
            width: 'auto',
            padding: '10px 28px',
            background: '#e91e8c',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}