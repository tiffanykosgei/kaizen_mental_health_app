import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import API from '../api/axios';

export default function ForgotPassword() {
  const { dark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/forgot-password', { email });
      setMessage(res.data?.message || 'If an active account exists for that email, a password reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '13px 16px',
    border: '1.5px solid var(--border)', borderRadius: 10,
    fontSize: 14, background: 'var(--bg-card)',
    color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <button onClick={toggleTheme} className={`theme-toggle ${dark ? 'dark' : ''}`} type="button">
          <div className="theme-toggle-thumb" />
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-card)', borderRadius: 20, border: '1.5px solid var(--border)', padding: '40px 36px', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔐</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Forgot Password</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Enter your email to receive a reset link</p>
        </div>

        {error && <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13, lineHeight: 1.5 }}>{error}</div>}
        {message && <div style={{ background: 'rgba(156,39,176,0.1)', color: 'var(--secondary)', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13, lineHeight: 1.5 }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Email Address</label>
            <input type="email" placeholder="you@gmail.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 600, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
