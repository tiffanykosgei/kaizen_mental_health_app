// src/components/ThemeToggle.jsx
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      style={{
        background: 'var(--bg-hover)',
        border: '1.5px solid var(--border)',
        borderRadius: '10px',
        padding: '4px',
        display: 'flex',
        gap: '4px',
        transition: 'all 0.2s ease'
      }}
    >
      <button
        onClick={() => setTheme('light')}
        className="theme-toggle-option"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          background: theme === 'light' ? 'var(--accent)' : 'transparent',
          border: 'none',
          color: theme === 'light' ? 'white' : 'var(--text-secondary)'
        }}
        onMouseEnter={(e) => {
          if (theme !== 'light') {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (theme !== 'light') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <span style={{ fontSize: '18px' }}>☀️</span>
        <span style={{ fontSize: '13px', fontWeight: 500 }}>Light</span>
      </button>
      
      <button
        onClick={() => setTheme('dark')}
        className="theme-toggle-option"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          background: theme === 'dark' ? 'var(--accent)' : 'transparent',
          border: 'none',
          color: theme === 'dark' ? 'white' : 'var(--text-secondary)'
        }}
        onMouseEnter={(e) => {
          if (theme !== 'dark') {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (theme !== 'dark') {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }
        }}
      >
        <span style={{ fontSize: '18px' }}>🌙</span>
        <span style={{ fontSize: '13px', fontWeight: 500 }}>Dark</span>
      </button>
    </div>
  );
};

export default ThemeToggle;