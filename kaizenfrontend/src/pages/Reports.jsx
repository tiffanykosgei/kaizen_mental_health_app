// src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import API from '../api/axios';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Reports() {
  const [reportType, setReportType] = useState('sessions');
  const [rawData, setRawData] = useState({
    sessions: [],
    assessments: [],
    professionals: [],
    users: []
  });
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    searchTerm: '',
    status: 'all',
    professionalId: 'all',
    sortBy: 'date_desc'
  });
  const [professionalsList, setProfessionalsList] = useState([]);
  const [summary, setSummary] = useState(null);

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Apply filters whenever filters change or raw data changes
  useEffect(() => {
    applyFiltersAndSort();
  }, [filters, rawData, reportType]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch all needed data in parallel using your existing endpoints
      const [sessionsRes, assessmentsRes, usersRes] = await Promise.all([
        API.get('/Admin/sessions').catch(() => ({ data: [] })),
        API.get('/Admin/assessments').catch(() => ({ data: [] })),
        API.get('/Admin/users').catch(() => ({ data: [] }))
      ]);
      
      const professionals = usersRes.data.filter(u => u.role === 'Professional');
      
      setRawData({
        sessions: sessionsRes.data || [],
        assessments: assessmentsRes.data || [],
        professionals: professionals,
        users: usersRes.data || []
      });
      
      setProfessionalsList(professionals);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let data = [];
    
    // Get data based on report type
    if (reportType === 'sessions') {
      data = [...rawData.sessions];
    } else if (reportType === 'assessments') {
      data = [...rawData.assessments];
    } else if (reportType === 'payouts') {
      // For payouts, we need to aggregate professional data
      data = rawData.professionals.map(pro => {
        const proSessions = rawData.sessions.filter(s => 
          s.professional?.professionalId === pro.id || 
          s.professionalId === pro.id ||
          s.professional?.id === pro.id
        );
        const paidSessions = proSessions.filter(s => s.paymentStatus === 'Paid');
        const totalEarned = paidSessions.reduce((sum, s) => sum + (s.professionalEarnings || 0), 0);
        const pendingPayout = paidSessions.filter(s => s.payoutStatus !== 'PaidOut').reduce((sum, s) => sum + (s.professionalEarnings || 0), 0);
        const paidOut = paidSessions.filter(s => s.payoutStatus === 'PaidOut').reduce((sum, s) => sum + (s.professionalEarnings || 0), 0);
        
        return {
          professionalId: pro.id,
          professionalName: pro.fullName || `${pro.firstName} ${pro.lastName}`,
          professionalEmail: pro.email,
          paymentMethod: pro.profile?.paymentMethod || 'Not set',
          paymentAccount: pro.profile?.paymentAccount || 'Not set',
          totalEarned,
          pendingPayout,
          paidOut,
          totalSessions: paidSessions.length,
          averageRating: pro.profile?.averageRating || 0,
          currentSplitPercentage: 60 // Default, can be adjusted
        };
      });
    }
    
    // Apply filters
    let filtered = [...data];
    
    // Date range filter
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.sessionDate || item.dateCompleted);
        return itemDate >= start;
      });
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59);
      filtered = filtered.filter(item => {
        const itemDate = new Date(item.sessionDate || item.dateCompleted);
        return itemDate <= end;
      });
    }
    
    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        if (reportType === 'sessions') {
          return (
            (item.client?.clientName || '').toLowerCase().includes(term) ||
            (item.professional?.professionalName || '').toLowerCase().includes(term)
          );
        } else if (reportType === 'assessments') {
          return (item.user?.userName || '').toLowerCase().includes(term);
        } else if (reportType === 'payouts') {
          return (item.professionalName || '').toLowerCase().includes(term);
        }
        return false;
      });
    }
    
    // Status filter (only for sessions)
    if (reportType === 'sessions' && filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }
    
    // Professional filter
    if (filters.professionalId !== 'all' && reportType === 'sessions') {
      filtered = filtered.filter(item => 
        item.professional?.professionalId === parseInt(filters.professionalId) ||
        item.professionalId === parseInt(filters.professionalId)
      );
    }
    
    // Apply sorting
    const sorted = [...filtered];
    switch (filters.sortBy) {
      case 'date_desc':
        sorted.sort((a, b) => new Date(b.sessionDate || b.dateCompleted) - new Date(a.sessionDate || a.dateCompleted));
        break;
      case 'date_asc':
        sorted.sort((a, b) => new Date(a.sessionDate || a.dateCompleted) - new Date(b.sessionDate || b.dateCompleted));
        break;
      case 'amount_desc':
        sorted.sort((a, b) => (b.amount || 0) - (a.amount || 0));
        break;
      case 'amount_asc':
        sorted.sort((a, b) => (a.amount || 0) - (b.amount || 0));
        break;
      default:
        break;
    }
    
    setFilteredData(sorted);
    calculateSummary(sorted);
  };

  const calculateSummary = (data) => {
    if (reportType === 'sessions') {
      const totalSessions = data.length;
      const completedSessions = data.filter(s => s.status === 'Completed').length;
      const pendingSessions = data.filter(s => s.status === 'Pending').length;
      const confirmedSessions = data.filter(s => s.status === 'Confirmed').length;
      const totalRevenue = data.reduce((sum, s) => sum + (s.amount || 0), 0);
      setSummary({ totalSessions, completedSessions, pendingSessions, confirmedSessions, totalRevenue });
    } else if (reportType === 'assessments') {
      const totalAssessments = data.length;
      const avgScore = totalAssessments > 0 
        ? (data.reduce((sum, a) => sum + (a.overallScore || 0), 0) / totalAssessments).toFixed(1)
        : 0;
      const levelDistribution = {
        Good: data.filter(a => a.overallLevel === 'Good').length,
        Mild: data.filter(a => a.overallLevel === 'Mild').length,
        Moderate: data.filter(a => a.overallLevel === 'Moderate').length,
        Severe: data.filter(a => a.overallLevel === 'Severe').length
      };
      setSummary({ totalAssessments, avgScore, levelDistribution });
    } else if (reportType === 'payouts') {
      const totalPending = data.reduce((sum, p) => sum + (p.pendingPayout || 0), 0);
      const totalPaid = data.reduce((sum, p) => sum + (p.paidOut || 0), 0);
      setSummary({ totalPending, totalPaid });
    }
  };

  // Generate PDF Receipt for a session
  const generateSessionReceipt = (session) => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.setTextColor(233, 30, 140);
    doc.text('Kaizen Mental Wellness', 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Session Payment Receipt', 20, 35);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 45);
    doc.text(`Receipt #: SESS-${session.id}-${Date.now()}`, 20, 52);
    
    doc.line(20, 58, 190, 58);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Session Details', 20, 70);
    
    const tableData = [
      ['Session ID', session.id.toString()],
      ['Date', new Date(session.sessionDate).toLocaleString()],
      ['Client', session.client?.clientName || 'N/A'],
      ['Professional', session.professional?.professionalName || 'N/A'],
      ['Status', session.status],
      ['Amount Paid', `KSh ${(session.amount || 0).toLocaleString()}`],
      ['Payment Status', session.paymentStatus],
      ['Transaction ID', session.paymentReference || 'N/A']
    ];
    
    doc.autoTable({
      startY: 78,
      head: [['Field', 'Value']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [233, 30, 140] },
      margin: { left: 20 }
    });
    
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text('Thank you for choosing Kaizen Mental Wellness', 20, finalY);
    doc.text('This is a system-generated receipt', 20, finalY + 7);
    
    doc.save(`receipt_session_${session.id}.pdf`);
  };

  // Export to Excel
  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${reportType.toUpperCase()} Report`);
    
    const headerStyle = {
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE91E8C' } },
      alignment: { horizontal: 'center' }
    };
    
    if (reportType === 'sessions') {
      worksheet.columns = [
        { header: 'Session ID', key: 'id', width: 12 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Client', key: 'client', width: 25 },
        { header: 'Professional', key: 'professional', width: 25 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Amount (KSh)', key: 'amount', width: 15 },
        { header: 'Payment Status', key: 'paymentStatus', width: 15 }
      ];
      
      filteredData.forEach(session => {
        worksheet.addRow({
          id: session.id,
          date: new Date(session.sessionDate).toLocaleString(),
          client: session.client?.clientName || 'N/A',
          professional: session.professional?.professionalName || 'N/A',
          status: session.status,
          amount: session.amount || 0,
          paymentStatus: session.paymentStatus
        });
      });
      
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell(cell => { cell.style = headerStyle; });
      
    } else if (reportType === 'assessments') {
      worksheet.columns = [
        { header: 'Assessment ID', key: 'id', width: 12 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'User', key: 'user', width: 25 },
        { header: 'Overall Score', key: 'score', width: 15 },
        { header: 'Overall Level', key: 'level', width: 15 },
        { header: 'Primary Concern', key: 'concern', width: 25 }
      ];
      
      filteredData.forEach(assessment => {
        worksheet.addRow({
          id: assessment.id,
          date: new Date(assessment.dateCompleted).toLocaleString(),
          user: assessment.user?.userName || 'N/A',
          score: assessment.overallScore,
          level: assessment.overallLevel,
          concern: assessment.primaryConcern
        });
      });
      
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell(cell => { cell.style = headerStyle; });
      
    } else if (reportType === 'payouts') {
      worksheet.columns = [
        { header: 'Professional', key: 'name', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Total Earned (KSh)', key: 'earned', width: 18 },
        { header: 'Pending (KSh)', key: 'pending', width: 18 },
        { header: 'Paid Out (KSh)', key: 'paid', width: 18 },
        { header: 'Sessions', key: 'sessions', width: 12 }
      ];
      
      filteredData.forEach(pro => {
        worksheet.addRow({
          name: pro.professionalName,
          email: pro.professionalEmail,
          earned: pro.totalEarned || 0,
          pending: pro.pendingPayout || 0,
          paid: pro.paidOut || 0,
          sessions: pro.totalSessions || 0
        });
      });
      
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell(cell => { cell.style = headerStyle; });
    }
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV
  const exportToCSV = () => {
    let exportData = [];
    
    if (reportType === 'sessions') {
      exportData = filteredData.map(session => ({
        'Session ID': session.id,
        'Date': new Date(session.sessionDate).toLocaleString(),
        'Client': session.client?.clientName || 'N/A',
        'Professional': session.professional?.professionalName || 'N/A',
        'Status': session.status,
        'Amount (KSh)': session.amount || 0,
        'Payment Status': session.paymentStatus
      }));
    } else if (reportType === 'assessments') {
      exportData = filteredData.map(assessment => ({
        'Assessment ID': assessment.id,
        'Date': new Date(assessment.dateCompleted).toLocaleString(),
        'User': assessment.user?.userName || 'N/A',
        'Overall Score': assessment.overallScore,
        'Overall Level': assessment.overallLevel,
        'Primary Concern': assessment.primaryConcern
      }));
    } else if (reportType === 'payouts') {
      exportData = filteredData.map(pro => ({
        'Professional': pro.professionalName,
        'Email': pro.professionalEmail,
        'Total Earned (KSh)': pro.totalEarned || 0,
        'Pending Payout (KSh)': pro.pendingPayout || 0,
        'Paid Out (KSh)': pro.paidOut || 0,
        'Total Sessions': pro.totalSessions || 0
      }));
    }
    
    if (exportData.length === 0) {
      alert('No data to export');
      return;
    }
    
    const headers = Object.keys(exportData[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));
    
    for (const row of exportData) {
      const values = headers.map(header => {
        const value = row[header] || '';
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    }
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      searchTerm: '',
      status: 'all',
      professionalId: 'all',
      sortBy: 'date_desc'
    });
  };

  const formatCurrency = (amount) => `KSh ${(amount || 0).toLocaleString()}`;

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>Loading reports data...</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
          Reports & Analytics
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Generate detailed reports, download receipts, and analyze platform data
        </p>
      </div>

      {/* Report Type Selector */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {['sessions', 'assessments', 'payouts'].map(type => (
          <button
            key={type}
            onClick={() => setReportType(type)}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: reportType === type ? 'none' : '1px solid var(--border)',
              background: reportType === type ? 'var(--accent)' : 'var(--bg-card)',
              color: reportType === type ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 14,
              transition: 'all 0.2s ease'
            }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        padding: 20,
        border: '1px solid var(--border)',
        marginBottom: 24
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
          🔍 Filters & Parameters
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters({ ...filters, startDate: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters({ ...filters, endDate: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Search</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.searchTerm}
              onChange={e => setFilters({ ...filters, searchTerm: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            />
          </div>
          {reportType === 'sessions' && (
            <>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
                <select
                  value={filters.status}
                  onChange={e => setFilters({ ...filters, status: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                >
                  <option value="all">All</option>
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Professional</label>
                <select
                  value={filters.professionalId}
                  onChange={e => setFilters({ ...filters, professionalId: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
                >
                  <option value="all">All Professionals</option>
                  {professionalsList.map(pro => (
                    <option key={pro.id} value={pro.id}>{pro.fullName}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Sort By</label>
            <select
              value={filters.sortBy}
              onChange={e => setFilters({ ...filters, sortBy: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)' }}
            >
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="amount_desc">Amount (Highest First)</option>
              <option value="amount_asc">Amount (Lowest First)</option>
            </select>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <button
            onClick={clearFilters}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            Clear Filters
          </button>
          <button
            onClick={exportToExcel}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#2e7d32', color: 'white', cursor: 'pointer' }}
          >
            📊 Export to Excel
          </button>
          <button
            onClick={exportToCSV}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: '#1565c0', color: 'white', cursor: 'pointer' }}
          >
            📄 Export to CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {summary.totalSessions !== undefined && (
            <>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Sessions</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>{summary.totalSessions}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Completed</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--success-text)', margin: 0 }}>{summary.completedSessions}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Revenue</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning-text)', margin: 0 }}>{formatCurrency(summary.totalRevenue)}</p>
              </div>
            </>
          )}
          {summary.totalAssessments !== undefined && (
            <>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Assessments</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', margin: 0 }}>{summary.totalAssessments}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Average Score</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--info-text)', margin: 0 }}>{summary.avgScore}</p>
              </div>
            </>
          )}
          {summary.totalPending !== undefined && (
            <>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Pending</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning-text)', margin: 0 }}>{formatCurrency(summary.totalPending)}</p>
              </div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Paid Out</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--success-text)', margin: 0 }}>{formatCurrency(summary.totalPaid)}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Data Table */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        overflow: 'auto',
        maxHeight: 500
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', borderBottom: '2px solid var(--border)', zIndex: 10 }}>
            <tr>
              {reportType === 'sessions' && (
                <>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Client</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Professional</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Receipt</th>
                </>
              )}
              {reportType === 'assessments' && (
                <>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>ID</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Overall Level</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Primary Concern</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>Score</th>
                </>
              )}
              {reportType === 'payouts' && (
                <>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600 }}>Professional</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>Total Earned</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>Pending</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>Paid Out</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: 13, fontWeight: 600 }}>Sessions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40 }}>No data found</td></tr>
            ) : (
              reportType === 'sessions' && filteredData.map(session => (
                <tr key={session.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px' }}>#{session.id}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(session.sessionDate).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>{session.client?.clientName || 'N/A'}</td>
                  <td style={{ padding: '12px 16px' }}>{session.professional?.professionalName || 'N/A'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: 11,
                      background: session.status === 'Completed' ? 'var(--success-bg)' : session.status === 'Pending' ? 'var(--warning-bg)' : 'var(--info-bg)',
                      color: session.status === 'Completed' ? 'var(--success-text)' : session.status === 'Pending' ? 'var(--warning-text)' : 'var(--info-text)'
                    }}>
                      {session.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(session.amount)}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    {session.paymentStatus === 'Paid' && (
                      <button
                        onClick={() => generateSessionReceipt(session)}
                        style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontSize: 11 }}
                      >
                        📄 Receipt
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
            {reportType === 'payouts' && filteredData.map(pro => (
              <tr key={pro.professionalId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 16px' }}>{pro.professionalName}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(pro.totalEarned)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'right', color: pro.pendingPayout > 0 ? 'var(--warning-text)' : 'inherit' }}>
                  {formatCurrency(pro.pendingPayout)}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right' }}>{formatCurrency(pro.paidOut)}</td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>{pro.totalSessions || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        Showing {filteredData.length} records
      </div>
    </div>
  );
}