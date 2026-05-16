import { useState, useEffect } from 'react';
import API from '../../api/axios';
import StatsCard from './components/StatsCard';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { addReportHeader } from '../../utils/pdfReportBranding';

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [levelFilter, setLevelFilter] = useState('all');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [stats, setStats] = useState({ total: 0, userIdentity: 'Undefined', averageAnxiety: 0, averageDepression: 0, averageLoneliness: 0, averageOverall: 0, levelDistribution: { Good: 0, Mild: 0, Moderate: 0, Severe: 0 }, primaryConcerns: { Anxiety: 0, Depression: 0, Loneliness: 0 } });

  useEffect(() => { fetchAssessments(); }, []);

  const fetchAssessments = async () => {
    setLoading(true);
    try {
      const response = await API.get('/Admin/assessments');
      const allAssessments = response.data;
      setAssessments(allAssessments);
      const total = allAssessments.length;
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
      setStats({ total, userIdentity: 'Undefined', averageAnxiety: total > 0 ? (sumAnxiety / total).toFixed(2) : 0, averageDepression: total > 0 ? (sumDepression / total).toFixed(2) : 0, averageLoneliness: total > 0 ? (sumLoneliness / total).toFixed(2) : 0, averageOverall: total > 0 ? (sumOverall / total).toFixed(2) : 0, levelDistribution: levelCounts, primaryConcerns: concernCounts });
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
      filtered = filtered.filter(a => {
        return (a.overallLevel || '').toLowerCase().includes(term) ||
          (a.primaryConcern || '').toLowerCase().includes(term) ||
          (a.resultSummary || '').toLowerCase().includes(term);
      });
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
    return filtered;
  };
  const exportToPDF = () => {
    try {
      const filtered = getFilteredAssessments();
      const doc = new jsPDF('landscape');
      const reportTitle = levelFilter !== 'all' ? `${levelFilter} Assessment Report` : 'Assessment Report';
      const startY = addReportHeader(doc, reportTitle, [
        `Generated: ${new Date().toLocaleString()}`,
        `Total Assessments: ${filtered.length}`,
        levelFilter !== 'all' ? `Level Filter: ${levelFilter}` : ''
      ]);

      const headers = ['ID', 'Date', 'User', 'Anx', 'Dep', 'Lon', 'Overall'];
      if (levelFilter === 'all') headers.push('Level');
      headers.push('Concern');
      
      const tableData = filtered.slice(0, 100).map(a => [
        a.id.toString(),
        new Date(a.dateCompleted).toLocaleDateString(),
        'User Undefined',
        a.anxietyScore.toString(),
        a.depressionScore.toString(),
        a.lonelinessScore.toString(),
        a.overallScore.toString(),
        ...(levelFilter === 'all' ? [a.overallLevel] : []),
        a.primaryConcern
      ]);
      
      doc.autoTable({
        startY: startY,
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
        <StatsCard title="User Identity" value={stats.userIdentity} color="green" icon="👥" />
        <StatsCard title="Avg Overall Score" value={stats.averageOverall} color="orange" icon="🎯" />
        <StatsCard title="Avg Anxiety" value={stats.averageAnxiety} color="red" icon="😰" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 32 }}>
        <StatsCard title="Avg Depression" value={stats.averageDepression} color="blue" icon="😔" />
        <StatsCard title="Avg Loneliness" value={stats.averageLoneliness} color="teal" icon="🫂" />
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 200 }}><input type="text" placeholder="🔍 Search by level, concern or summary..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Start Date</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>End Date</span>
        </div>
        <div><select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}><option value="all">All Levels</option><option value="Good">Good</option><option value="Mild">Mild</option><option value="Moderate">Moderate</option><option value="Severe">Severe</option></select></div>
        <div style={{ position: 'relative' }}>
          <button onClick={exportToPDF} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>📥 Export</button>
        </div>
        {(searchTerm || dateRange.start || dateRange.end || levelFilter !== 'all') && (<button onClick={() => { setSearchTerm(''); setDateRange({ start: '', end: '' }); setLevelFilter('all'); }} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}>Clear Filters</button>)}
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
              <thead>
                <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Anxiety</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Depression</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Loneliness</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Overall</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Level</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssessments.slice(0, 50).map(assessment => {
                  const levelStyle = getLevelColor(assessment.overallLevel);
                  return (
                    <tr key={assessment.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px' }}>{formatDate(assessment.dateCompleted)}</td>
                      <td style={{ padding: '12px 16px' }}>User Undefined</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{assessment.anxietyScore}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{assessment.depressionScore}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>{assessment.lonelinessScore}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>{assessment.overallScore}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 500, background: levelStyle.bg, color: levelStyle.color }}>{assessment.overallLevel}</span>
                      </td>
                    </tr>
                  );
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
