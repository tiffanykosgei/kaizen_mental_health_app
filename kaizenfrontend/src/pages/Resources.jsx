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
  
  // Rating states
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [resourceRatings, setResourceRatings] = useState({});

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
      
      const recommendedData = recRes.data.resources || [];
      const allData = allRes.data || [];
      
      setRecommended(recommendedData);
      setPrimaryConcern(recRes.data.primaryConcern || '');
      setAll(allData);
      
      // Fetch ratings for all resources after setting them
      const allResources = [...recommendedData, ...allData];
      const uniqueResources = Array.from(new Map(allResources.map(r => [r.id, r])).values());
      
      for (const resource of uniqueResources) {
        try {
          const ratingResponse = await API.get(`/resourcerating/${resource.id}`);
          setResourceRatings(prev => ({
            ...prev,
            [resource.id]: ratingResponse.data
          }));
        } catch (err) {
          console.error(`Failed to fetch rating for resource ${resource.id}:`, err);
        }
      }
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Could not load resources. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchResourceRating = async (resourceId) => {
    try {
      const response = await API.get(`/resourcerating/${resourceId}`);
      setResourceRatings(prev => ({
        ...prev,
        [resourceId]: response.data
      }));
    } catch (err) {
      console.error('Failed to fetch rating:', err);
    }
  };

  const submitRating = async () => {
    if (!selectedResource) return;
    
    setRatingSubmitting(true);
    try {
      await API.post(`/resourcerating/${selectedResource.id}`, {
        rating: ratingValue,
        comment: ratingComment
      });
      // Refresh ratings for this resource
      await fetchResourceRating(selectedResource.id);
      setShowRatingModal(false);
      setRatingValue(5);
      setRatingComment('');
      setError('');
    } catch (err) {
      console.error('Failed to submit rating:', err);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setRatingSubmitting(false);
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
                <ResourceCard 
                  key={r.id} 
                  resource={r} 
                  highlighted 
                  ratingData={resourceRatings[r.id]}
                  onRate={() => {
                    setSelectedResource(r);
                    setShowRatingModal(true);
                  }}
                />
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
              <ResourceCard 
                key={r.id} 
                resource={r} 
                ratingData={resourceRatings[r.id]}
                onRate={() => {
                  setSelectedResource(r);
                  setShowRatingModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && selectedResource && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 450, width: '90%' }}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: '#1a202c' }}>Rate this Resource</h3>
            <p style={{ fontSize: 13, color: '#718096', marginBottom: 20 }}>{selectedResource.title}</p>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#4a5568' }}>Your Rating (1-5 stars)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    style={{
                      background: ratingValue >= star ? '#FFD700' : '#f0f4f8',
                      border: 'none',
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      fontSize: 20,
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      if (ratingValue < star) e.currentTarget.style.background = '#FFE44D';
                    }}
                    onMouseLeave={(e) => {
                      if (ratingValue < star) e.currentTarget.style.background = '#f0f4f8';
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#4a5568' }}>Comments (Optional)</label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share your thoughts about this resource... Was it helpful? Would you recommend it to others?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 13,
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={submitRating} 
                disabled={ratingSubmitting} 
                style={{ 
                  flex: 1,
                  opacity: ratingSubmitting ? 0.6 : 1,
                  cursor: ratingSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {ratingSubmitting ? 'Submitting...' : 'Submit Rating'}
              </button>
              <button 
                onClick={() => { 
                  setShowRatingModal(false); 
                  setRatingValue(5); 
                  setRatingComment('');
                  setError('');
                }}
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  color: '#6c63ff', 
                  border: '1px solid #6c63ff' 
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResourceCard({ resource: r, highlighted, ratingData, onRate }) {
  const cat = categoryColors[r.category] || categoryColors.General;
  const isPodcast = r.type === 'Podcast';
  const isAudio = r.type === 'Audio';
  const averageRating = ratingData?.averageRating || 0;
  const totalRatings = ratingData?.totalRatings || 0;
  
  const getStarDisplay = () => {
    const fullStars = Math.floor(averageRating);
    const hasHalfStar = averageRating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {[...Array(fullStars)].map((_, i) => (
          <span key={`full-${i}`} style={{ color: '#FFD700', fontSize: 12 }}>★</span>
        ))}
        {hasHalfStar && <span style={{ color: '#FFD700', fontSize: 12 }}>½</span>}
        {[...Array(emptyStars)].map((_, i) => (
          <span key={`empty-${i}`} style={{ color: '#e2e8f0', fontSize: 12 }}>★</span>
        ))}
      </span>
    );
  };
  
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
      
      {/* Rating Section */}
      <div style={{ 
        marginTop: 12, 
        paddingTop: 12, 
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {getStarDisplay()}
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1a202c', marginLeft: 4 }}>
              {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings'}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#a0aec0' }}>
            ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
          </span>
        </div>
        <button
          onClick={onRate}
          style={{
            background: 'transparent',
            color: '#6c63ff',
            border: '1px solid #6c63ff',
            padding: '4px 12px',
            fontSize: 12,
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#6c63ff';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#6c63ff';
          }}
        >
          Rate this resource
        </button>
      </div>
      
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