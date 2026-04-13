import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Password management (for Google users)
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);
  
  // Account deletion
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  
  // User data
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: ''
  });
  
  // Professional-specific data
  const [professionalProfile, setProfessionalProfile] = useState({
    bio: '',
    specialization: '',
    paymentMethod: '',
    paymentAccount: ''
  });
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    bio: '',
    specialization: ''
  });

  useEffect(() => {
    fetchProfile();
    // Check if user is Google user
    const isGoogle = localStorage.getItem('isGoogleUser') === 'true';
    setIsGoogleUser(isGoogle);
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const userRes = await API.get('/auth/profile');
      const userData = userRes.data;
      setUser(userData);
      
      setFormData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phoneNumber: userData.phoneNumber || '',
        bio: userData.professionalProfile?.bio || '',
        specialization: userData.professionalProfile?.specialization || ''
      });
      
      if (userData.role === 'Professional' && userData.professionalProfile) {
        setProfessionalProfile(userData.professionalProfile);
      }
    } catch (err) {
      console.error(err);
      setError('Could not load profile information.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await API.put('/auth/update-profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        bio: formData.bio,
        specialization: formData.specialization
      });
      
      // Update localStorage with new name
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      localStorage.setItem('firstName', formData.firstName);
      localStorage.setItem('lastName', formData.lastName);
      localStorage.setItem('fullName', fullName);
      
      setSuccess('Profile updated successfully!');
      fetchProfile(); // Refresh data
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (!hasUpperCase || !hasLowerCase || !hasSpecialChar) {
      setError('Password must contain uppercase, lowercase, and special character');
      return;
    }
    
    setSettingPassword(true);
    setError('');
    setSuccess('');
    
    try {
      await API.post('/auth/set-password', {
        newPassword,
        confirmPassword
      });
      setSuccess('Password set successfully! You can now login with email and password.');
      setShowSetPassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set password');
    } finally {
      setSettingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setError('');
    
    try {
      const payload = isGoogleUser ? {} : { password: deletePassword };
      await API.delete('/auth/account', { data: payload });
      
      // Clear all local storage
      localStorage.clear();
      
      // Redirect to home page
      navigate('/', { state: { message: 'Your account has been deleted successfully.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account');
      setDeleting(false);
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
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const isProfessional = user.role === 'Professional';

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 20px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 500, margin: 0, color: '#1a202c' }}>My Profile</h2>
          <p style={{ color: '#718096', fontSize: 14, marginTop: 4 }}>
            Manage your personal information
          </p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff', width: 'auto', padding: '8px 16px', fontSize: 13, cursor: 'pointer', borderRadius: 8 }}
        >
          Back to Dashboard
        </button>
      </div>

      {/* Current Info Card */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Account Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          <div>
            <p style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Full Name</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1a202c' }}>{user.firstName} {user.lastName}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Email Address</p>
            <p style={{ fontSize: 14, fontWeight: 500, color: '#1a202c' }}>{user.email}</p>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Role</p>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              background: user.role === 'Admin' ? '#EEEDFE' : user.role === 'Professional' ? '#E1F5EE' : '#FAEEDA',
              color: user.role === 'Admin' ? '#3C3489' : user.role === 'Professional' ? '#085041' : '#633806'
            }}>
              {user.role}
            </span>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Member Since</p>
            <p style={{ fontSize: 14, color: '#1a202c' }}>{formatDate(user.dateRegistered)}</p>
          </div>
          {isProfessional && professionalProfile.paymentMethod && (
            <div>
              <p style={{ fontSize: 12, color: '#718096', marginBottom: 4 }}>Payment Method</p>
              <p style={{ fontSize: 14, color: '#1a202c' }}>
                {professionalProfile.paymentMethod === 'Bank' ? '🏦 Bank Transfer' : '📱 M-Pesa'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Form */}
      <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>Edit Profile</h3>
        
        {error && (
          <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#E1F5EE', color: '#085041', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Your first name"
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Your last name"
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number (for M-Pesa payments)</label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="254712345678"
            />
            <p style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>
              Format: 254 followed by 9 digits (e.g., 254712345678)
            </p>
          </div>

          {isProfessional && (
            <>
              <div className="form-group">
                <label>Specialization</label>
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleChange}
                  placeholder="e.g., Cognitive Behavioural Therapy"
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Tell clients about your experience..."
                  rows={4}
                  style={{ resize: 'vertical' }}
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" disabled={saving} style={{ flex: 1 }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  firstName: user.firstName || '',
                  lastName: user.lastName || '',
                  phoneNumber: user.phoneNumber || '',
                  bio: professionalProfile.bio || '',
                  specialization: professionalProfile.specialization || ''
                });
              }}
              style={{ flex: 1, background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Password Management (For Google Users) */}
      {isGoogleUser && !showSetPassword && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#1a202c' }}>
            Password Settings
          </h3>
          <p style={{ color: '#718096', marginBottom: 16, fontSize: 14 }}>
            You signed up with Google. You can set a password to also login with email and password.
          </p>
          <button
            onClick={() => setShowSetPassword(true)}
            style={{
              padding: '10px 20px',
              background: '#00c98d',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Set Password
          </button>
        </div>
      )}

      {/* Set Password Form */}
      {showSetPassword && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#1a202c' }}>
            Set Your Password
          </h3>
          <form onSubmit={handleSetPassword}>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong password"
                required
                minLength={8}
              />
              <p style={{ fontSize: 11, color: '#718096', marginTop: 4 }}>
                Must be at least 8 characters with uppercase, lowercase, and special character
              </p>
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                type="submit" 
                disabled={settingPassword}
                style={{ flex: 1 }}
              >
                {settingPassword ? 'Setting Password...' : 'Set Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSetPassword(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
                style={{ flex: 1, background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Account Section */}
      {!showDeleteConfirm ? (
        <div style={{ background: '#FEF2F2', borderRadius: 12, padding: 24, border: '1px solid #FECACA' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#991B1B' }}>
            Delete Account
          </h3>
          <p style={{ color: '#7F1D1D', marginBottom: 16, fontSize: 14 }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              padding: '10px 20px',
              background: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            Delete My Account
          </button>
        </div>
      ) : (
        <div style={{ background: '#FEF2F2', borderRadius: 12, padding: 24, border: '1px solid #FECACA' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#991B1B' }}>
            Confirm Account Deletion
          </h3>
          <p style={{ color: '#7F1D1D', marginBottom: 16, fontSize: 14 }}>
            Are you sure you want to permanently delete your account? All your data will be lost.
          </p>
          
          {!isGoogleUser && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ color: '#991B1B' }}>Enter your password to confirm:</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </div>
          )}
          
          {isGoogleUser && (
            <div style={{ 
              background: '#FFEDD5', 
              padding: '12px', 
              borderRadius: 8, 
              marginBottom: 16,
              fontSize: 14,
              color: '#9A3412'
            }}>
              ⚠️ You signed up with Google. You don't need a password to delete your account.
            </div>
          )}
          
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              style={{
                padding: '10px 20px',
                background: '#DC2626',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: deleting ? 'not-allowed' : 'pointer',
                opacity: deleting ? 0.7 : 1
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
                padding: '10px 20px',
                background: 'transparent',
                color: '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}