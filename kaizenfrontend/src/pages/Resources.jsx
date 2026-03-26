import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const categoryColors = {
  Anxiety:    { bg: '#EEEDFE', text: '#3C3489' },
  Depression: { bg: '#E1F5EE', text: '#085041' },
  Loneliness: { bg: '#FAECE7', text: '#712B13' },
  General:    { bg: '#F1EFE8', text: '#444441' },
};

const typeIcons = {
  Article:  '📄',
  Video:    '🎥',
  Guide:    '📘',
  Exercise: '🧘',
  Podcast:  '🎙️',
  Audio:    '🎧',
};

export default function Resources() {
  const navigate = useNavigate();
  const [recommended, setRecommended] = useState([]);
  const [all, setAll] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const [recRes, allRes] = await Promise.all([
        API.get('/resource/recommended'),
        API.get('/resource/all'),
      ]);
      setRecommended(recRes.data.resources || []);
      setPrimaryConcern(recRes.data.primaryConcern || '');
      setAll(allRes.data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Could not load resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = activeCategory === 'All'
    ? all
    : all.filter(r => r.category === activeCategory);

  if (loading) return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <p>Loading resources...</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: '#f0f4f8' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0 }}>Resources</h2>
            <p style={{ color: '#718096', fontSize: 14, marginTop: 4 }}>
              {primaryConcern
                ? `Showing resources matched to your primary concern: ${primaryConcern}`
                : 'Browse all available resources'}
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff', width: 'auto', padding: '8px 16px', fontSize: 13 }}>
            Back
          </button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        {recommended.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#4a5568', marginBottom: 12 }}>
              Recommended for you
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recommended.slice(0, 3).map(r => (
                <ResourceCard key={r.id} resource={r} highlighted />
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#4a5568', marginBottom: 10 }}>Browse by category</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['All', 'Anxiety', 'Depression', 'Loneliness', 'General'].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{
                  width: 'auto', padding: '6px 14px', fontSize: 13, borderRadius: 20,
                  background: activeCategory === cat ? '#6c63ff' : 'white',
                  color: activeCategory === cat ? 'white' : '#4a5568',
                  border: activeCategory === cat ? '1px solid #6c63ff' : '1px solid #e2e8f0',
                }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#718096', fontSize: 14 }}>
            No resources found in this category yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(r => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ResourceCard({ resource: r, highlighted }) {
  const cat = categoryColors[r.category] || categoryColors.General;
  const isPodcast = r.type === 'Podcast';
  const isAudio = r.type === 'Audio';
  
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '18px 20px',
      border: highlighted ? '1px solid #6c63ff' : '1px solid #e2e8f0',
      boxShadow: highlighted ? '0 0 0 3px rgba(108,99,255,0.08)' : 'none',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 16 }}>{typeIcons[r.type] || '📄'}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1a202c' }}>{r.title}</span>
        </div>
        <span style={{
          fontSize: 11, padding: '3px 10px', borderRadius: 4, whiteSpace: 'nowrap',
          background: cat.bg, color: cat.text, fontWeight: 500,
        }}>{r.category}</span>
      </div>
      {r.description && (
        <p style={{ fontSize: 13, color: '#718096', marginBottom: 12, lineHeight: 1.6 }}>{r.description}</p>
      )}
      
      {/* Podcast Player */}
      {isPodcast ? (
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <audio controls style={{ width: '100%', borderRadius: 8 }}>
            <source src={r.url} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 6 }}>
            🎙️ Podcast episode — press play to listen
          </p>
        </div>
      ) : isAudio ? (
        <div style={{ marginTop: 12, marginBottom: 8 }}>
          <audio controls style={{ width: '100%', borderRadius: 8 }}>
            <source src={r.url} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#a0aec0' }}>
            {r.type} · Added by {r.uploadedBy}
          </span>
          <a href={r.url} target="_blank" rel="noreferrer"
            style={{ fontSize: 13, color: '#6c63ff', textDecoration: 'none', fontWeight: 500 }}>
            Open →
          </a>
        </div>
      )}
      
      {/* For audio/podcast, also show the "Added by" info */}
      {(isPodcast || isAudio) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: '#a0aec0' }}>
            Added by {r.uploadedBy}
          </span>
        </div>
      )}
    </div>
  );
}