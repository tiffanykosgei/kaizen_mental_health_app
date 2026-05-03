import { useState, useEffect } from 'react';
import API from '../api/axios';

const PINK   = '#e91e8c';
const PURPLE = '#9c27b0';

export default function ProfessionalViewModal({ professional, onClose }) {
  const [profileData, setProfileData] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => {
    if (professional?.id) loadProfessionalData();
  }, [professional]);

  const loadProfessionalData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await API.get(`/professional/public-profile/${professional.id}`);
      console.log('Public profile response:', res.data);
      setProfileData(res.data);
    } catch (err) {
      console.error('Error loading professional:', err);
      setError('Could not load full profile. Showing basic information.');
      setProfileData(professional);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={s.overlay} onClick={onClose}>
        <div style={s.modal} onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: 48 }}>
            <div style={s.spinner} />
            <p style={{ color: PURPLE, marginTop: 16 }}>Loading profile…</p>
          </div>
        </div>
      </div>
    );
  }

  // normalise data
  const firstName = profileData?.firstName || professional?.firstName || '';
  const lastName  = profileData?.lastName  || professional?.lastName  || '';
  const fullName  = `${firstName} ${lastName}`.trim();
  const email     = profileData?.email     || professional?.email     || '';

  const profile = profileData?.profile || {};

  // Get external profile URL - check multiple possible locations
  const externalProfileUrl = profile?.externalProfileUrl || profileData?.externalProfileUrl || '';
  
  // Also check if it's in the professional object directly
  const directExternalUrl = professional?.externalProfileUrl || professional?.profile?.externalProfileUrl || '';

  const finalExternalUrl = externalProfileUrl || directExternalUrl;

  console.log('External Profile URL debug:', {
    fromProfile: externalProfileUrl,
    fromDirect: directExternalUrl,
    final: finalExternalUrl,
    fullProfileData: profileData
  });

  const links = profile?.professionalLinks || {};
  const linkedin  = links.linkedin  || links.Linkedin  || '';
  const website   = links.website   || links.Website   || '';
  const portfolio = links.portfolio || links.Portfolio || '';
  const hasLinks  = !!(linkedin || website || portfolio);

  const ensureHttp = (url) => {
    if (!url) return '#';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={s.avatar}>
              {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={s.title}>{fullName}</h2>
              {profile.specialization && (
                <p style={s.specialization}>{profile.specialization}</p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {profile.yearsOfExperience && (
                  <span style={s.badge}>🗓️ {profile.yearsOfExperience} yrs exp</span>
                )}
                {profile.licenseNumber && (
                  <span style={{ ...s.badge, background: `${PURPLE}15`, color: PURPLE, border: `1px solid ${PURPLE}40` }}>
                    🪪 {profile.licenseNumber}
                  </span>
                )}
                {profile.averageRating > 0 && (
                  <span style={{ ...s.badge, background: 'rgba(246,173,85,0.15)', color: '#c97b00', border: '1px solid rgba(246,173,85,0.4)' }}>
                    ★ {Number(profile.averageRating).toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {/* Body */}
        <div style={s.body}>

          {error && (
            <div style={s.errorBox}>{error}</div>
          )}

          {/* Divider */}
          <div style={{ height: 2, background: `linear-gradient(90deg, ${PINK}, ${PURPLE})`, marginBottom: 24, borderRadius: 2 }} />

          {/* Bio */}
          {profile.bio && (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>About Me</h3>
              <p style={s.bodyText}>{profile.bio}</p>
            </div>
          )}

          {/* Education */}
          {profile.education && (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>🎓 Education & Qualifications</h3>
              <p style={s.bodyText}>{profile.education}</p>
            </div>
          )}

          {/* Certifications */}
          {profile.certifications && (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>🏆 Certifications & Awards</h3>
              <p style={s.bodyText}>{profile.certifications}</p>
            </div>
          )}

          {/* External Professional Profile Link - FIXED SECTION */}
          {finalExternalUrl ? (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>🔗 Professional Verification</h3>
              <a 
                href={ensureHttp(finalExternalUrl)} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                🌐 View Full Professional Profile
                <span style={{ fontSize: 12 }}>↗</span>
              </a>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                This link leads to an external site where you can verify the professional's credentials.
              </p>
            </div>
          ) : (
            // Optional: Show a message when no link is available (remove if you don't want this)
            <div style={s.section}>
              <h3 style={s.sectionTitle}>🔗 Professional Verification</h3>
              <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.05)', borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: '#999', margin: 0 }}>
                  No external verification link provided.
                </p>
              </div>
            </div>
          )}

          {/* Professional Links - keep existing */}
          {hasLinks ? (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>🔗 Professional Links</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {linkedin && (
                  <a href={ensureHttp(linkedin)} target="_blank" rel="noopener noreferrer" style={s.linkCard(PINK)}>
                    <span style={s.linkIcon}>🔗</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: PINK, margin: 0 }}>LinkedIn</p>
                      <p style={s.linkUrl}>{linkedin}</p>
                    </div>
                    <span style={{ fontSize: 14, color: PINK }}>↗</span>
                  </a>
                )}

                {website && (
                  <a href={ensureHttp(website)} target="_blank" rel="noopener noreferrer" style={s.linkCard(PURPLE)}>
                    <span style={s.linkIcon}>🌐</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: PURPLE, margin: 0 }}>Website</p>
                      <p style={s.linkUrl}>{website}</p>
                    </div>
                    <span style={{ fontSize: 14, color: PURPLE }}>↗</span>
                  </a>
                )}

                {portfolio && (
                  <a href={ensureHttp(portfolio)} target="_blank" rel="noopener noreferrer" style={s.linkCard(PURPLE)}>
                    <span style={s.linkIcon}>📁</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: PURPLE, margin: 0 }}>Portfolio</p>
                      <p style={s.linkUrl}>{portfolio}</p>
                    </div>
                    <span style={{ fontSize: 14, color: PURPLE }}>↗</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            !finalExternalUrl && (
              <div style={s.section}>
                <h3 style={s.sectionTitle}>🔗 Professional Links</h3>
                <div style={{ padding: '14px 16px', background: 'var(--bg-hover, #f9f9f9)', borderRadius: 10, textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#999', margin: 0 }}>No professional links added yet.</p>
                  <p style={{ fontSize: 12, color: '#bbb', margin: '6px 0 0' }}>You can still book a session and learn more during your consultation.</p>
                </div>
              </div>
            )
          )}

          {/* Session fee + contact */}
          <div style={{ ...s.section, background: `${PINK}08`, border: `1px solid ${PINK}30`, borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Session Fee</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: PINK, margin: 0 }}>KSh 1,500</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Duration</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#333', margin: 0 }}>60 minutes</p>
              </div>
              <div>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Platform</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#333', margin: 0 }}>Secure Video Call</p>
              </div>
            </div>
          </div>

          {email && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-hover, #f9f9f9)', borderRadius: 10 }}>
              <span style={{ fontSize: 13, color: '#666' }}>📧 {email}</span>
            </div>
          )}

          {/* Trust note */}
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(76,175,80,0.06)', border: '1px solid rgba(76,175,80,0.2)', borderRadius: 10, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#666', margin: 0 }}>
              🔒 All professionals are vetted and licensed. Your information is kept confidential.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button onClick={onClose} style={s.closeModalBtn}>Close</button>
          <button
            onClick={onClose}
            style={s.bookBtn}
          >
            Book a Session →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Style objects
const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000, padding: 20,
    backdropFilter: 'blur(3px)'
  },
  modal: {
    background: 'var(--bg-card, white)',
    borderRadius: 20,
    maxWidth: 560, width: '100%',
    maxHeight: '90vh',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
    overflow: 'hidden'
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border, #e0e0e0)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    background: `linear-gradient(135deg, rgba(233,30,140,0.06), rgba(156,39,176,0.06))`
  },
  avatar: {
    width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
    background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontWeight: 700, fontSize: 20
  },
  title: {
    fontSize: 20, fontWeight: 700, margin: 0,
    color: 'var(--text-primary, #1a202c)'
  },
  specialization: {
    fontSize: 13, color: PINK, margin: '4px 0 0', fontWeight: 600
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
    background: `rgba(233,30,140,0.1)`, color: PINK,
    border: `1px solid rgba(233,30,140,0.3)`
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 20,
    cursor: 'pointer', color: '#aaa', padding: '0 4px',
    lineHeight: 1, alignSelf: 'flex-start', marginTop: 2
  },
  body: {
    padding: '20px 24px', overflowY: 'auto', flex: 1
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 700, margin: '0 0 10px',
    color: 'var(--text-primary, #333)',
    borderLeft: `3px solid ${PINK}`, paddingLeft: 10
  },
  bodyText: {
    fontSize: 14, lineHeight: 1.7,
    color: 'var(--text-secondary, #555)',
    margin: 0, whiteSpace: 'pre-wrap'
  },
  linkCard: (color) => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 14px', borderRadius: 10,
    border: `1.5px solid ${color}40`,
    background: `${color}06`,
    textDecoration: 'none',
    transition: 'all 0.2s'
  }),
  linkIcon: { fontSize: 20, flexShrink: 0 },
  linkUrl: {
    fontSize: 11, color: '#888', margin: '2px 0 0',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
  },
  errorBox: {
    background: 'rgba(255,152,0,0.1)', color: '#e65100',
    padding: '10px 14px', borderRadius: 8, marginBottom: 16,
    fontSize: 13, border: '1px solid rgba(255,152,0,0.3)'
  },
  footer: {
    padding: '14px 24px',
    borderTop: '1px solid var(--border, #e0e0e0)',
    display: 'flex', justifyContent: 'flex-end', gap: 12
  },
  closeModalBtn: {
    padding: '10px 22px', borderRadius: 9,
    border: `1.5px solid ${PINK}`,
    background: 'transparent', color: PINK,
    cursor: 'pointer', fontSize: 14, fontWeight: 500
  },
  bookBtn: {
    padding: '10px 22px', borderRadius: 9, border: 'none',
    background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
    color: 'white', cursor: 'pointer',
    fontSize: 14, fontWeight: 600
  },
  spinner: {
    width: 40, height: 40, margin: '0 auto',
    border: `3px solid rgba(233,30,140,0.15)`,
    borderTop: `3px solid ${PINK}`,
    borderRadius: '50%',
    animation: 'spin 0.9s linear infinite'
  }
};