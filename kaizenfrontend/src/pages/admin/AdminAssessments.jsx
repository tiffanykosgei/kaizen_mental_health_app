import { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [levelFilter, setLevelFilter] = useState('all');
  const [concernFilter, setConcernFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [stats, setStats] = useState({ total: 0, uniqueUsers: 0, averageAnxiety: 0, averageDepression: 0, averageLoneliness: 0, averageOverall: 0, levelDistribution: { Good: 0, Mild: 0, Moderate: 0, Severe: 0 }, primaryConcerns: { Anxiety: 0, Depression: 0, Loneliness: 0 } });

  useEffect(() => { fetchAssessments(); }, []);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const response = await API.get('/Admin/assessments');
      const allAssessments = response.data;
      setAssessments(allAssessments);
      const total = allAssessments.length;
      const uniqueUsers = new Set(allAssessments.map(a => a.userId)).size;
      let sumAnxiety = 0, sumDepression = 0, sumLoneliness = 0, sumOverall = 0;
      let levelCounts = { Good: 0, Mild: 0, Moderate: 0, Severe: 0 };
      let concernCounts = { Anxiety: 0, Depression: 0, Loneliness: 0 };
      allAssessments.forEach(a => {
        sumAnxiety += a.anxietyScore;
        sumDepression += a.depressionScore;
        sumLoneliness += a.lonelinessScore;
        sumOverall += a.overallScore;
        if (a.overallLevel) levelCounts[a.overallLevel]++;
        if (a.primaryConcern) concernCounts[a.primaryConcern]++;
      });
      setStats({ total, uniqueUsers, averageAnxiety: total > 0 ? (sumAnxiety / total).toFixed(2) : 0, averageDepression: total > 0 ? (sumDepression / total).toFixed(2) : 0, averageLoneliness: total > 0 ? (sumLoneliness / total).toFixed(2) : 0, averageOverall: total > 0 ? (sumOverall / total).toFixed(2) : 0, levelDistribution: levelCounts, primaryConcerns: concernCounts });
    } catch (err) {
      console.error('Failed to fetch assessments:', err);
      setError('Could not load assessments.');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAssessments = () => {
    let filtered = [...assessments];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a => (a.user?.fullName || `User ${a.userId}`).toLowerCase().includes(term));
    }
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      filtered = filtered.filter(a => new Date(a.dateCompleted) >= startDate);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      filtered = filtered.filter(a => new Date(a.dateCompleted) <= endDate);
    }
    if (levelFilter !== 'all') filtered = filtered.filter(a => a.overallLevel === levelFilter);
    if (concernFilter !== 'all') filtered = filtered.filter(a => a.primaryConcern === concernFilter);
    return filtered;
  };

  const exportToExcel = () => {
    const filtered = getFilteredAssessments();
    const exportData = filtered.map(a => ({ 'Assessment ID': a.id, 'Date': new Date(a.dateCompleted).toLocaleDateString(), 'User': a.user?.fullName || `User ${a.userId}`, 'Anxiety Score': a.anxietyScore, 'Depression Score': a.depressionScore, 'Loneliness Score': a.lonelinessScore, 'Overall Score': a.overallScore, 'Overall Level': a.overallLevel, 'Primary Concern': a.primaryConcern }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Assessments');
    XLSX.writeFile(wb, `assessments_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportMenu(false);
  };

  const exportToPDF = () => {
    try {
      const filtered = getFilteredAssessments();
      const doc = new jsPDF('landscape');
      
      doc.setFontSize(18);
      doc.setTextColor(233, 30, 140);
      doc.text('Assessments Report', 14, 20);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total Assessments: ${filtered.length}`, 14, 37);
      
      let startY = 45;
      if (levelFilter !== 'all') {
        doc.text(`Level Filter: ${levelFilter}`, 14, 44);
        startY = 52;
      }
      if (concernFilter !== 'all') {
        doc.text(`Concern Filter: ${concernFilter}`, 14, startY === 45 ? 44 : 59);
        startY = startY === 45 ? 52 : 67;
      }
      
      const tableData = filtered.slice(0, 100).map(a => [
        a.id.toString(),
        new Date(a.dateCompleted).toLocaleDateString(),
        a.user?.fullName || `User ${a.userId}`,
        a.anxietyScore.toString(),
        a.depressionScore.toString(),
        a.lonelinessScore.toString(),
        a.overallScore.toString(),
        a.overallLevel,
        a.primaryConcern
      ]);
      
      doc.autoTable({
        startY: startY,
        head: [['ID', 'Date', 'User', 'Anx', 'Dep', 'Lon', 'Overall', 'Level', 'Concern']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [233, 30, 140], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      doc.save(`assessments_report_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowExportMenu(false);
      alert('PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF. Error: ' + err.message);
    }
  };

  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
  
  const getLevelColor = (level) => {
    switch(level) {
      case 'Good': return { bg: 'var(--success-bg)', color: 'var(--success-text)' };
      case 'Mild': return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
      case 'Moderate': return { bg: 'var(--warning-bg)', color: 'var(--warning-text)' };
      case 'Severe': return { bg: 'var(--error-bg)', color: 'var(--error-text)' };
      default: return { bg: 'var(--bg-hover)', color: 'var(--text-muted)' };
    }
  };

  const filteredAssessments = getFilteredAssessments();

  if (loading) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading assessment statistics...</div>;

  if (error) {
    return (
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Assessment Statistics</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>System-wide mental health assessment data</p>
        <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '20px', borderRadius: 12, textAlign: 'center' }}>{error}<br /><button onClick={fetchAssessments} style={{ marginTop: 12, background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Retry</button></div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Assessment Statistics</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>System-wide mental health assessment data</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Total Assessments" value={stats.total} color="purple" icon="📊" />
        <StatsCard title="Unique Users" value={stats.uniqueUsers} color="green" icon="👥" />
        <StatsCard title="Avg Overall Score" value={stats.averageOverall} color="orange" icon="🎯" />
        <StatsCard title="Avg Anxiety" value={stats.averageAnxiety} color="red" icon="😰" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Avg Depression" value={stats.averageDepression} color="blue" icon="😔" />
        <StatsCard title="Avg Loneliness" value={stats.averageLoneliness} color="teal" icon="🫂" />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}><input type="text" placeholder="🔍 Search by user name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} /></div>
        <div><input type="date" placeholder="Start Date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} /></div>
        <div><input type="date" placeholder="End Date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} /></div>
        <div><select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}><option value="all">All Levels</option><option value="Good">Good</option><option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option></select></div>
        <div><select value={concernFilter} onChange={(e) => setConcernFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}><option value="all">All Concerns</option><option value="Anxiety">Anxiety</option><option value="Depression">Depression</option><option value="Loneliness">Loneliness</option></select></div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>📥 Export</button>
          {showExportMenu && (<div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, zIndex: 10 }}><button onClick={exportToExcel} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📊 Excel</button><button onClick={exportToPDF} style={{ display: 'block', width: '100%', padding: '8px 16px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>📄 PDF</button></div>)}
        </div>
        {(searchTerm || dateRange.start || dateRange.end || levelFilter !== 'all' || concernFilter !== 'all') && (<button onClick={() => { setSearchTerm(''); setDateRange({ start: '', end: '' }); setLevelFilter('all'); setConcernFilter('all'); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Clear Filters</button>)}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Wellbeing Level Distribution</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {Object.entries(stats.levelDistribution).map(([level, count]) => {
            const levelStyle = getLevelColor(level);
            const percentage = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;
            return (<div key={level} style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', textAlign: 'center' }}><span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: levelStyle.bg, color: levelStyle.color, marginBottom: 12 }}>{level}</span><p style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{count}</p><p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{percentage}% of assessments</p></div>);
          })}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Recent Assessments {filteredAssessments.length !== assessments.length && `(${filteredAssessments.length} filtered)`}</h3>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}><th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>User</th><th style={{ padding: '12px 16px', textAlign: 'center' }}>Anxiety</th><th style={{ padding: '12px 16px', textAlign: 'center' }}>Depression</th><th style={{ padding: '12px 16px', textAlign: 'center' }}>Loneliness</th><th style={{ padding: '12px 16px', textAlign: 'center' }}>Overall</th><th style={{ padding: '12px 16px', textAlign: 'center' }}>Level</th><th style={{ padding: '12px 16px', textAlign: 'left' }}>Primary Concern</th></tr></thead>
              <tbody>
                {filteredAssessments.slice(0, 50).map(assessment => {
                  const levelStyle = getLevelColor(assessment.overallLevel);
                  return (<tr key={assessment.id} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '12px 16px' }}>{formatDate(assessment.dateCompleted)}</td><td style={{ padding: '12px 16px' }}>{assessment.user?.fullName || `User ${assessment.userId}`}</td><td style={{ padding: '12px 16px', textAlign: 'center' }}>{assessment.anxietyScore}</td><td style={{ padding: '12px 16px', textAlign: 'center' }}>{assessment.depressionScore}</td><td style={{ padding: '12px 16px', textAlign: 'center' }}>{assessment.lonelinessScore}</td><td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{assessment.overallScore}</td><td style={{ padding: '12px 16px', textAlign: 'center' }}><span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: levelStyle.bg, color: levelStyle.color }}>{assessment.overallLevel}</span></td><td style={{ padding: '12px 16px' }}>{assessment.primaryConcern}</td></tr>);
                })}
              </tbody>
            </table>
          </div>
        </div>
        {filteredAssessments.length > 50 && <p style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Showing first 50 of {filteredAssessments.length} assessments</p>}
      </div>
    </div>
  );
}