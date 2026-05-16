import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import API from '../api/axios';

export default function ResetPassword() {
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset link is missing or invalid.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/auth/reset-password', { token, ...form });
      setMessage(res.data?.message || 'Password reset successfully.');
      const role = (res.data?.role || 'client').toLowerCase();
      setTimeout(() => navigate(`/login/${role}`), 1600);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reset password. Please request a new link.');
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
          <div style={{ fontSize: 44, marginBottom: 12 }}>🔑</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Reset Password</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>Choose a new password for your account</p>
        </div>

        {error && <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13, lineHeight: 1.5 }}>{error}</div>}
        {message && <div style={{ background: 'rgba(156,39,176,0.1)', color: 'var(--secondary)', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13, lineHeight: 1.5 }}>{message}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>New Password</label>
            <input type="password" value={form.newPassword} onChange={e => setForm({ ...form, newPassword: e.target.value })} style={inputStyle} required />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} style={inputStyle} required />
          </div>

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 600, background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
