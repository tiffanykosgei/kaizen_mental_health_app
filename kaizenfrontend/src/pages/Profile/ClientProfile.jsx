import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../api/axios';

export default function ClientProfile() {
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
    dateRegistered: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactEmail: ''
  });
  
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
    try {
      const userRes = await API.get('/auth/profile');
      const userData = userRes.data;
      setUser({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || '',
        role: userData.role || '',
        dateRegistered: userData.dateRegistered || '',
        emergencyContactName: userData.emergencyContactName || '',
        emergencyContactPhone: userData.emergencyContactPhone || '',
        emergencyContactEmail: userData.emergencyContactEmail || ''
      });
      setIsGoogleUser(Boolean(userData.isGoogleUser));

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

  const handleDeleteAccount = async () => {
    if (!isGoogleUser && !deletePassword.trim()) {
      setError('Please enter your password to delete your account.');
      return;
    }

    setDeleting(true);
    setError('');
    try {
      const payload = isGoogleUser ? {} : { password: deletePassword };
      await API.delete('/auth/account', { data: payload });
      localStorage.clear();
      navigate('/', { state: { message: 'Your account has been deleted successfully.' } });
    } catch (err) {
      const data = err.response?.data;
      const validationMessage = data?.errors
        ? Object.values(data.errors).flat().join(' ')
        : '';
      setError(data?.message || validationMessage || (typeof data === 'string' ? data : '') || 'Failed to delete account');
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric', month: 'long', day: 'numeric'
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
              My Profile
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
              View your account information
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => navigate('/settings')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: '#e91e8c',
                border: '1.5px solid #e91e8c', padding: '10px 20px',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                borderRadius: 10, transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#e91e8c'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#e91e8c'; }}
            >
              ⚙️ Edit in Settings
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: 'var(--text-secondary)',
                border: '1.5px solid var(--border)', padding: '10px 20px',
                fontSize: 14, fontWeight: 500, cursor: 'pointer',
                borderRadius: 10, transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              ← Back
            </button>
          </div>
        </div>
        <div style={{ height: 3, width: 60, background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', marginTop: 16, borderRadius: 3 }} />
      </div>

      {error && (
        <div style={{
          background: 'rgba(233,30,140,0.1)', color: '#e91e8c',
          padding: '12px 16px', borderRadius: 12, marginBottom: 20,
          borderLeft: '3px solid #e91e8c'
        }}>
          {error}
        </div>
      )}

      {/* Profile Header Card */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20,
        border: '1px solid var(--border)', padding: 32,
        marginBottom: 24, boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 42, fontWeight: 600, color: 'white',
            overflow: 'hidden', flexShrink: 0
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
                padding: '5px 14px', borderRadius: 30, fontSize: 12, fontWeight: 600,
                background: 'rgba(233,30,140,0.1)', color: '#e91e8c',
                border: '1px solid rgba(233,30,140,0.3)'
              }}>
                Client
              </span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '8px 0' }}>📧 {user.email}</p>
            {user.phoneNumber && (
              <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '8px 0' }}>📞 {user.phoneNumber}</p>
            )}
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0' }}>
              🗓️ Member since {formatDate(user.dateRegistered)}
            </p>
          </div>
        </div>
      </div>

      {/* Emergency Contact Card */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20,
        border: '1px solid var(--border)', padding: 24,
        marginBottom: 24, boxShadow: 'var(--shadow-sm)'
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
          🚨 Emergency Contact
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          This contact may be reached by a professional in a mental health emergency during a session.
        </p>

        {user.emergencyContactName || user.emergencyContactPhone || user.emergencyContactEmail ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {user.emergencyContactName && (
              <div style={{
                padding: '12px 16px', background: 'var(--bg-hover)',
                borderRadius: 10, border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Full Name
                </span>
                <p style={{ fontSize: 15, fontWeight: 500, margin: '4px 0 0', color: 'var(--text-primary)' }}>
                  {user.emergencyContactName}
                </p>
              </div>
            )}
            {user.emergencyContactPhone && (
              <div style={{
                padding: '12px 16px', background: 'var(--bg-hover)',
                borderRadius: 10, border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Phone Number
                </span>
                <p style={{ fontSize: 15, fontWeight: 500, margin: '4px 0 0', color: 'var(--text-primary)' }}>
                  📞 {user.emergencyContactPhone}
                </p>
              </div>
            )}
            {user.emergencyContactEmail && (
              <div style={{
                padding: '12px 16px', background: 'var(--bg-hover)',
                borderRadius: 10, border: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Email Address
                </span>
                <p style={{ fontSize: 15, fontWeight: 500, margin: '4px 0 0', color: 'var(--text-primary)' }}>
                  {user.emergencyContactEmail}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            padding: '24px 20px', borderRadius: 12,
            background: 'rgba(233,30,140,0.04)',
            border: '1.5px dashed rgba(233,30,140,0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🆘</div>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
              No emergency contact added yet
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Adding an emergency contact helps professionals reach someone you trust in a crisis.
            </p>
            <button
              onClick={() => navigate('/settings')}
              style={{
                padding: '9px 22px',
                background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
                color: 'white', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}
            >
              ⚙️ Add Emergency Contact
            </button>
          </div>
        )}

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16, marginBottom: 0 }}>
          You can update this anytime in <strong>Settings → Profile</strong>.
        </p>
      </div>

      {/* Delete Account Section */}
      {!showDeleteConfirm ? (
        <div style={{
          background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
          borderRadius: 16, border: '1px solid #FECACA', padding: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>⚠️</div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#991B1B' }}>Delete Account</h3>
              <p style={{ fontSize: 12, color: '#7F1D1D', margin: '4px 0 0' }}>
                Permanently delete your account and all associated data.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '8px 20px', background: '#DC2626', color: 'white',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap'
            }}
          >
            Delete My Account
          </button>
        </div>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
          borderRadius: 16, border: '1px solid #FECACA', padding: 20
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
                  width: '100%', padding: '10px 14px',
                  border: '1.5px solid #FECACA', borderRadius: 8,
                  fontSize: 14, background: 'white', color: '#1a202c'
                }}
              />
            </div>
          )}

          {isGoogleUser && (
            <div style={{
              background: '#FEF3C7', padding: '10px 14px',
              borderRadius: 8, marginBottom: 16, fontSize: 12, color: '#92400E'
            }}>
              ⚠️ You signed up with Google. You don't need a password to delete your account.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              style={{
                flex: 1, padding: '10px', background: '#DC2626', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.6 : 1
              }}
            >
              {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setError(''); }}
              style={{
                flex: 1, padding: '10px', background: 'transparent',
                color: '#6B7280', border: '1.5px solid #D1D5DB',
                borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer'
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
