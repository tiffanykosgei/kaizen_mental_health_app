import { useState, useEffect } from 'react';
import API from '../../api/axios';

export default function ClientDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [recentJournalEntries, setRecentJournalEntries] = useState([]);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [recommendedResources, setRecommendedResources] = useState([]);
  
  const firstName = localStorage.getItem('firstName') || '';
  const fullName = localStorage.getItem('fullName') || '';
  const displayName = firstName.trim() || fullName.split(' ')[0].trim() || '';

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const [sessionsRes, assessmentsRes, journalsRes, resourcesRes] = await Promise.all([
        API.get('/Session/my-sessions'),
        API.get('/SelfAssessment/my-history'),
        API.get('/Journal'),
        API.get('/Resource/recommended')
      ]);
      
      const allSessions = sessionsRes.data || [];
      const now = new Date();
      
      setUpcomingSessions(allSessions.filter(s => new Date(s.sessionDate) > now && s.status !== 'Cancelled').slice(0, 5));
      setRecentAssessments(assessmentsRes.data?.slice(0, 3) || []);
      setLatestAssessment(assessmentsRes.data?.[0] || null);
      setRecentJournalEntries(journalsRes.data?.slice(0, 3) || []);
      setRecommendedResources(resourcesRes.data?.resources?.slice(0, 4) || []);
      
      setStats({
        totalSessions: allSessions.length,
        completedSessions: allSessions.filter(s => s.status === 'Completed').length,
        upcomingSessions: allSessions.filter(s => new Date(s.sessionDate) > now && s.status !== 'Cancelled').length,
        totalAssessments: assessmentsRes.data?.length || 0,
        totalJournalEntries: journalsRes.data?.length || 0,
        lastAssessmentLevel: assessmentsRes.data?.[0]?.overallLevel || null
      });
    } catch (err) {
      console.error('Failed to fetch client data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getWellbeingColor = (level) => {
    switch(level) {
      case 'Good': return { bg: 'var(--success-bg)', text: 'var(--success-text)' };
      case 'Mild': return { bg: 'var(--info-bg)', text: 'var(--info-text)' };
      case 'Moderate': return { bg: 'var(--warning-bg)', text: 'var(--warning-text)' };
      case 'Severe': return { bg: 'var(--error-bg)', text: 'var(--error-text)' };
      default: return { bg: 'var(--bg-muted)', text: 'var(--text-muted)' };
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container" style={{ fontFamily: 'inherit' }}>
      {/* Greeting Card */}
      <div className="dashboard-greeting-card">
        <div style={{ flex: 1 }}>
          <p className="dashboard-greeting-badge">{getGreeting()}</p>
          <h2 className="dashboard-greeting-title">
            {displayName ? `${getGreeting()}, ${displayName}!` : `${getGreeting()}!`}
          </h2>
          <p className="dashboard-greeting-message">
            Your mental wellness journey continues here. Take it one step at a time.
          </p>
        </div>
        <div className="dashboard-image-container">
          <img
            src="/brain-wellness.jpeg"
            alt="Take care of your mind"
            className="dashboard-image"
            onError={e => e.target.style.display = 'none'}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Sessions</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)', margin: 0, fontFamily: 'inherit' }}>{stats?.totalSessions || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>{stats?.completedSessions || 0} Completed</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Upcoming</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--secondary)', margin: 0, fontFamily: 'inherit' }}>{stats?.upcomingSessions || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>Sessions scheduled</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Self Assessments</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning-text)', margin: 0, fontFamily: 'inherit' }}>{stats?.totalAssessments || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>Wellness check-ins</p>
        </div>
        <div className="stats-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontFamily: 'inherit' }}>Journal Entries</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: 'var(--info-text)', margin: 0, fontFamily: 'inherit' }}>{stats?.totalJournalEntries || 0}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, fontFamily: 'inherit' }}>Moments captured</p>
        </div>
      </div>

      {/* Latest Assessment & Upcoming Sessions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Latest Assessment Result</h3>
          {latestAssessment ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: 48, fontWeight: 700, color: getWellbeingColor(latestAssessment.overallLevel).text, margin: 0, fontFamily: 'inherit' }}>
                  {latestAssessment.overallLevel}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'inherit' }}>Overall Wellbeing Level</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, textAlign: 'center', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{latestAssessment.anxietyLevel}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit' }}>Anxiety</p>
                </div>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{latestAssessment.depressionLevel}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit' }}>Depression</p>
                </div>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{latestAssessment.lonelinessLevel}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'inherit' }}>Loneliness</p>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, textAlign: 'center', fontFamily: 'inherit' }}>
                Primary concern: <strong>{latestAssessment.primaryConcern}</strong>
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 12, textAlign: 'center', fontFamily: 'inherit' }}>
                Completed: {new Date(latestAssessment.dateCompleted).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontFamily: 'inherit' }}>Take your first self-assessment to see your wellbeing level</p>
          )}
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Upcoming Sessions</h3>
          {upcomingSessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontFamily: 'inherit' }}>No upcoming sessions. Book a session with a professional!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {upcomingSessions.map(session => (
                <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{session.professional?.professionalFullName || 'Professional'}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>{session.formattedDate}</p>
                  </div>
                  <span style={{ 
                    background: session.status === 'Confirmed' ? 'var(--success-bg)' : 'var(--warning-bg)',
                    color: session.status === 'Confirmed' ? 'var(--success-text)' : 'var(--warning-text)',
                    padding: '2px 8px', borderRadius: 12, fontSize: 11
                  }}>{session.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Resources */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)', marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Recommended Resources For You</h3>
        {recommendedResources.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontFamily: 'inherit' }}>Complete a self-assessment to get personalized recommendations</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {recommendedResources.map(resource => (
              <a key={resource.id} href={resource.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <div style={{ padding: 12, background: 'var(--bg-hover)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s' }}>
                  <span style={{ 
                    background: resource.type === 'Article' ? 'var(--info-bg)' : resource.type === 'Video' ? 'var(--warning-bg)' : 'var(--success-bg)',
                    color: resource.type === 'Article' ? 'var(--info-text)' : resource.type === 'Video' ? 'var(--warning-text)' : 'var(--success-text)',
                    padding: '2px 8px', borderRadius: 12, fontSize: 10, display: 'inline-block', marginBottom: 8
                  }}>{resource.type}</span>
                  <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{resource.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0', fontFamily: 'inherit' }}>{resource.description?.substring(0, 80)}...</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Recent Journal & Recent Assessments */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Recent Journal Entries</h3>
          {recentJournalEntries.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontFamily: 'inherit' }}>Start journaling to track your thoughts and feelings</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentJournalEntries.map(entry => (
                <div key={entry.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{entry.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0', fontFamily: 'inherit' }}>{entry.content?.substring(0, 60)}...</p>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '4px 0 0 0', fontFamily: 'inherit' }}>{new Date(entry.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 20, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)', fontFamily: 'inherit' }}>Assessment History</h3>
          {recentAssessments.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20, fontFamily: 'inherit' }}>No assessments completed yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentAssessments.map(assessment => (
                <div key={assessment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ fontWeight: 600, margin: 0, color: 'var(--text-primary)', fontFamily: 'inherit' }}>{assessment.overallLevel}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>Primary: {assessment.primaryConcern}</p>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, fontFamily: 'inherit' }}>{new Date(assessment.dateCompleted).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quote Card */}
      <div className="dashboard-quote-card">
        <p className="dashboard-quote-label">Daily reminder</p>
        <p className="dashboard-quote-text">"You don't have to be positive all the time. Having feelings doesn't make you a negative person. It makes you human."</p>
        <p className="dashboard-quote-author">— Lori Deschene</p>
      </div>
    </div>
  );
}