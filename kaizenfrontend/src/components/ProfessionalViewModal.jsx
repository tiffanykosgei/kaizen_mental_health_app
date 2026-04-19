// src/components/ProfessionalViewModal.jsx
import { useState, useEffect } from 'react';
import API from '../api/axios';

export default function ProfessionalViewModal({ professional, onClose }) {
  const [loading, setLoading] = useState(true);
  const [fullProfile, setFullProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfessionalDetails();
  }, [professional]);

  const fetchProfessionalDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.get(`/professional/public-profile/${professional.id}`);
      console.log('Full profile response:', response.data); // Debug log
      setFullProfile(response.data);
    } catch (err) {
      console.error('Failed to fetch professional details:', err);
      if (professional) {
        setFullProfile(professional);
        setError('Showing basic profile information. Some details may be limited.');
      } else {
        setError('Could not load full profile details. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(4px)',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 20,
            maxWidth: 600,
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            padding: 32,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              border: '3px solid var(--border)',
              borderTopColor: '#e91e8c',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <p style={{ color: 'var(--text-secondary)' }}>Loading professional profile...</p>
        </div>
      </div>
    );
  }

  // Try multiple paths to get the profile data
  const proData = fullProfile?.professionalProfile || 
                   fullProfile?.profile || 
                   fullProfile?.ProfessionalProfile || 
                   {};

  const userData = fullProfile || professional || {};

  // Get links from various possible paths
  const links = proData.professionalLinks || 
                proData.ProfessionalLinks || 
                proData.links || 
                {};

  // Debug log to see what data we have
  console.log('Professional Data:', { proData, links, userData });

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: 24,
          maxWidth: 650,
          width: '90%',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 0,
          boxShadow: 'var(--shadow-lg)',
          position: 'relative',
        }}
      >
        {/* Header with gradient background */}
        <div
          style={{
            background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
            padding: '28px 32px',
            borderRadius: '24px 24px 0 0',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 20,
              right: 24,
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: 'white',
              width: 36,
              height: 36,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
          >
            ✕
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                fontWeight: 600,
                color: '#e91e8c',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              }}
            >
              {userData.firstName?.charAt(0).toUpperCase()}
              {userData.lastName?.charAt(0).toUpperCase()}
            </div>
            <div style={{ color: 'white' }}>
              <h2 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>
                {userData.firstName} {userData.lastName}
              </h2>
              <p style={{ fontSize: 14, margin: '8px 0 4px', opacity: 0.9 }}>
                {proData.specialization || 'Mental Health Professional'}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginTop: 8,
                  flexWrap: 'wrap',
                }}
              >
                {proData.yearsOfExperience && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                  >
                    📅 {proData.yearsOfExperience} years
                  </span>
                )}
                {proData.averageRating > 0 && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                  >
                    ★ {proData.averageRating.toFixed(1)} rating
                  </span>
                )}
                {proData.licenseNumber && (
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                    }}
                  >
                    📜 Licensed
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Notice (if any) */}
        {error && (
          <div
            style={{
              margin: '16px 32px 0 32px',
              padding: '12px 16px',
              background: 'rgba(255,152,0,0.1)',
              borderLeft: `4px solid #ff9800`,
              borderRadius: 8,
            }}
          >
            <p style={{ fontSize: 13, color: '#ff9800', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Content */}
        <div
          style={{
            padding: '24px 32px',
            maxHeight: 'calc(85vh - 180px)',
            overflow: 'auto',
          }}
        >
          {/* Bio Section */}
          {proData.bio && (
            <div style={{ marginBottom: 24 }}>
              <h4
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  margin: '0 0 12px 0',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>📝</span> About Me
              </h4>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {proData.bio}
              </p>
            </div>
          )}

          {/* Professional Details Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16,
              marginBottom: 24,
            }}
          >
            {proData.specialization && (
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-hover)',
                  borderRadius: 12,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    margin: '0 0 4px 0',
                  }}
                >
                  🎯 Specialization
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {proData.specialization}
                </p>
              </div>
            )}
            {proData.yearsOfExperience && (
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-hover)',
                  borderRadius: 12,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    margin: '0 0 4px 0',
                  }}
                >
                  📅 Experience
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {proData.yearsOfExperience} years
                </p>
              </div>
            )}
            {proData.licenseNumber && (
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-hover)',
                  borderRadius: 12,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    margin: '0 0 4px 0',
                  }}
                >
                  📜 License Number
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {proData.licenseNumber}
                </p>
              </div>
            )}
            {userData.email && (
              <div
                style={{
                  padding: 12,
                  background: 'var(--bg-hover)',
                  borderRadius: 12,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    margin: '0 0 4px 0',
                  }}
                >
                  📧 Contact Email
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  {userData.email}
                </p>
              </div>
            )}
          </div>

          {/* Education */}
          {proData.education && (
            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  margin: '0 0 12px 0',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>🎓</span> Education & Qualifications
              </h4>
              <div
                style={{
                  background: 'var(--bg-hover)',
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {proData.education}
              </div>
            </div>
          )}

          {/* Certifications */}
          {proData.certifications && (
            <div style={{ marginBottom: 20 }}>
              <h4
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  margin: '0 0 12px 0',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>🏆</span> Certifications & Awards
              </h4>
              <div
                style={{
                  background: 'var(--bg-hover)',
                  padding: 16,
                  borderRadius: 12,
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {proData.certifications}
              </div>
            </div>
          )}

          {/* Professional Links - ENHANCED SECTION */}
          <div style={{ marginBottom: 20 }}>
            <h4
              style={{
                fontSize: 15,
                fontWeight: 600,
                margin: '0 0 12px 0',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>🔗</span> Professional Links & Online Presence
            </h4>
            
            {/* Check if there are any links at all */}
            {!links.linkedin && !links.website && !links.portfolio ? (
              <div
                style={{
                  padding: 16,
                  background: 'var(--bg-hover)',
                  borderRadius: 12,
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                  No professional links have been added yet.
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  You can still book a session and learn more during your consultation.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {links.linkedin && (
                  <a
                    href={links.linkedin.startsWith('http') ? links.linkedin : `https://${links.linkedin}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#e91e8c',
                      textDecoration: 'none',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: 'var(--bg-hover)',
                      borderRadius: 10,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(233,30,140,0.1)';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🔗</span>
                    <span>
                      <strong>LinkedIn Profile</strong>
                      <br />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        View professional background and recommendations
                      </span>
                    </span>
                  </a>
                )}
                {links.website && (
                  <a
                    href={links.website.startsWith('http') ? links.website : `https://${links.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#e91e8c',
                      textDecoration: 'none',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: 'var(--bg-hover)',
                      borderRadius: 10,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(233,30,140,0.1)';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{ fontSize: 20 }}>🌐</span>
                    <span>
                      <strong>Professional Website</strong>
                      <br />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Learn more about practice and approach
                      </span>
                    </span>
                  </a>
                )}
                {links.portfolio && (
                  <a
                    href={links.portfolio.startsWith('http') ? links.portfolio : `https://${links.portfolio}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#e91e8c',
                      textDecoration: 'none',
                      fontSize: 14,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      background: 'var(--bg-hover)',
                      borderRadius: 10,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(233,30,140,0.1)';
                      e.currentTarget.style.transform = 'translateX(5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <span style={{ fontSize: 20 }}>📁</span>
                    <span>
                      <strong>Credentials & Portfolio</strong>
                      <br />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        View credentials, publications, and work samples
                      </span>
                    </span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Session Info */}
          <div
            style={{
              background: 'rgba(233,30,140,0.05)',
              padding: 16,
              borderRadius: 12,
              marginTop: 8,
              border: '1px solid rgba(233,30,140,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  Session Fee
                </p>
                <p
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#e91e8c',
                    margin: 0,
                  }}
                >
                  KSh 10
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  Session Duration
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  60 minutes
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}
                >
                  Platform
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  Secure Video Call
                </p>
              </div>
            </div>
          </div>

          {/* Trust & Safety Note */}
          <div
            style={{
              marginTop: 20,
              padding: 12,
              background: 'rgba(76,175,80,0.05)',
              borderRadius: 12,
              border: '1px solid rgba(76,175,80,0.2)',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              🔒 All professionals are vetted and licensed. Your information is kept confidential.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 32px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Close
          </button>
        </div>
      </div>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}