export default function ProfileAvatar({ firstName, lastName, size = 'medium', onClick, showLabel = false }) {
  const initials = `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
  
  const sizes = {
    small: { avatar: 40, font: 18, label: 11 },
    medium: { avatar: 56, font: 22, label: 13 },
    large: { avatar: 80, font: 32, label: 14 }
  };
  
  const currentSize = sizes[size] || sizes.medium;
  
  return (
    <div 
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        textAlign: 'center'
      }}
    >
      <div style={{
        width: currentSize.avatar,
        height: currentSize.avatar,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 8px',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(233,30,140,0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
        }
      }}>
        <span style={{
          fontSize: currentSize.font,
          fontWeight: 600,
          color: 'white'
        }}>
          {initials}
        </span>
      </div>
      {showLabel && (
        <span style={{
          fontSize: currentSize.label,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          transition: 'color 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (onClick) e.currentTarget.style.color = '#e91e8c';
        }}
        onMouseLeave={(e) => {
          if (onClick) e.currentTarget.style.color = 'var(--text-secondary)';
        }}>
          Profile
        </span>
      )}
    </div>
  );
}