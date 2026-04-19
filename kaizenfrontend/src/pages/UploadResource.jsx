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
      setSuccess('Resource uploaded successfully!');
      setForm({ title: '', description: '', type: 'Article', category: 'Anxiety', url: '' });
      fetchMyResources();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Upload failed. Please try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) return;
    try {
      await API.delete(`/resource/${id}`);
      fetchMyResources();
      setSuccess('Resource deleted successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Delete failed.');
      setTimeout(() => setError(''), 3000);
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
    Anxiety: { bg: 'var(--info-bg)', text: 'var(--info-text)' },
    Depression: { bg: 'var(--success-bg)', text: 'var(--success-text)' },
    Loneliness: { bg: 'var(--warning-bg)', text: 'var(--warning-text)' },
    General: { bg: 'var(--bg-hover)', text: 'var(--text-secondary)' },
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'Podcast': return { bg: '#F3E5F5', color: '#4A1D6D' };
      case 'Audio': return { bg: '#E1F5EE', color: '#085041' };
      case 'Video': return { bg: '#E3F2FD', color: '#1565C0' };
      case 'Guide': return { bg: '#FFF3E0', color: '#E65100' };
      default: return { bg: '#F1EFE8', color: '#444441' };
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Resource Management
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
              Upload and manage mental health resources for clients
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'transparent',
              color: 'var(--accent)',
              border: '1.5px solid var(--accent)',
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              borderRadius: 10,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--accent)';
            }}
          >
            ← Back to Dashboard
          </button>
        </div>
        <div style={{ height: 3, width: 60, background: 'var(--gradient-primary)', marginTop: 16, borderRadius: 3 }} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, borderBottom: '2px solid var(--border)' }}>
        <button
          onClick={() => setActiveTab('upload')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: activeTab === 'upload' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'upload' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '10px 10px 0 0',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            bottom: '-2px'
          }}
        >
          <span>📤</span>
          Upload New Resource
        </button>
        <button
          onClick={() => setActiveTab('myresources')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            background: activeTab === 'myresources' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'myresources' ? 'white' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: '10px 10px 0 0',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            bottom: '-2px'
          }}
        >
          <span>📚</span>
          My Resources ({myResources.length})
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div style={{
          background: 'var(--error-bg)',
          color: 'var(--error-text)',
          padding: '14px 18px',
          borderRadius: 12,
          marginBottom: 24,
          fontSize: 13,
          borderLeft: `4px solid var(--error-text)`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span style={{ fontSize: 18 }}>❌</span>
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div style={{
          background: 'var(--success-bg)',
          color: 'var(--success-text)',
          padding: '14px 18px',
          borderRadius: 12,
          marginBottom: 24,
          fontSize: 13,
          borderLeft: `4px solid var(--success-text)`,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* Upload Form Tab */}
      {activeTab === 'upload' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          padding: 32,
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Upload New Resource
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, marginBottom: 0 }}>
              Share helpful content with your clients
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Resource Title *
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g., Managing anxiety with breathing techniques"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Resource Type *
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  {['Article', 'Video', 'Guide', 'Exercise', 'Podcast', 'Audio'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Category *
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  {['Anxiety', 'Depression', 'Loneliness', 'General'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Resource URL *
                </label>
                <input
                  name="url"
                  value={form.url}
                  onChange={handleChange}
                  placeholder="https://..."
                  type="url"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Brief summary of what this resource covers..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = '#5a52d5';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = 'var(--accent)';
                }}
              >
                {loading ? (
                  <>
                    <span>⏳</span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <span>📤</span>
                    Upload Resource
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ title: '', description: '', type: 'Article', category: 'Anxiety', url: '' });
                  setError('');
                }}
                style={{
                  padding: '14px 24px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Clear Form
              </button>
            </div>
          </form>
        </div>
      )}

      {/* My Resources Tab */}
      {activeTab === 'myresources' && (
        <div>
          {myResources.length === 0 ? (
            <div style={{
              background: 'var(--bg-card)',
              borderRadius: 20,
              border: '1px solid var(--border)',
              padding: '60px 40px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>📚</div>
              <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                No Resources Yet
              </h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: 14 }}>
                You haven't uploaded any resources. Start sharing helpful content with your clients.
              </p>
              <button
                onClick={() => setActiveTab('upload')}
                style={{
                  padding: '12px 28px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#5a52d5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
              >
                Upload Your First Resource
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
              {myResources.map(resource => {
                const catColor = categoryColors[resource.category] || categoryColors.General;
                const typeColor = getTypeColor(resource.type);
                const isPodcast = resource.type === 'Podcast';
                const isAudio = resource.type === 'Audio';
                
                return (
                  <div key={resource.id} style={{
                    background: 'var(--bg-card)',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    boxShadow: 'var(--shadow-sm)'
                  }}>
                    <div style={{
                      padding: '20px',
                      borderBottom: '1px solid var(--border)',
                      background: 'var(--bg-secondary)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 28 }}>{typeIcons[resource.type] || '📄'}</span>
                          <div>
                            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                              {resource.title}
                            </h3>
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                              <span style={{
                                fontSize: 11,
                                padding: '3px 10px',
                                borderRadius: 6,
                                background: typeColor.bg,
                                color: typeColor.color,
                                fontWeight: 500
                              }}>
                                {resource.type}
                              </span>
                              <span style={{
                                fontSize: 11,
                                padding: '3px 10px',
                                borderRadius: 6,
                                background: catColor.bg,
                                color: catColor.text,
                                fontWeight: 500
                              }}>
                                {resource.category}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ padding: '20px' }}>
                      {resource.description && (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                          {resource.description}
                        </p>
                      )}
                      
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                        📅 Uploaded {new Date(resource.dateUploaded).toLocaleDateString('en-KE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      
                      {(isPodcast || isAudio) ? (
                        <div style={{ marginBottom: 16 }}>
                          <audio controls style={{ width: '100%', borderRadius: 8 }}>
                            <source src={resource.url} type="audio/mpeg" />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      ) : (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 16px',
                            background: 'var(--bg-secondary)',
                            color: 'var(--accent)',
                            textDecoration: 'none',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 500,
                            marginBottom: 16,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--accent)';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                            e.currentTarget.style.color = 'var(--accent)';
                          }}
                        >
                          🔗 Preview Resource →
                        </a>
                      )}
                      
                      <button
                        onClick={() => handleDelete(resource.id)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          background: 'var(--error-bg)',
                          color: 'var(--error-text)',
                          border: '1px solid var(--error-text)',
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--error-text)';
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--error-bg)';
                          e.currentTarget.style.color = 'var(--error-text)';
                        }}
                      >
                        🗑️ Delete Resource
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}