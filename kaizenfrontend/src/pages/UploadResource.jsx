import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function UploadResource() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', type: 'Article', category: 'Anxiety', url: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await API.post('/resource/upload', form);
      setSuccess('Resource uploaded successfully.');
      setForm({ title: '', description: '', type: 'Article', category: 'Anxiety', url: '' });
    } catch (err) {
      setError(err.response?.data || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <h2>Upload a resource</h2>
        <p style={{ marginBottom: 24 }}>Share a helpful resource with clients</p>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input name="title" value={form.title} onChange={handleChange}
              placeholder="e.g. Managing anxiety with breathing techniques" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <input name="description" value={form.description} onChange={handleChange}
              placeholder="Brief summary of what this resource covers" />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select name="type" value={form.type} onChange={handleChange}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, background: 'white' }}>
              {['Article', 'Video', 'Guide', 'Exercise'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleChange}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 15, background: 'white' }}>
              {['Anxiety', 'Depression', 'Loneliness', 'General'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>URL</label>
            <input name="url" value={form.url} onChange={handleChange}
              placeholder="https://..." type="url" required />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload resource'}
          </button>
        </form>

        <div className="switch-link" style={{ marginTop: 16 }}>
          <a href="#" onClick={() => navigate('/dashboard')}>Back to dashboard</a>
        </div>
      </div>
    </div>
  );
}