import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';

export default function ProfessionalProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success] = useState('');
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: '',
    dateRegistered: ''
  });
  
  const [professionalProfile, setProfessionalProfile] = useState({
    bio: '',
    specialization: '',
    yearsOfExperience: '',
    education: '',
    certifications: '',
    licenseNumber: '',
    professionalLinks: {
      linkedin: '',
      website: '',
      portfolio: ''
    }
  });
  
  // Delete account states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);

  useEffect(() => {
    fetchProfile();
    const isGoogle = localStorage.getItem('isGoogleUser') === 'true';
    setIsGoogleUser(isGoogle);
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const userRes = await API.get('/auth/profile');
      const userData = userRes.data;
      console.log('Profile data received:', userData);
      
      setUser({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
        role: userData.role || '',
        dateRegistered: userData.dateRegistered || ''
      });
      
      if (userData.professionalProfile) {
        const prof = userData.professionalProfile;
        setProfessionalProfile({
          bio: prof.bio || '',
          specialization: prof.specialization || '',
          yearsOfExperience: prof.yearsOfExperience || '',
          education: prof.education || '',
          certifications: prof.certifications || '',
          licenseNumber: prof.licenseNumber || '',
          professionalLinks: {
            linkedin: prof.professionalLinks?.linkedin || '',
            website: prof.professionalLinks?.website || '',
            portfolio: prof.professionalLinks?.portfolio || ''
          }
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      const errorMessage = err.response?.data?.message || err.response?.data || err.message || 'Could not load profile information.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');
    
    try {
      const payload = isGoogleUser ? {} : { password: deletePassword };
      await API.delete('/auth/account', { data: payload });
      
      localStorage.clear();
      navigate('/', { state: { message: 'Your account has been deleted successfully.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      return new Date(dateString).toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
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
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Professional Profile
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
              View your professional information and credentials
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
      
      {success && (
        <div style={{
          background: 'rgba(76,175,80,0.1)',
          color: '#4caf50',
          padding: '12px 16px',
          borderRadius: 12,
          marginBottom: 20,
          borderLeft: '3px solid #4caf50'
        }}>
          {success}
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
            color: 'white'
          }}>
            {user.firstName?.charAt(0).toUpperCase()}{user.lastName?.charAt(0).toUpperCase()}
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
                background: 'rgba(156,39,176,0.1)',
                color: '#9c27b0',
                border: '1px solid rgba(156,39,176,0.3)'
              }}>
                Professional
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
            {professionalProfile.specialization && (
              <p style={{ fontSize: 13, color: '#e91e8c', margin: '12px 0 0' }}>
                🎯 Specialization: {professionalProfile.specialization}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Professional Information Card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: 28,
        marginBottom: 24,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: 'var(--text-primary)' }}>
          Professional Information
        </h3>
        
        {professionalProfile.licenseNumber && (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              License/Certification Number
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
              {professionalProfile.licenseNumber}
            </div>
          </div>
        )}
        
        {professionalProfile.specialization && (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Specialization
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
              {professionalProfile.specialization}
            </div>
          </div>
        )}
        
        {professionalProfile.yearsOfExperience && (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Years of Experience
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>
              {professionalProfile.yearsOfExperience} years
            </div>
          </div>
        )}
        
        {professionalProfile.bio && (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Bio
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6 }}>
              {professionalProfile.bio}
            </div>
          </div>
        )}
        
        {professionalProfile.education && (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Education & Qualifications
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {professionalProfile.education}
            </div>
          </div>
        )}
        
        {professionalProfile.certifications && (
          <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Certifications & Awards
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
              {professionalProfile.certifications}
            </div>
          </div>
        )}
        
        {/* Professional Links */}
        {(professionalProfile.professionalLinks?.linkedin || 
          professionalProfile.professionalLinks?.website || 
          professionalProfile.professionalLinks?.portfolio) && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Professional Links
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {professionalProfile.professionalLinks?.linkedin && (
                <a href={professionalProfile.professionalLinks.linkedin} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#e91e8c', textDecoration: 'none', fontSize: 14 }}>
                  🔗 LinkedIn Profile
                </a>
              )}
              {professionalProfile.professionalLinks?.website && (
                <a href={professionalProfile.professionalLinks.website} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#e91e8c', textDecoration: 'none', fontSize: 14 }}>
                  🌐 Professional Website
                </a>
              )}
              {professionalProfile.professionalLinks?.portfolio && (
                <a href={professionalProfile.professionalLinks.portfolio} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#e91e8c', textDecoration: 'none', fontSize: 14 }}>
                  📁 Credentials/Reviews Portal
                </a>
              )}
            </div>
          </div>
        )}
        
        {/* Show message if no professional information is available */}
        {!professionalProfile.licenseNumber && 
         !professionalProfile.specialization && 
         !professionalProfile.yearsOfExperience && 
         !professionalProfile.bio && 
         !professionalProfile.education && 
         !professionalProfile.certifications &&
         !professionalProfile.professionalLinks?.linkedin &&
         !professionalProfile.professionalLinks?.website &&
         !professionalProfile.professionalLinks?.portfolio && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              No professional information added yet.
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
              Click "Edit in Settings" to add your professional credentials, bio, and links.
            </p>
          </div>
        )}
      </div>

      {/* Delete Account Section */}
      {!showDeleteConfirm ? (
        <div style={{
          background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
          borderRadius: 16,
          border: '1px solid #FECACA',
          padding: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>⚠️</div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#991B1B' }}>
                Delete Account
              </h3>
              <p style={{ fontSize: 12, color: '#7F1D1D', margin: '4px 0 0' }}>
                Permanently delete your account and all associated data.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '8px 20px',
              background: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            Delete My Account
          </button>
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
          borderRadius: 16,
          border: '1px solid #FECACA',
          padding: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ fontSize: 24 }}>⚠️</div>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#991B1B' }}>
              Confirm Account Deletion
            </h3>
          </div>
          <p style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 16, lineHeight: 1.5 }}>
            Are you sure you want to permanently delete your account? All your data will be lost forever.
          </p>
          
          {!isGoogleUser && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>
                Enter your password to confirm
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1.5px solid #FECACA',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'white',
                  color: '#1a202c'
                }}
              />
            </div>
          )}
          
          {isGoogleUser && (
            <div style={{
              background: '#FEF3C7',
              padding: '10px 14px',
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12,
              color: '#92400E'
            }}>
              ⚠️ You signed up with Google. You don't need a password to delete your account.
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              style={{
                flex: 1,
                padding: '10px',
                background: '#DC2626',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.6 : 1
              }}
            >
              {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
            </button>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeletePassword('');
                setError('');
              }}
              style={{
                flex: 1,
                padding: '10px',
                background: 'transparent',
                color: '#6B7280',
                border: '1.5px solid #D1D5DB',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}