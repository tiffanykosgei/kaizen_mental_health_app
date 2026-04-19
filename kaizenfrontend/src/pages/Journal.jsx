import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const PINK = '#e91e8c';
const PURPLE = '#9c27b0';

export default function Journal() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '' });

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const response = await API.get('/journal');
      setEntries(response.data);
    } catch (err) {
      console.error('Error fetching journal entries:', err);
      setError('Could not load journal entries.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.title.trim() || !form.content.trim()) {
      setError('Both title and content are required.');
      return;
    }

    try {
      if (editingId) {
        await API.put(`/journal/${editingId}`, form);
        setSuccess('Entry updated successfully.');
      } else {
        await API.post('/journal', form);
        setSuccess('Entry created successfully.');
      }
      setForm({ title: '', content: '' });
      setShowForm(false);
      setEditingId(null);
      fetchEntries();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Something went wrong.');
    }
  };

  const handleEdit = (entry) => {
    setForm({ title: entry.title, content: entry.content });
    setEditingId(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await API.delete(`/journal/${id}`);
      setSuccess('Entry deleted successfully.');
      fetchEntries();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data || 'Delete failed.');
    }
  };

  const cancelForm = () => {
    setForm({ title: '', content: '' });
    setShowForm(false);
    setEditingId(null);
    setError('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: 'var(--bg-body)' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Journal</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              Write down your thoughts, feelings, and reflections
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ 
                background: 'transparent', 
                color: PINK, 
                border: `1.5px solid ${PINK}`, 
                width: 'auto', 
                padding: '8px 20px', 
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = PINK;
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = PINK;
              }}
            >
              Back to Dashboard
            </button>
            {!showForm && (
              <button 
                onClick={() => setShowForm(true)}
                style={{ 
                  background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, 
                  color: 'white', 
                  border: 'none', 
                  width: 'auto', 
                  padding: '8px 20px', 
                  fontSize: 13,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.15s'
                }}
              >
                + New Entry
              </button>
            )}
          </div>
        </div>

        {error && (
          <div style={{ 
            background: 'rgba(233,30,140,0.1)', 
            color: PINK, 
            padding: '12px 16px', 
            borderRadius: 8, 
            marginBottom: 16, 
            fontSize: 13, 
            border: `1px solid ${PINK}` 
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ 
            background: 'rgba(156,39,176,0.1)', 
            color: PURPLE, 
            padding: '12px 16px', 
            borderRadius: 8, 
            marginBottom: 16, 
            fontSize: 13, 
            border: `1px solid ${PURPLE}` 
          }}>
            {success}
          </div>
        )}

        {showForm && (
          <div style={{ 
            background: 'var(--bg-card)', 
            borderRadius: 14, 
            padding: '24px', 
            marginBottom: 24, 
            border: `1.5px solid ${PINK}`,
            boxShadow: `0 0 0 3px rgba(233,30,140,0.08)`
          }}>
            <h3 style={{ fontSize: 18, marginBottom: 20, fontWeight: 600, color: 'var(--text-primary)' }}>
              {editingId ? 'Edit Entry' : 'Write a New Entry'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 13, 
                  fontWeight: 500, 
                  marginBottom: 8, 
                  color: 'var(--text-secondary)' 
                }}>
                  Title
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="What's on your mind?"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `1.5px solid var(--border)`,
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = PINK}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  required
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: 13, 
                  fontWeight: 500, 
                  marginBottom: 8, 
                  color: 'var(--text-secondary)' 
                }}>
                  Content
                </label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="Write your thoughts here..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: `1.5px solid var(--border)`,
                    borderRadius: 10,
                    fontSize: 14,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = PINK}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button 
                  type="submit" 
                  style={{ 
                    flex: 1,
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 600,
                    background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
                <button 
                  type="button" 
                  onClick={cancelForm}
                  style={{ 
                    flex: 1, 
                    padding: '12px',
                    fontSize: 14,
                    fontWeight: 500,
                    background: 'transparent', 
                    color: PINK, 
                    border: `1.5px solid ${PINK}`,
                    borderRadius: 10,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = PINK;
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = PINK;
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <div style={{
              width: 40, 
              height: 40, 
              borderRadius: '50%',
              border: `3px solid var(--border)`,
              borderTop: `3px solid ${PINK}`,
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Loading your journal entries...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ 
            background: 'var(--bg-card)', 
            borderRadius: 14, 
            padding: '48px 24px', 
            textAlign: 'center', 
            border: `1.5px solid var(--border)`
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📔</div>
            <h3 style={{ fontSize: 18, marginBottom: 8, fontWeight: 600, color: 'var(--text-primary)' }}>No entries yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: 14 }}>
              Start writing your first journal entry to track your thoughts and feelings
            </p>
            <button 
              onClick={() => setShowForm(true)} 
              style={{ 
                width: 'auto', 
                padding: '10px 24px',
                background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Write your first entry
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {entries.map(entry => (
              <div key={entry.id} style={{
                background: 'var(--bg-card)',
                borderRadius: 14,
                padding: '20px',
                border: '1.5px solid var(--border)',
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                      {entry.title}
                    </h3>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                      {formatDate(entry.createdAt)}
                      {entry.updatedAt && entry.updatedAt !== entry.createdAt && ` · Updated ${formatDate(entry.updatedAt)}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEdit(entry)}
                      style={{
                        background: 'transparent',
                        color: PINK,
                        border: `1.5px solid ${PINK}`,
                        width: 'auto',
                        padding: '6px 14px',
                        fontSize: 12,
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = PINK;
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = PINK;
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      style={{
                        background: 'transparent',
                        color: '#e53e3e',
                        border: '1.5px solid #e53e3e',
                        width: 'auto',
                        padding: '6px 14px',
                        fontSize: 12,
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#e53e3e';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#e53e3e';
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p style={{ 
                  fontSize: 14, 
                  color: 'var(--text-secondary)', 
                  lineHeight: 1.6, 
                  margin: 0, 
                  whiteSpace: 'pre-wrap' 
                }}>
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}