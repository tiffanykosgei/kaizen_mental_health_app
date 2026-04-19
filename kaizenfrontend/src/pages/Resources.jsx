import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const categoryColors = {
  Anxiety:    { bg: 'rgba(233,30,140,0.12)', text: '#e91e8c' },
  Depression: { bg: 'rgba(156,39,176,0.12)', text: '#9c27b0' },
  Loneliness: { bg: 'rgba(103,58,183,0.12)', text: '#673ab7' },
  General:    { bg: 'rgba(233,30,140,0.06)', text: '#c2185b' },
};

const typeIcons = {
  Article:  '📄',
  Video:    '🎥',
  Guide:    '📘',
  Exercise: '🧘',
  Podcast:  '🎙️',
  Audio:    '🎧',
};

const PINK = '#e91e8c';
const PURPLE = '#9c27b0';

// StarDisplay component
const StarDisplay = ({ averageRating }) => {
  const fullStars = Math.floor(averageRating);
  const hasHalf = averageRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[...Array(fullStars)].map((_, i) => (
        <span key={`full-${i}`} style={{ color: '#FFD700', fontSize: 12 }}>★</span>
      ))}
      {hasHalf && <span style={{ color: '#FFD700', fontSize: 12 }}>½</span>}
      {[...Array(emptyStars)].map((_, i) => (
        <span key={`empty-${i}`} style={{ color: 'var(--border)', fontSize: 12 }}>★</span>
      ))}
    </span>
  );
};

