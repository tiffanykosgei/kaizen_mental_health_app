import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

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
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#f0f4f8' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Journal</h2>
            <p style={{ color: '#718096', fontSize: 14, marginTop: 4 }}>
              Write down your thoughts, feelings, and reflections
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff', width: 'auto', padding: '8px 16px', fontSize: 13 }}>
              Back
            </button>
            {!showForm && (
              <button onClick={() => setShowForm(true)}
                style={{ background: '#6c63ff', color: 'white', border: 'none', width: 'auto', padding: '8px 16px', fontSize: 13 }}>
                + New Entry
              </button>
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {/* Form */}
        {showForm && (
          <div style={{ background: 'white', borderRadius: 12, padding: '24px', marginBottom: 24, border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: 16, marginBottom: 16, fontWeight: 500 }}>
              {editingId ? 'Edit Entry' : 'Write a New Entry'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="What's on your mind?"
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8 }}
                  required
                />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="Write your thoughts here..."
                  rows={6}
                  style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', resize: 'vertical' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="submit" style={{ flex: 1 }}>
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
                <button type="button" onClick={cancelForm}
                  style={{ flex: 1, background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Entries List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>
            Loading your journal entries...
          </div>
        ) : entries.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: '48px 24px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: 48, marginBottom: 16 }}>📔</p>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>No entries yet</h3>
            <p style={{ color: '#718096', marginBottom: 20 }}>Start writing your first journal entry</p>
            <button onClick={() => setShowForm(true)} style={{ width: 'auto', padding: '10px 24px' }}>
              Write your first entry
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {entries.map(entry => (
              <div key={entry.id} style={{
                background: 'white',
                borderRadius: 12,
                padding: '20px',
                border: '1px solid #e2e8f0',
                transition: 'box-shadow 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1a202c' }}>{entry.title}</h3>
                    <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>
                      {formatDate(entry.createdAt)}
                      {entry.updatedAt && ` · Updated ${formatDate(entry.updatedAt)}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleEdit(entry)}
                      style={{
                        background: 'transparent',
                        color: '#6c63ff',
                        border: '1px solid #6c63ff',
                        width: 'auto',
                        padding: '6px 12px',
                        fontSize: 12
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      style={{
                        background: '#FCEBEB',
                        color: '#791F1F',
                        border: '1px solid #F09595',
                        width: 'auto',
                        padding: '6px 12px',
                        fontSize: 12
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: '#4a5568', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
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