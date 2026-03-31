import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import API from '../api/axios';

const roleConfig = {
  Client:       { icon: '🧠', color: '#e91e8c', desc: 'Create your wellness account' },
  Professional: { icon: '👩‍⚕️', color: '#00c98d', desc: 'Create your professional account' },
  Admin:        { icon: '🛡️', color: '#7c63ff', desc: 'Create an admin account' }
};

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { dark, toggle } = useTheme();

  const defaultRole = searchParams.get('role') || 'Client';
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: defaultRole,
    bio: '',
    specialization: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const config = roleConfig[form.role] || roleConfig.Client;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await API.post('/auth/register', form);
      setSuccess('Account created! Redirecting to login...');
      setTimeout(() => navigate(`/login/${form.role.toLowerCase()}`), 2000);
    } catch (err) {
      setError(err.response?.data || 'Something went wrong.');
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

      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>{config.icon}</div>
          <h2 style={{ color: config.color }}>Create Account</h2>
          <p>{config.desc}</p>
        </div>

        {/* Role badge — shows the role but is not editable */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--bg)',
          border: `1.5px solid ${config.color}`,
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 20
        }}>
          <span style={{ fontSize: 18 }}>{config.icon}</span>
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Registering as</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: config.color, margin: 0 }}>{form.role}</p>
          </div>
          <Link
            to="/"
            style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}
          >
            Change
          </Link>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Your full name"
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>

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
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {form.role === 'Professional' && (
            <>
              <div className="form-group">
                <label>Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Cognitive Behavioural Therapy"
                  value={form.specialization}
                  onChange={e => setForm({ ...form, specialization: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  placeholder="Tell clients about your experience..."
                  value={form.bio}
                  rows={3}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </>
          )}

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
            {loading ? 'Creating account...' : `Create ${form.role} Account`}
          </button>
        </form>

        <div className="switch-link">
          Already have an account?{' '}
          <Link to={`/login/${form.role.toLowerCase()}`}>Sign in</Link>
        </div>
        <div className="switch-link" style={{ marginTop: 8 }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}