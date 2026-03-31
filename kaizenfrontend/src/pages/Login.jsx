import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import API from '../api/axios';

const roleConfig = {
  client:       { label: 'Client',       icon: '🧠', color: '#e91e8c', desc: 'Sign in to your wellness account' },
  professional: { label: 'Professional', icon: '👩‍⚕️', color: '#00c98d', desc: 'Sign in to your professional account' },
  admin:        { label: 'Admin',        icon: '🛡️', color: '#7c63ff', desc: 'Sign in to the admin panel' }
};

export default function Login() {
  const { role } = useParams();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const config = roleConfig[role] || roleConfig.client;

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await API.post('/auth/login', form);
      const { token, role: userRole, fullName } = response.data;

      if (userRole.toLowerCase() !== role) {
        setError(`This account is not a ${config.label} account. Please use the correct login page.`);
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('role', userRole);
      localStorage.setItem('fullName', fullName);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <button
          onClick={toggle}
          className={`theme-toggle ${dark ? 'dark' : ''}`}
          type="button"
        >
          <div className="theme-toggle-thumb" />
        </button>
      </div>

      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>{config.icon}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: config.color }}>
            {config.label} Login
          </h2>
          <p>{config.desc}</p>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              background: config.color,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '13px',
              fontSize: 15,
              fontWeight: 500,
              width: '100%',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Signing in...' : `Sign In as ${config.label}`}
          </button>
        </form>

        <div className="switch-link" style={{ marginTop: 16 }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            ← Back to home
          </Link>
        </div>
        <div className="switch-link">
          Don't have an account?{' '}
          <Link to={`/register?role=${config.label}`}>
            Register as {config.label}
          </Link>
        </div>
      </div>
    </div>
  );
}