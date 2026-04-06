import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';

export default function AdminResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedResource, setExpandedResource] = useState(null);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await API.get('/resourcerating/admin/all-with-ratings');
      setResources(response.data);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
      setError('Could not load resources.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (resource) => {
    if (!window.confirm(`Delete "${resource.title}"? This will also delete all ratings and comments.`)) return;
    try {
      await API.delete(`/resource/${resource.id}`);
      setSuccess(`"${resource.title}" deleted successfully.`);
      fetchResources();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete resource:', err);
      setError('Failed to delete resource.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return { bg: '#E1F5EE', color: '#085041' };
    if (rating >= 3) return { bg: '#FAEEDA', color: '#633806' };
    return { bg: '#FCEBEB', color: '#791F1F' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStarDisplay = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} style={{ color: '#FFD700' }}>★</span>)}
        {halfStar && <span style={{ color: '#FFD700' }}>½</span>}
        {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} style={{ color: '#e2e8f0' }}>★</span>)}
      </span>
    );
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40 }}>Loading resources...</div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: '#1a202c' }}>Resource Management</h2>
      <p style={{ color: '#718096', marginBottom: 24 }}>View all resources, ratings, and client feedback</p>

      {error && (
        <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#E1F5EE', color: '#085041', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>
          {success}
        </div>
      )}

      {/* Resources Table */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7f9fc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Title</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Category</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Rating</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Reviews</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#4a5568' }}>Actions</th>
               </tr>
            </thead>
            <tbody>
              {resources.map(resource => {
                const ratingStyle = getRatingColor(resource.averageRating);
                return (
                  <React.Fragment key={resource.id}>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, color: '#1a202c' }}>{resource.title}</div>
                        <div style={{ fontSize: 11, color: '#718096' }}>By {resource.uploadedBy}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{resource.type}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{resource.category}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div>{getStarDisplay(resource.averageRating)}</div>
                        <div style={{ fontSize: 11, color: ratingStyle.color, fontWeight: 500 }}>
                          {resource.averageRating} ({resource.totalRatings})
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => setExpandedResource(expandedResource === resource.id ? null : resource.id)}
                          style={{
                            background: 'transparent',
                            color: '#6c63ff',
                            border: '1px solid #6c63ff',
                            padding: '4px 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                        >
                          {expandedResource === resource.id ? 'Hide Comments' : `View ${resource.recentComments.length} Comments`}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDelete(resource)}
                          style={{
                            background: '#FCEBEB',
                            color: '#791F1F',
                            border: '1px solid #F09595',
                            padding: '4px 10px',
                            fontSize: 11,
                            borderRadius: 6,
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                    {expandedResource === resource.id && resource.recentComments.length > 0 && (
                      <tr style={{ background: '#f7f9fc' }}>
                        <td colSpan="6" style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: '#1a202c' }}>Recent Comments & Ratings</div>
                          {resource.recentComments.map((comment, idx) => (
                            <div key={idx} style={{ 
                              borderBottom: idx < resource.recentComments.length - 1 ? '1px solid #e2e8f0' : 'none',
                              padding: '10px 0'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                                <div style={{ display: 'flex', gap: 2 }}>
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} style={{ color: i < comment.rating ? '#FFD700' : '#e2e8f0', fontSize: 12 }}>★</span>
                                  ))}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 500, color: '#4a5568' }}>{comment.userName}</span>
                                <span style={{ fontSize: 10, color: '#a0aec0' }}>{formatDate(comment.createdAt)}</span>
                              </div>
                              <p style={{ fontSize: 12, color: '#718096', margin: 0 }}>{comment.comment}</p>
                            </div>
                          ))}
                          {resource.averageRating < 3 && (
                            <div style={{ marginTop: 12, padding: 8, background: '#FCEBEB', borderRadius: 8 }}>
                              <p style={{ fontSize: 12, color: '#791F1F', margin: 0 }}>
                                ⚠️ Low rating alert ({resource.averageRating} stars). Consider reviewing this resource.
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}