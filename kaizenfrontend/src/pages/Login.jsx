import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import { GoogleLogin } from '@react-oauth/google';
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

  const storeAndNavigate = (data) => {
    const finalFirstName = data.firstName || data.fullName?.split(' ')[0] || '';
    const finalLastName = data.lastName || data.fullName?.split(' ').slice(1).join(' ') || '';
    const finalFullName = data.fullName || `${finalFirstName} ${finalLastName}`.trim();

    localStorage.setItem('token', data.token);
    localStorage.setItem('role', data.role);
    localStorage.setItem('fullName', finalFullName);
    localStorage.setItem('firstName', finalFirstName);
    localStorage.setItem('lastName', finalLastName);

    navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(form.email)) { setError('Please enter a valid email address.'); return; }
    if (!form.password) { setError('Please enter your password.'); return; }

    setLoading(true);
    try {
      const response = await API.post('/auth/login', form);
      const data = response.data;

      if (data.role.toLowerCase() !== role) {
        setError(`This account is not a ${config.label} account. Please use the correct login page.`);
        return;
      }

      storeAndNavigate(data);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);
    try {
      const response = await API.post('/auth/google-login', {
        credential: credentialResponse.credential,
        role: config.label
      });
      const data = response.data;

      if (data.requiresPassword) {
        localStorage.setItem('googleEmail', data.email);
        localStorage.setItem('googleFirstName', data.firstName);
        localStorage.setItem('googleLastName', data.lastName);
        localStorage.setItem('googleRole', config.label);
        navigate('/complete-profile');
        return;
      }

      if (data.role.toLowerCase() !== role) {
        setError(`This Google account is registered as ${data.role}. Please use the ${data.role} login page.`);
        return;
      }

      storeAndNavigate(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.');
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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <button onClick={toggle} className={`theme-toggle ${dark ? 'dark' : ''}`} type="button">
          <div className="theme-toggle-thumb" />
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 440, background: 'var(--bg-card)', borderRadius: 20, border: '1.5px solid var(--border)', padding: '40px 36px', boxShadow: 'var(--shadow)' }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>{config.icon}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: config.color, margin: 0 }}>
            {config.label} Login
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
            {config.desc}
          </p>
        </div>

        {error && (
          <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
            useOneTap={false}
            text="signin_with"
            shape="rectangular"
            width="368"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>or sign in with email</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="you@gmail.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                style={{ ...inputStyle, paddingRight: 44 }}
                required
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--text-muted)', padding: 0, width: 'auto' }}>
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 600, background: config.color, color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : `Sign In as ${config.label}`}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          <Link to="/" style={{ color: 'var(--text-muted)' }}>← Back to home</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: 13, color: 'var(--text-muted)' }}>
          Don't have an account?{' '}
          <Link to={`/register/${role}`} style={{ color: config.color, fontWeight: 500 }}>
            Register as {config.label}
          </Link>
        </div>
      </div>
    </div>
  );
}