export default function Resources() {
  const navigate = useNavigate();
  const [recommended, setRecommended] = useState([]);
  const [all, setAll] = useState([]);
  const [myResources, setMyResources] = useState([]);
  const [filteredAllResources, setFilteredAllResources] = useState([]);
  const [filteredMyResources, setFilteredMyResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [primaryConcern, setPrimaryConcern] = useState('');
  const [activeTab, setActiveTab] = useState('browse');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Browse Resources filter states
  const [browseSearchTerm, setBrowseSearchTerm] = useState('');
  const [browseTypeFilter, setBrowseTypeFilter] = useState('all');
  const [browseCategoryFilter, setBrowseCategoryFilter] = useState('all');
  const [browseRatingFilter, setBrowseRatingFilter] = useState('all');
  const [browseDateRange, setBrowseDateRange] = useState({ start: '', end: '' });
  const [browseSortBy, setBrowseSortBy] = useState('date_desc');
  
  // My Resources filter states
  const [mySearchTerm, setMySearchTerm] = useState('');
  const [myTypeFilter, setMyTypeFilter] = useState('all');
  const [myCategoryFilter, setMyCategoryFilter] = useState('all');
  const [myRatingFilter, setMyRatingFilter] = useState('all');
  const [myDateRange, setMyDateRange] = useState({ start: '', end: '' });
  const [mySortBy, setMySortBy] = useState('date_desc');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [resourceRatings, setResourceRatings] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    applyBrowseResourcesFilters();
  }, [all, browseSearchTerm, browseTypeFilter, browseCategoryFilter, browseRatingFilter, browseDateRange, browseSortBy]);

  useEffect(() => {
    applyMyResourcesFilters();
  }, [myResources, mySearchTerm, myTypeFilter, myCategoryFilter, myRatingFilter, myDateRange, mySortBy]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const [recRes, allRes, myRes] = await Promise.all([
        API.get('/resource/recommended'),
        API.get('/resource/all'),
        API.get('/resource/my-uploads').catch(() => ({ data: [] }))
      ]);
      
      const recommendedData = recRes.data.resources || [];
      const allData = allRes.data || [];
      const myResourcesData = myRes.data || [];
      
      setRecommended(recommendedData);
      setPrimaryConcern(recRes.data.primaryConcern || '');
      setAll(allData);
      setMyResources(myResourcesData);
      setFilteredAllResources(allData);
      setFilteredMyResources(myResourcesData);
      
      const allResources = [...recommendedData, ...allData, ...myResourcesData];
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

  const applyBrowseResourcesFilters = () => {
    let filtered = [...all];
    
    if (browseSearchTerm) {
      const term = browseSearchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(term) ||
        (r.description || '').toLowerCase().includes(term) ||
        (r.uploadedBy || '').toLowerCase().includes(term)
      );
    }
    
    if (browseTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === browseTypeFilter);
    }
    
    if (browseCategoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === browseCategoryFilter);
    }
    
    if (browseRatingFilter !== 'all') {
      if (browseRatingFilter === 'high') filtered = filtered.filter(r => (resourceRatings[r.id]?.averageRating || 0) >= 4);
      else if (browseRatingFilter === 'medium') filtered = filtered.filter(r => (resourceRatings[r.id]?.averageRating || 0) >= 3 && (resourceRatings[r.id]?.averageRating || 0) < 4);
      else if (browseRatingFilter === 'low') filtered = filtered.filter(r => (resourceRatings[r.id]?.averageRating || 0) < 3);
      else if (browseRatingFilter === 'unrated') filtered = filtered.filter(r => (resourceRatings[r.id]?.totalRatings || 0) === 0);
    }
    
    if (browseDateRange.start) {
      const startDate = new Date(browseDateRange.start);
      filtered = filtered.filter(r => new Date(r.dateUploaded) >= startDate);
    }
    if (browseDateRange.end) {
      const endDate = new Date(browseDateRange.end);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(r => new Date(r.dateUploaded) <= endDate);
    }
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.dateUploaded);
      const dateB = new Date(b.dateUploaded);
      const ratingA = resourceRatings[a.id]?.averageRating || 0;
      const ratingB = resourceRatings[b.id]?.averageRating || 0;
      
      switch(browseSortBy) {
        case 'date_asc': return dateA - dateB;
        case 'date_desc': return dateB - dateA;
        case 'rating_desc': return ratingB - ratingA;
        case 'rating_asc': return ratingA - ratingB;
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'title_desc': return b.title.localeCompare(a.title);
        default: return dateB - dateA;
      }
    });
    
    setFilteredAllResources(filtered);
  };

  const applyMyResourcesFilters = () => {
    let filtered = [...myResources];
    
    if (mySearchTerm) {
      const term = mySearchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(term) ||
        (r.description || '').toLowerCase().includes(term)
      );
    }
    
    if (myTypeFilter !== 'all') {
      filtered = filtered.filter(r => r.type === myTypeFilter);
    }
    
    if (myCategoryFilter !== 'all') {
      filtered = filtered.filter(r => r.category === myCategoryFilter);
    }
    
    if (myRatingFilter !== 'all') {
      if (myRatingFilter === 'high') filtered = filtered.filter(r => (resourceRatings[r.id]?.averageRating || 0) >= 4);
      else if (myRatingFilter === 'medium') filtered = filtered.filter(r => (resourceRatings[r.id]?.averageRating || 0) >= 3 && (resourceRatings[r.id]?.averageRating || 0) < 4);
      else if (myRatingFilter === 'low') filtered = filtered.filter(r => (resourceRatings[r.id]?.averageRating || 0) < 3);
      else if (myRatingFilter === 'unrated') filtered = filtered.filter(r => (resourceRatings[r.id]?.totalRatings || 0) === 0);
    }
    
    if (myDateRange.start) {
      const startDate = new Date(myDateRange.start);
      filtered = filtered.filter(r => new Date(r.dateUploaded) >= startDate);
    }
    if (myDateRange.end) {
      const endDate = new Date(myDateRange.end);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(r => new Date(r.dateUploaded) <= endDate);
    }
    
    filtered.sort((a, b) => {
      const dateA = new Date(a.dateUploaded);
      const dateB = new Date(b.dateUploaded);
      const ratingA = resourceRatings[a.id]?.averageRating || 0;
      const ratingB = resourceRatings[b.id]?.averageRating || 0;
      
      switch(mySortBy) {
        case 'date_asc': return dateA - dateB;
        case 'date_desc': return dateB - dateA;
        case 'rating_desc': return ratingB - ratingA;
        case 'rating_asc': return ratingA - ratingB;
        case 'title_asc': return a.title.localeCompare(b.title);
        case 'title_desc': return b.title.localeCompare(a.title);
        default: return dateB - dateA;
      }
    });
    
    setFilteredMyResources(filtered);
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
    setError('');
    try {
      await API.post(`/resourcerating/${selectedResource.id}`, {
        rating: ratingValue,
        comment: ratingComment
      });
      await fetchResourceRating(selectedResource.id);
      setSuccessMsg('Rating submitted successfully! Thank you for your feedback!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowRatingModal(false);
      setRatingValue(5);
      setHoveredStar(0);
      setRatingComment('');
    } catch (err) {
      console.error('Failed to submit rating:', err);
      setError('Failed to submit rating. Please try again.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  const handleDeleteResource = async (resource) => {
    try {
      await API.delete(`/resource/${resource.id}`);
      setSuccessMsg(`"${resource.title}" deleted successfully.`);
      fetchResources();
      setDeleteConfirm(null);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to delete resource:', err);
      setError('Failed to delete resource. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const exportToExcel = (data, filename) => {
    const exportData = data.map(r => ({
      'Title': r.title,
      'Type': r.type,
      'Category': r.category,
      'Rating': resourceRatings[r.id]?.averageRating?.toFixed(1) || 'Not rated',
      'Total Ratings': resourceRatings[r.id]?.totalRatings || 0,
      'Upload Date': new Date(r.dateUploaded).toLocaleDateString(),
      'Uploaded By': r.uploadedBy || 'N/A',
      'URL': r.url
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, filename);
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = (data, title) => {
    try {
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(233, 30, 140);
      doc.text(title, 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Resources: ${data.length}`, 14, 37);
      
      const tableData = data.map(r => [
        r.title.substring(0, 40),
        r.type,
        r.category,
        resourceRatings[r.id]?.averageRating?.toFixed(1) || '—',
        (resourceRatings[r.id]?.totalRatings || 0).toString(),
        new Date(r.dateUploaded).toLocaleDateString(),
        r.uploadedBy || 'N/A'
      ]);
      
      doc.autoTable({
        startY: 45,
        head: [['Title', 'Type', 'Category', 'Rating', 'Reviews', 'Upload Date', 'Uploaded By']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`${title.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
      alert('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Error: ' + err.message);
    }
  };

  const getBrowseStats = () => {
    const total = filteredAllResources.length;
    const avgRating = filteredAllResources.reduce((sum, r) => sum + (resourceRatings[r.id]?.averageRating || 0), 0) / (total || 1);
    const highRated = filteredAllResources.filter(r => (resourceRatings[r.id]?.averageRating || 0) >= 4).length;
    return { total, avgRating: avgRating.toFixed(1), highRated };
  };

  const getMyStats = () => {
    const total = filteredMyResources.length;
    const avgRating = filteredMyResources.reduce((sum, r) => sum + (resourceRatings[r.id]?.averageRating || 0), 0) / (total || 1);
    const highRated = filteredMyResources.filter(r => (resourceRatings[r.id]?.averageRating || 0) >= 4).length;
    return { total, avgRating: avgRating.toFixed(1), highRated };
  };

  const browseStats = getBrowseStats();
  const myStats = getMyStats();

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-body)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: `3px solid var(--border)`,
          borderTop: `3px solid ${PINK}`,
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px'
        }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading resources...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', padding: '40px 20px', background: 'var(--bg-body)' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Resources
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
              {primaryConcern && activeTab === 'browse'
                ? `Showing resources matched to your primary concern: ${primaryConcern}`
                : 'Browse and manage mental health resources'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={() => navigate('/upload-resource')}
              style={{ 
                background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, 
                color: 'white', 
                border: 'none', 
                padding: '8px 20px', 
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              + Upload New Resource
            </button>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ 
                background: 'transparent', 
                color: PINK, 
                border: `1.5px solid ${PINK}`, 
                padding: '8px 20px', 
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 500
              }}
              onMouseEnter={e => { e.currentTarget.style.background = PINK; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PINK; }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setActiveTab('browse')}
            style={{
              background: 'transparent',
              color: activeTab === 'browse' ? PINK : 'var(--text-muted)',
              border: 'none',
              borderBottom: activeTab === 'browse' ? `2px solid ${PINK}` : '2px solid transparent',
              padding: '10px 0',
              marginRight: 24,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === 'browse' ? 600 : 400
            }}
          >
            Browse Resources ({all.length})
          </button>
          <button
            onClick={() => setActiveTab('myresources')}
            style={{
              background: 'transparent',
              color: activeTab === 'myresources' ? PINK : 'var(--text-muted)',
              border: 'none',
              borderBottom: activeTab === 'myresources' ? `2px solid ${PINK}` : '2px solid transparent',
              padding: '10px 0',
              marginRight: 24,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === 'myresources' ? 600 : 400
            }}
          >
            My Resources ({myResources.length})
          </button>
        </div>

        {error && !showRatingModal && (
          <div style={{ background: 'rgba(233,30,140,0.1)', color: PINK, padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, border: `1px solid ${PINK}` }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(156,39,176,0.1)', color: PURPLE, padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13, border: `1px solid ${PURPLE}` }}>
            {successMsg}
          </div>
        )}

        {/* BROWSE RESOURCES TAB - TABLE LAYOUT */}
        {activeTab === 'browse' && (
          <>
            {/* Recommended Section (Cards) */}
            {recommended.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 3, height: 18, background: PINK, borderRadius: 2 }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    ⭐ Recommended for you
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recommended.slice(0, 3).map(r => (
                    <div key={r.id} style={{
                      background: 'var(--bg-card)',
                      borderRadius: 14,
                      padding: '20px',
                      border: `1.5px solid ${PINK}`,
                      boxShadow: `0 0 0 3px rgba(233,30,140,0.08)`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1 }}>
                          <span style={{ fontSize: 18 }}>{typeIcons[r.type] || '📄'}</span>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</span>
                        </div>
                        <span style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, background: categoryColors[r.category]?.bg || categoryColors.General.bg, color: categoryColors[r.category]?.text || categoryColors.General.text }}>
                          {r.category}
                        </span>
                      </div>
                      {r.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>{r.description.substring(0, 100)}...</p>}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <StarDisplay averageRating={resourceRatings[r.id]?.averageRating || 0} />
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>({resourceRatings[r.id]?.totalRatings || 0} reviews)</span>
                        </div>
                        <button onClick={() => { setSelectedResource(r); setRatingValue(5); setHoveredStar(0); setRatingComment(''); setShowRatingModal(true); }} style={{ padding: '6px 16px', borderRadius: 20, border: `1.5px solid ${PINK}`, background: 'transparent', color: PINK, cursor: 'pointer' }}>Rate ★</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Resources</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: PINK, margin: 0 }}>{browseStats.total}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Average Rating</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#ff9800', margin: 0 }}>★ {browseStats.avgRating}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>High Rated (4+ ⭐)</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#4caf50', margin: 0 }}>{browseStats.highRated}</p>
              </div>
            </div>

            {/* Filters Panel for Browse */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>🔍 Filters & Search</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Search</label>
                  <input type="text" placeholder="Title, description, or uploader..." value={browseSearchTerm} onChange={e => setBrowseSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
                  <select value={browseTypeFilter} onChange={e => setBrowseTypeFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    <option value="all">All Types</option>
                    <option value="Article">Article</option>
                    <option value="Video">Video</option>
                    <option value="Guide">Guide</option>
                    <option value="Exercise">Exercise</option>
                    <option value="Podcast">Podcast</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Category</label>
                  <select value={browseCategoryFilter} onChange={e => setBrowseCategoryFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    <option value="all">All Categories</option>
                    <option value="Anxiety">Anxiety</option>
                    <option value="Depression">Depression</option>
                    <option value="Loneliness">Loneliness</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Rating</label>
                  <select value={browseRatingFilter} onChange={e => setBrowseRatingFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    <option value="all">All Ratings</option>
                    <option value="high">High (4-5 ⭐)</option>
                    <option value="medium">Medium (3-4 ⭐)</option>
                    <option value="low">Low (1-3 ⭐)</option>
                    <option value="unrated">Unrated</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start Date</label>
                  <input type="date" value={browseDateRange.start} onChange={e => setBrowseDateRange({ ...browseDateRange, start: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>End Date</label>
                  <input type="date" value={browseDateRange.end} onChange={e => setBrowseDateRange({ ...browseDateRange, end: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Sort By</label>
                  <select value={browseSortBy} onChange={e => setBrowseSortBy(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    <option value="date_desc">Date (Newest First)</option>
                    <option value="date_asc">Date (Oldest First)</option>
                    <option value="rating_desc">Rating (Highest First)</option>
                    <option value="rating_asc">Rating (Lowest First)</option>
                    <option value="title_asc">Title (A-Z)</option>
                    <option value="title_desc">Title (Z-A)</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                <button onClick={() => { setBrowseSearchTerm(''); setBrowseTypeFilter('all'); setBrowseCategoryFilter('all'); setBrowseRatingFilter('all'); setBrowseDateRange({ start: '', end: '' }); setBrowseSortBy('date_desc'); }} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                  Clear Filters
                </button>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
                    📥 Export Report
                  </button>
                  {showExportMenu && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10 }}>
                      <button onClick={() => exportToExcel(filteredAllResources, 'Browse_Resources')} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📊 Excel</button>
                      <button onClick={() => exportToPDF(filteredAllResources, 'Browse Resources Report')} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📄 PDF</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results count */}
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {filteredAllResources.length} of {all.length} resources
            </div>

            {/* Browse Resources Table */}
            {filteredAllResources.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '60px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <p style={{ color: 'var(--text-muted)' }}>No resources found matching your criteria.</p>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Title</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Type</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Category</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Rating</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Reviews</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Upload Date</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Uploaded By</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAllResources.map(resource => {
                        const catColor = categoryColors[resource.category] || categoryColors.General;
                        const avgRating = resourceRatings[resource.id]?.averageRating || 0;
                        const totalRatings = resourceRatings[resource.id]?.totalRatings || 0;
                        
                        return (
                          <tr key={resource.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{resource.title}</div>
                              {resource.description && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{resource.description.substring(0, 60)}...</div>
                              )}
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 20 }}>{typeIcons[resource.type] || '📄'}</span>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{resource.type}</div>
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: catColor.bg, color: catColor.text }}>
                                {resource.category}
                              </span>
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <StarDisplay averageRating={avgRating} />
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                              </div>
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>
                              {totalRatings}
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                              {new Date(resource.dateUploaded).toLocaleDateString()}
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                              {resource.uploadedBy || 'N/A'}
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', color: PINK, border: `1px solid ${PINK}`, textDecoration: 'none', fontSize: 11, cursor: 'pointer' }}>
                                  View
                                </a>
                                <button onClick={() => { setSelectedResource(resource); setRatingValue(5); setHoveredStar(0); setRatingComment(''); setShowRatingModal(true); }} style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', color: PURPLE, border: `1px solid ${PURPLE}`, cursor: 'pointer', fontSize: 11 }}>
                                  Rate
                                </button>
                              </div>
                             </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* MY RESOURCES TAB - TABLE LAYOUT */}
        {activeTab === 'myresources' && (
          <>
            {/* Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Resources</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: PINK, margin: 0 }}>{myStats.total}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Average Rating</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#ff9800', margin: 0 }}>★ {myStats.avgRating}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>High Rated (4+ ⭐)</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#4caf50', margin: 0 }}>{myStats.highRated}</p>
              </div>
            </div>

            {/* Filters Panel for My Resources */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>🔍 Filters & Search</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Search</label>
                  <input type="text" placeholder="Title or description..." value={mySearchTerm} onChange={e => setMySearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
                  <select value={myTypeFilter} onChange={e => setMyTypeFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    <option value="all">All Types</option>
                    <option value="Article">Article</option>
                    <option value="Video">Video</option>
                    <option value="Guide">Guide</option>
                    <option value="Exercise">Exercise</option>
                    <option value="Podcast">Podcast</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Category</label>
                  <select value={myCategoryFilter} onChange={e => setMyCategoryFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    <option value="all">All Categories</option>
                    <option value="Anxiety">Anxiety</option>
                    <option value="Depression">Depression</option>
                    <option value="Loneliness">Loneliness</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Rating</label>
                  <select value={myRatingFilter} onChange={e => setMyRatingFilter(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    <option value="all">All Ratings</option>
                    <option value="high">High (4-5 ⭐)</option>
                    <option value="medium">Medium (3-4 ⭐)</option>
                    <option value="low">Low (1-3 ⭐)</option>
                    <option value="unrated">Unrated</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start Date</label>
                  <input type="date" value={myDateRange.start} onChange={e => setMyDateRange({ ...myDateRange, start: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>End Date</label>
                  <input type="date" value={myDateRange.end} onChange={e => setMyDateRange({ ...myDateRange, end: e.target.value })} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Sort By</label>
                  <select value={mySortBy} onChange={e => setMySortBy(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    <option value="date_desc">Date (Newest First)</option>
                    <option value="date_asc">Date (Oldest First)</option>
                    <option value="rating_desc">Rating (Highest First)</option>
                    <option value="rating_asc">Rating (Lowest First)</option>
                    <option value="title_asc">Title (A-Z)</option>
                    <option value="title_desc">Title (Z-A)</option>
                  </select>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
                <button onClick={() => { setMySearchTerm(''); setMyTypeFilter('all'); setMyCategoryFilter('all'); setMyRatingFilter('all'); setMyDateRange({ start: '', end: '' }); setMySortBy('date_desc'); }} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>
                  Clear Filters
                </button>
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
                    📥 Export Report
                  </button>
                  {showExportMenu && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10 }}>
                      <button onClick={() => exportToExcel(filteredMyResources, 'My_Resources')} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📊 Excel</button>
                      <button onClick={() => exportToPDF(filteredMyResources, 'My Resources Report')} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📄 PDF</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Results count */}
            <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {filteredMyResources.length} of {myResources.length} resources
            </div>

            {/* My Resources Table */}
            {filteredMyResources.length === 0 ? (
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: '60px 20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <p style={{ color: 'var(--text-muted)' }}>No resources found matching your criteria.</p>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border)' }}>
                        <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Title</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Type</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Category</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Rating</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Reviews</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Upload Date</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMyResources.map(resource => {
                        const catColor = categoryColors[resource.category] || categoryColors.General;
                        const avgRating = resourceRatings[resource.id]?.averageRating || 0;
                        const totalRatings = resourceRatings[resource.id]?.totalRatings || 0;
                        
                        return (
                          <tr key={resource.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{resource.title}</div>
                              {resource.description && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{resource.description.substring(0, 60)}...</div>
                              )}
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ fontSize: 20 }}>{typeIcons[resource.type] || '📄'}</span>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{resource.type}</div>
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: catColor.bg, color: catColor.text }}>
                                {resource.category}
                              </span>
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <StarDisplay averageRating={avgRating} />
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginTop: 4 }}>
                                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
                              </div>
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-primary)' }}>
                              {totalRatings}
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                              {new Date(resource.dateUploaded).toLocaleDateString()}
                             </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                                <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', color: PINK, border: `1px solid ${PINK}`, textDecoration: 'none', fontSize: 11, cursor: 'pointer' }}>
                                  View
                                </a>
                                <button onClick={() => setDeleteConfirm(resource)} style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', color: '#e53e3e', border: '1px solid #e53e3e', cursor: 'pointer', fontSize: 11 }}>
                                  Delete
                                </button>
                              </div>
                             </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 28, maxWidth: 400, width: '90%' }}>
            <h3 style={{ fontSize: 18, marginBottom: 8, color: 'var(--error-text)' }}>Delete Resource</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Are you sure you want to delete "{deleteConfirm.title}"? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => handleDeleteResource(deleteConfirm)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#e53e3e', color: 'white', cursor: 'pointer' }}>Yes, Delete</button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && selectedResource && (
        <div
          onClick={() => {
            setShowRatingModal(false);
            setRatingValue(5);
            setHoveredStar(0);
            setRatingComment('');
            setError('');
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              borderRadius: 20,
              padding: '32px 28px',
              width: '100%',
              maxWidth: 460,
              border: `1px solid ${PINK}`,
              boxShadow: `0 20px 60px rgba(233,30,140,0.2)`
            }}
          >
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: 20, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Rate this Resource
                </h3>
                <button
                  onClick={() => {
                    setShowRatingModal(false);
                    setRatingValue(5);
                    setHoveredStar(0);
                    setRatingComment('');
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 24,
                    color: 'var(--text-secondary)',
                    padding: '0 0 0 12px',
                    lineHeight: 1,
                    width: 'auto'
                  }}
                >
                  ×
                </button>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
                {selectedResource.title}
              </p>
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
                How would you rate this resource?
              </label>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map(star => {
                  const filled = star <= (hoveredStar || ratingValue);
                  return (
                    <button
                      key={star}
                      onClick={() => setRatingValue(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 42,
                        padding: '4px',
                        color: filled ? '#FFD700' : 'var(--border)',
                        transform: filled ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.15s',
                        width: 'auto'
                      }}
                    >
                      ★
                    </button>
                  );
                })}
              </div>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                {ratingValue === 1 && 'Poor — not helpful'}
                {ratingValue === 2 && 'Fair — slightly helpful'}
                {ratingValue === 3 && 'Good — somewhat helpful'}
                {ratingValue === 4 && 'Very good — quite helpful'}
                {ratingValue === 5 && 'Excellent — highly recommended!'}
              </p>
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                Comments <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share your thoughts about this resource..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: `1.5px solid var(--border)`,
                  borderRadius: 10,
                  fontSize: 13,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
                onFocus={e => e.target.style.borderColor = PINK}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>
            
            {error && (
              <div style={{ background: 'rgba(233,30,140,0.1)', color: PINK, padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, border: `1px solid ${PINK}` }}>
                {error}
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={submitRating} 
                disabled={ratingSubmitting} 
                style={{ 
                  flex: 2,
                  padding: '12px',
                  fontSize: 14,
                  fontWeight: 600,
                  background: ratingSubmitting ? 'var(--border)' : `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: ratingSubmitting ? 'not-allowed' : 'pointer',
                  opacity: ratingSubmitting ? 0.6 : 1
                }}
              >
                {ratingSubmitting ? 'Submitting...' : `Submit ${ratingValue} Star${ratingValue > 1 ? 's' : ''}`}
              </button>
              <button 
                onClick={() => { 
                  setShowRatingModal(false); 
                  setRatingValue(5); 
                  setHoveredStar(0);
                  setRatingComment('');
                  setError('');
                }}
                style={{ 
                  flex: 1, 
                  padding: '12px',
                  fontSize: 14,
                  background: 'transparent', 
                  color: PINK, 
                  border: `1.5px solid ${PINK}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontWeight: 500
                }}
                onMouseEnter={e => { e.currentTarget.style.background = PINK; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PINK; }}
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