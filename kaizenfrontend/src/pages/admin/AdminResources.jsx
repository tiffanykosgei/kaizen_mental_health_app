import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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

  useEffect(() => { fetchResources(); }, []);

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

  const getFilteredResources = () => {
    let filtered = [...resources];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(term) || r.description.toLowerCase().includes(term) || r.uploadedBy.toLowerCase().includes(term));
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

  const exportToExcel = () => {
    const filtered = getFilteredResources();
    const exportData = filtered.map(r => ({ 'Title': r.title, 'Type': r.type, 'Category': r.category, 'Uploaded By': r.uploadedBy, 'Average Rating': r.averageRating, 'Total Ratings': r.totalRatings, 'Upload Date': new Date(r.dateUploaded).toLocaleDateString() }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resources');
    XLSX.writeFile(wb, `resources_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    try {
      const filtered = getFilteredResources();
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(233, 30, 140);
      doc.text('Resources Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Resources: ${filtered.length}`, 14, 37);
      
      const tableData = filtered.slice(0, 50).map(r => [
        r.title.substring(0, 40),
        r.type,
        r.category,
        r.averageRating.toString(),
        r.totalRatings.toString(),
        new Date(r.dateUploaded).toLocaleDateString()
      ]);
      
      doc.autoTable({
        startY: 45,
        head: [['Title', 'Type', 'Category', 'Rating', 'Reviews', 'Date']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`resources_report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
      alert('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Error: ' + err.message);
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
    if (rating >= 4) return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
    if (rating >= 3) return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
    return { bg: 'var(--error-bg)', color: 'var(--error-text)' };
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });

  const getStarDisplay = (rating) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return (<span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>{[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} style={{ color: '#FFD700' }}>★</span>)}{halfStar && <span style={{ color: '#FFD700' }}>½</span>}{[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} style={{ color: 'var(--border)' }}>★</span>)}</span>);
  };

  const filteredResources = getFilteredResources();

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading resources...</div>;

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Resource Management</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>View all resources, ratings, and client feedback</p>

      {error && <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ background: 'var(--success-bg)', color: 'var(--success-text)', padding: '10px 14px', borderRadius: 8, marginBottom: 16 }}>{success}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}><input type="text" placeholder="🔍 Search by title, description, or uploader..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} /></div>
        <div><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}><option value="all">All Types</option><option value="Article">Article</option><option value="Video">Video</option><option value="Guide">Guide</option><option value="Exercise">Exercise</option><option value="Podcast">Podcast</option></select></div>
        <div><select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}><option value="all">All Categories</option><option value="Anxiety">Anxiety</option><option value="Depression">Depression</option><option value="Loneliness">Loneliness</option><option value="General">General</option></select></div>
        <div><select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}><option value="all">All Ratings</option><option value="high">High (4-5 stars)</option><option value="medium">Medium (3-4 stars)</option><option value="low">Low (1-3 stars)</option><option value="unrated">Unrated</option></select></div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>📥 Export</button>
          {showExportMenu && (<div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10 }}><button onClick={exportToExcel} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📊 Excel</button><button onClick={exportToPDF} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📄 PDF</button></div>)}
        </div>
        {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all' || ratingFilter !== 'all') && (<button onClick={() => { setSearchTerm(''); setTypeFilter('all'); setCategoryFilter('all'); setRatingFilter('all'); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Clear Filters</button>)}
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}><th style={{ padding: '12px 16px', textAlign: 'left' }}>Title</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>Type</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>Category</th><th style={{ padding: '12px 16px', textAlign: 'center' }}>Rating</th><th style={{ padding: '12px 16px', textAlign: 'center' }}>Reviews</th><th style={{ padding: '12px 16px', textAlign: 'center' }}>Actions</th></tr></thead>
            <tbody>
              {filteredResources.map(resource => {
                const ratingStyle = getRatingColor(resource.averageRating);
                return (
                  <React.Fragment key={resource.id}>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}><div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{resource.title}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>By {resource.uploadedBy}</div></td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{resource.type}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-primary)' }}>{resource.category}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}><div>{getStarDisplay(resource.averageRating)}</div><div style={{ fontSize: 11, color: ratingStyle.color, fontWeight: 500 }}>{resource.averageRating} ({resource.totalRatings})</div></td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}><button onClick={() => setExpandedResource(expandedResource === resource.id ? null : resource.id)} style={{ background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer' }}>{expandedResource === resource.id ? 'Hide Comments' : `View ${resource.recentComments.length} Comments`}</button></td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}><button onClick={() => handleDelete(resource)} style={{ background: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-text)', padding: '4px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer' }}>Delete</button></td>
                    </tr>
                    {expandedResource === resource.id && resource.recentComments.length > 0 && (
                      <tr style={{ background: 'var(--bg-secondary)' }}><td colSpan="6" style={{ padding: '16px 20px' }}><div style={{ fontSize: 13, fontWeight: 500, marginBottom: 12, color: 'var(--text-primary)' }}>Recent Comments & Ratings</div>
                        {resource.recentComments.map((comment, idx) => (<div key={idx} style={{ borderBottom: idx < resource.recentComments.length - 1 ? '1px solid var(--border)' : 'none', padding: '10px 0' }}><div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}><div style={{ display: 'flex', gap: 2 }}>{[...Array(5)].map((_, i) => (<span key={i} style={{ color: i < comment.rating ? '#FFD700' : 'var(--border)', fontSize: 12 }}>★</span>))}</div><span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)' }}>{comment.userName}</span><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{formatDate(comment.createdAt)}</span></div><p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{comment.comment}</p></div>))}
                        {resource.averageRating < 3 && (<div style={{ marginTop: 12, padding: 8, background: 'var(--error-bg)', borderRadius: 8 }}><p style={{ fontSize: 12, color: 'var(--error-text)', margin: 0 }}>⚠️ Low rating alert ({resource.averageRating} stars). Consider reviewing this resource.</p></div>)}
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Showing {filteredResources.length} of {resources.length} resources</div>
    </div>
  );
}