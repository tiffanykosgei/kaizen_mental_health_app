import { useNavigate } from 'react-router-dom';

export default function PageHeader({ title, subtitle, backPath, action }) {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 28
    }}>
      <div>
        {backPath && (
          <button
            onClick={() => navigate(backPath)}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: 'none',
              padding: '0 0 8px 0',
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              width: 'auto'
            }}
          >
            ← Back
          </button>
        )}
        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: 'var(--text-primary)'
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: 14,
            marginTop: 4,
            marginBottom: 0
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {action && (
        <button
          onClick={action.onClick}
          style={{
            width: 'auto',
            padding: '9px 18px',
            background: action.outline ? 'transparent' : '#e91e8c',
            color: action.outline ? '#e91e8c' : 'white',
            border: action.outline ? '1.5px solid #e91e8c' : 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}