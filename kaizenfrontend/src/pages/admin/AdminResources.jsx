import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addReportHeader } from '../../utils/pdfReportBranding';

export default function AdminResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedResource, setExpandedResource] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resourceToToggle, setResourceToToggle] = useState(null);
  const [actionType, setActionType] = useState(''); // 'deactivate' or 'reactivate'
  const [actionLoading, setActionLoading] = useState(false);
  // Store ratings and comments separately
  //const [resourceDetails, setResourceDetails] = useState({});

  useEffect(() => { fetchResources(); }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      // 1. Get basic resource data (includes isActive)
      const res = await API.get('/admin/resources');
      const resourcesData = res.data;
      
      // 2. For each resource, fetch ratings & comments
      const detailedResources = await Promise.all(
        resourcesData.map(async (resource) => {
          try {
            const ratingRes = await API.get(`/resourcerating/${resource.id}`);
            return {
              ...resource,
              averageRating: ratingRes.data.averageRating || 0,
              totalRatings: ratingRes.data.totalRatings || 0,
              recentComments: ratingRes.data.recentComments || []
            };
          } catch (err) {
            console.error(`Failed to fetch rating for resource ${resource.id}:`, err);
            return {
              ...resource,
              averageRating: 0,
              totalRatings: 0,
              recentComments: []
            };
          }
        })
      );
      
      setResources(detailedResources);
    } catch (err) {
      console.error(err);
      setError('Could not load resources.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleResource = (resource, action) => {
    setResourceToToggle(resource);
    setActionType(action);
    setShowModal(true);
  };

  const confirmToggleResource = async () => {
    if (!resourceToToggle) return;
    setActionLoading(true);
    try {
      if (actionType === 'deactivate') {
        await API.put(`/admin/resources/${resourceToToggle.id}/deactivate`);
        setSuccess(`"${resourceToToggle.title}" has been deactivated.`);
      } else {
        await API.put(`/admin/resources/${resourceToToggle.id}/reactivate`);
        setSuccess(`"${resourceToToggle.title}" has been reactivated.`);
      }
      await fetchResources(); // Refresh list
      setShowModal(false);
      setResourceToToggle(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const getFilteredResources = () => {
    let filtered = [...resources];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(term) || 
        (r.description || '').toLowerCase().includes(term) || 
        String(r.uploadedBy?.id ?? r.uploadedBy?.Id ?? '').toLowerCase().includes(term) ||
        (r.uploadedBy?.uploaderName || r.uploadedBy?.UploaderName || '').toLowerCase().includes(term) ||
        (r.uploadedBy?.email || r.uploadedBy?.Email || '').toLowerCase().includes(term)
      );
    }
    if (typeFilter !== 'all') filtered = filtered.filter(r => r.type === typeFilter);
    if (categoryFilter !== 'all') filtered = filtered.filter(r => r.category === categoryFilter);
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'high') filtered = filtered.filter(r => r.averageRating >= 4);
      else if (ratingFilter === 'medium') filtered = filtered.filter(r => r.averageRating >= 3 && r.averageRating < 4);
      else if (ratingFilter === 'low') filtered = filtered.filter(r => r.averageRating < 3);
      else if (ratingFilter === 'unrated') filtered = filtered.filter(r => r.totalRatings === 0);
    }
    return filtered;
  };
  const exportToPDF = () => {
    const filtered = getFilteredResources();
    const doc = new jsPDF('landscape');
    const ratingLabel = {
      high: 'High Rated',
      medium: 'Medium Rated',
      low: 'Low Rated',
      unrated: 'Unrated'
    }[ratingFilter] || '';
    const titleParts = [
      typeFilter !== 'all' ? typeFilter : '',
      categoryFilter !== 'all' ? categoryFilter : '',
      ratingLabel,
      'Resource Management Report'
    ].filter(Boolean);
    const reportTitle = titleParts.join(' ');
    const startY = addReportHeader(doc, reportTitle, [
      `Generated: ${new Date().toLocaleString()}`,
      `Total Resources: ${filtered.length}`,
      typeFilter !== 'all' ? `Type Filter: ${typeFilter}` : '',
      categoryFilter !== 'all' ? `Category Filter: ${categoryFilter}` : '',
      ratingFilter !== 'all' ? `Rating Filter: ${ratingLabel}` : ''
    ]);

    const headers = ['Title'];
    if (typeFilter === 'all') headers.push('Type');
    if (categoryFilter === 'all') headers.push('Category');
    headers.push('Rating', 'Reviews', 'Uploader ID', 'Status', 'Date');
    
    const tableData = filtered.map(r => [
      r.title.substring(0, 40),
      ...(typeFilter === 'all' ? [r.type] : []),
      ...(categoryFilter === 'all' ? [r.category] : []),
      r.averageRating.toString(),
      r.totalRatings.toString(),
      String(r.uploadedBy?.id ?? r.uploadedBy?.Id ?? 'N/A'),
      r.isActive ? 'Active' : 'Deactivated',
      new Date(r.dateUploaded).toLocaleDateString()
    ]);
    
    doc.autoTable({
      startY,
      head: [headers],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { bottom: 30 }
    });
    
    // Footer
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('Contact: +254 729 604375 | Email: kosgeitiffany@gmail.com', 14, finalY);
    doc.text('Services: Home | Our Story | Careers', 14, finalY + 5);
    doc.text('Legal: T&Cs | Privacy Policy', 14, finalY + 10);
    doc.text('© 2025 Kaizen Mental Health Platform — A safe space for mental wellness', 14, finalY + 15);
    
    doc.save(`${reportTitle.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowExportMenu(false);
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
    if (rating >= 3) return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
    return { bg: 'var(--error-bg)', color: 'var(--error-text)' };
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
  
  const getStarDisplay = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {[...Array(fullStars)].map((_, i) => <span key={i} style={{ color: '#FFD700' }}>★</span>)}
        {halfStar && <span style={{ color: '#FFD700' }}>½</span>}
        {[...Array(emptyStars)].map((_, i) => <span key={i} style={{ color: 'var(--border)' }}>★</span>)}
      </span>
    );
  };

  const filteredResources = getFilteredResources();

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading resources...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Resource Management</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>View all resources, ratings, and client feedback</p>

      {error && <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '12px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '12px', borderRadius: 8, marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <input type="text" placeholder="🔍 Search by title, description, uploader ID, name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
        </div>
        <div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <option value="all">All Types</option>
            <option value="Article">Article</option>
            <option value="Video">Video</option>
            <option value="Guide">Guide</option>
            <option value="Exercise">Exercise</option>
            <option value="Podcast">Podcast</option>
          </select>
        </div>
        <div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <option value="all">All Categories</option>
            <option value="Anxiety">Anxiety</option>
            <option value="Depression">Depression</option>
            <option value="Loneliness">Loneliness</option>
            <option value="General">General</option>
          </select>
        </div>
        <div>
          <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            <option value="all">All Ratings</option>
            <option value="high">High (4-5 stars)</option>
            <option value="medium">Medium (3-4 stars)</option>
            <option value="low">Low (1-3 stars)</option>
            <option value="unrated">Unrated</option>
          </select>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>📥 Export</button>
          {showExportMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10 }}>
              <button onClick={exportToPDF} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📄 PDF</button>
            </div>
          )}
        </div>
        {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all' || ratingFilter !== 'all') && (
          <button onClick={() => { setSearchTerm(''); setTypeFilter('all'); setCategoryFilter('all'); setRatingFilter('all'); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
            Clear Filters
          </button>
        )}
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Uploader ID</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Rating</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Reviews</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map(resource => {
                const ratingStyle = getRatingColor(resource.averageRating);
                const isActive = resource.isActive !== false;
                const uploaderId = resource.uploadedBy?.id ?? resource.uploadedBy?.Id;
                const uploaderName = resource.uploadedBy?.uploaderName || resource.uploadedBy?.UploaderName || 'N/A';
                return (
                  <React.Fragment key={resource.id}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{resource.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>By {uploaderName}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>#{uploaderId || 'N/A'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{resource.type}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{resource.category}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div>{getStarDisplay(resource.averageRating)}</div>
                        <div style={{ fontSize: 11, color: ratingStyle.color, fontWeight: 500 }}>{resource.averageRating} ({resource.totalRatings})</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button onClick={() => setExpandedResource(expandedResource === resource.id ? null : resource.id)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer' }}>
                          {expandedResource === resource.id ? 'Hide Comments' : `View ${resource.recentComments?.length || 0} Comments`}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 11, background: isActive ? 'var(--success-bg)' : 'var(--error-bg)', color: isActive ? 'var(--success-text)' : 'var(--error-text)' }}>
                          {isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        {isActive ? (
                          <button onClick={() => handleToggleResource(resource, 'deactivate')} style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)', border: '1px solid var(--warning-text)', padding: '5px 12px', fontSize: 11, borderRadius: 6, cursor: 'pointer' }}>
                            Deactivate
                          </button>
                        ) : (
                          <button onClick={() => handleToggleResource(resource, 'reactivate')} style={{ background: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-text)', padding: '5px 12px', fontSize: 11, borderRadius: 6, cursor: 'pointer' }}>
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedResource === resource.id && resource.recentComments?.length > 0 && (
                      <tr style={{ background: 'var(--bg-secondary)' }}>
                        <td colSpan="8" style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: 'var(--text-primary)' }}>Recent Comments & Ratings</div>
                          {resource.recentComments.map((comment, idx) => (
                            <div key={idx} style={{ borderBottom: idx < resource.recentComments.length - 1 ? '1px solid var(--border)' : 'none', padding: '10px 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                                <div style={{ display: 'flex', gap: 2 }}>
                                  {[...Array(5)].map((_, i) => (
                                    <span key={i} style={{ color: i < comment.rating ? '#FFD700' : 'var(--border)', fontSize: 12 }}>★</span>
                                  ))}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{comment.userName}</span>
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(comment.createdAt)}</span>
                              </div>
                              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{comment.comment}</p>
                            </div>
                          ))}
                          {resource.averageRating < 3 && (
                            <div style={{ marginTop: 12, padding: 8, background: 'var(--error-bg)', borderRadius: 8 }}>
                              <p style={{ fontSize: 12, color: 'var(--error-text)', margin: 0 }}>⚠️ Low rating alert ({resource.averageRating} stars). Consider reviewing this resource.</p>
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
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Showing {filteredResources.length} of {resources.length} resources
      </div>

      {/* Confirmation Modal */}
      {showModal && resourceToToggle && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: 18, marginBottom: 8, color: actionType === 'deactivate' ? 'var(--warning-text)' : 'var(--success-text)' }}>
              {actionType === 'deactivate' ? 'Deactivate Resource' : 'Reactivate Resource'}
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              {actionType === 'deactivate' ? (
                <>Are you sure you want to <strong>deactivate</strong> "<strong>{resourceToToggle.title}</strong>"?<br />It will no longer be visible to users, but ratings and data will be preserved.</>
              ) : (
                <>Are you sure you want to <strong>reactivate</strong> "<strong>{resourceToToggle.title}</strong>"?<br />It will become visible to users again.</>
              )}
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={confirmToggleResource} disabled={actionLoading} style={{ flex: 1, background: actionType === 'deactivate' ? 'var(--warning-bg)' : 'var(--success-bg)', color: actionType === 'deactivate' ? 'var(--warning-text)' : 'var(--success-text)', border: 'none', padding: '10px', borderRadius: 8, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}>
                {actionLoading ? 'Processing...' : (actionType === 'deactivate' ? 'Yes, Deactivate' : 'Yes, Reactivate')}
              </button>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '10px', borderRadius: 8, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay { position: fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:1000; padding:20px; }
        .modal-content { background: var(--bg-card); border-radius: 18px; padding: 28px; max-width: 450px; width:100%; border: 1.5px solid #e91e8c; }
      `}</style>
    </div>
  );
}
