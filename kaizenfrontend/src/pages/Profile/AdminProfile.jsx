import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';

export default function AdminProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: '',
    dateRegistered: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const userRes = await API.get('/auth/profile');
      const userData = userRes.data;
      setUser(userData);

      if (userData.profilePicture) {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        setProfilePicturePreview(`${baseUrl}${userData.profilePicture}`);
      } else {
        setProfilePicturePreview('');
      }
    } catch (err) {
      console.error(err);
      setError('Could not load profile information.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: '#e91e8c', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Admin Profile
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
              View your administrator account information
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => navigate('/settings')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                color: '#e91e8c',
                border: '1.5px solid #e91e8c',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: 10,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e91e8c';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#e91e8c';
              }}
            >
              ⚙️ Edit in Settings
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1.5px solid var(--border)',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: 10,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              ← Back
            </button>
          </div>
        </div>
        <div style={{ height: 3, width: 60, background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', marginTop: 16, borderRadius: 3 }} />
      </div>

      {error && (
        <div style={{
          background: 'rgba(233,30,140,0.1)',
          color: '#e91e8c',
          padding: '12px 16px',
          borderRadius: 12,
          marginBottom: 20,
          borderLeft: '3px solid #e91e8c'
        }}>
          {error}
        </div>
      )}

      {/* Profile Header Card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: 32,
        marginBottom: 24,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          <div style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 42,
            fontWeight: 600,
            color: 'white',
            overflow: 'hidden',
            flexShrink: 0
          }}>
            {profilePicturePreview
              ? <img src={profilePicturePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span>{user.firstName?.charAt(0).toUpperCase()}{user.lastName?.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {user.firstName} {user.lastName}
              </h2>
              <span style={{
                padding: '5px 14px',
                borderRadius: 30,
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(233,30,140,0.1)',
                color: '#e91e8c',
                border: '1px solid rgba(233,30,140,0.3)'
              }}>
                Administrator
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '8px 0' }}>
              📧 {user.email}
            </p>
            {user.phoneNumber && (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '8px 0' }}>
                📞 {user.phoneNumber}
              </p>
            )}
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0' }}>
              🗓️ Member since {formatDate(user.dateRegistered)}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}