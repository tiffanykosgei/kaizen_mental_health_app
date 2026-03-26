import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function UploadResource() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', description: '', type: 'Article', category: 'Anxiety', url: ''
  });
  const [myResources, setMyResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('upload');

  useEffect(() => {
    fetchMyResources();
  }, []);

  const fetchMyResources = async () => {
    try {
      const response = await API.get('/resource/my-uploads');
      setMyResources(response.data);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await API.post('/resource/upload', form);
      setSuccess('Resource uploaded successfully.');
      setForm({ title: '', description: '', type: 'Article', category: 'Anxiety', url: '' });
      fetchMyResources(); // Refresh the list
    } catch (err) {
      setError(err.response?.data || 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await API.delete(`/resource/${id}`);
      fetchMyResources(); // Refresh the list
      setSuccess('Resource deleted successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Delete failed.');
    }
  };

  const typeIcons = {
    Article: '📄',
    Video: '🎥',
    Guide: '📘',
    Exercise: '🧘',
    Podcast: '🎙️',
    Audio: '🎧',
  };

  const categoryColors = {
    Anxiety: { bg: '#EEEDFE', text: '#3C3489' },
    Depression: { bg: '#E1F5EE', text: '#085041' },
    Loneliness: { bg: '#FAECE7', text: '#712B13' },
    General: { bg: '#F1EFE8', text: '#444441' },
  };

  return (
    <div className="auth-container" style={{ alignItems: 'flex-start', padding: '40px 20px' }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('upload')}
            style={{
              background: 'transparent',
              color: activeTab === 'upload' ? '#6c63ff' : '#718096',
              border: 'none',
              borderBottom: activeTab === 'upload' ? '2px solid #6c63ff' : '2px solid transparent',
              borderRadius: 0,
              padding: '8px 0',
              marginRight: 16,
              width: 'auto'
            }}
          >
            Upload New
          </button>
          <button
            onClick={() => setActiveTab('myresources')}
            style={{
              background: 'transparent',
              color: activeTab === 'myresources' ? '#6c63ff' : '#718096',
              border: 'none',
              borderBottom: activeTab === 'myresources' ? '2px solid #6c63ff' : '2px solid transparent',
              borderRadius: 0,
              padding: '8px 0',
              width: 'auto'
            }}
          >
            My Resources ({myResources.length})
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {activeTab === 'upload' ? (
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
                {['Article', 'Video', 'Guide', 'Exercise', 'Podcast', 'Audio'].map(t => (
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
        ) : (
          <div>
            {myResources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#718096' }}>
                <p>You haven't uploaded any resources yet.</p>
                <button onClick={() => setActiveTab('upload')} style={{ marginTop: 16, width: 'auto', padding: '8px 24px' }}>
                  Upload your first resource
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {myResources.map(resource => {
                  const catColor = categoryColors[resource.category] || categoryColors.General;
                  const isPodcast = resource.type === 'Podcast';
                  const isAudio = resource.type === 'Audio';
                  return (
                    <div key={resource.id} style={{
                      background: '#f7f9fc',
                      borderRadius: 10,
                      padding: '14px 16px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ fontSize: 14 }}>{typeIcons[resource.type] || '📄'}</span>
                          <span style={{ fontSize: 14, fontWeight: 500 }}>{resource.title}</span>
                        </div>
                        <span style={{
                          fontSize: 10,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: catColor.bg,
                          color: catColor.text
                        }}>{resource.category}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#718096', marginBottom: 10 }}>
                        {resource.type} · Uploaded {new Date(resource.dateUploaded).toLocaleDateString()}
                      </div>
                      {isPodcast || isAudio ? (
                        <audio controls style={{ width: '100%', marginBottom: 10 }}>
                          <source src={resource.url} type="audio/mpeg" />
                        </audio>
                      ) : (
                        <a href={resource.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#6c63ff', display: 'inline-block', marginBottom: 10 }}>
                          Preview →
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(resource.id)}
                        style={{
                          background: '#FCEBEB',
                          color: '#791F1F',
                          border: '1px solid #F09595',
                          width: 'auto',
                          padding: '6px 12px',
                          fontSize: 12,
                          marginTop: 8
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="switch-link" style={{ marginTop: 20 }}>
          <a href="#" onClick={() => navigate('/dashboard')}>Back to dashboard</a>
        </div>
      </div>
    </div>
  );
}