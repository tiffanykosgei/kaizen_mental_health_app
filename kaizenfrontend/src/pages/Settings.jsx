import { useState, useEffect } from 'react';
import { useTheme } from '../context/useTheme';
import API from '../api/axios';

export default function Settings() {
  const { theme, setThemeMode } = useTheme();
  const role = localStorage.getItem('role');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  
  // Password settings
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    sessionReminders: true,
    marketingEmails: false,
    assessmentReminders: true
  });
  
  // Professional Profile Data (for editing)
  const [professionalProfileData, setProfessionalProfileData] = useState({
    bio: '',
    specialization: '',
    yearsOfExperience: '',
    education: '',
    certifications: '',
    licenseNumber: '',
    linkedin: '',
    website: '',
    portfolio: ''
  });
  
  const [languages, setLanguages] = useState([]);
  const [newLanguage, setNewLanguage] = useState('');
  
  // Professional specific settings
  const [professionalSettings, setProfessionalSettings] = useState({
    autoConfirmSessions: false,
    sessionBufferTime: 15,
    timezone: 'Africa/Nairobi'
  });
  
  // Admin specific settings
  const [adminSettings, setAdminSettings] = useState({
    lowStockAlert: true,
    weeklyReports: true,
    autoBackup: false
  });
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch user profile
      const userRes = await API.get('/auth/profile');
      const userData = userRes.data;
      
      setProfileData({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        email: userData.email || '',
        phoneNumber: userData.phoneNumber || ''
      });
      
      // Fetch professional profile if user is professional
      if (role === 'Professional' && userData.professionalProfile) {
        const prof = userData.professionalProfile;
        setProfessionalProfileData({
          bio: prof.bio || '',
          specialization: prof.specialization || '',
          yearsOfExperience: prof.yearsOfExperience || '',
          education: prof.education || '',
          certifications: prof.certifications || '',
          licenseNumber: prof.licenseNumber || '',
          linkedin: prof.professionalLinks?.linkedin || '',
          website: prof.professionalLinks?.website || '',
          portfolio: prof.professionalLinks?.portfolio || ''
        });
        setLanguages(prof.languages || []);
      }
      
      // Load saved notification preferences from localStorage
      const savedNotifications = localStorage.getItem('notificationSettings');
      if (savedNotifications) {
        setNotificationSettings(JSON.parse(savedNotifications));
      }
      
      // Load professional settings from localStorage
      if (role === 'Professional') {
        const savedProfSettings = localStorage.getItem('professionalSettings');
        if (savedProfSettings) {
          setProfessionalSettings(JSON.parse(savedProfSettings));
        }
      }
      
      // Load admin settings from localStorage
      if (role === 'Admin') {
        const savedAdminSettings = localStorage.getItem('adminSettings');
        if (savedAdminSettings) {
          setAdminSettings(JSON.parse(savedAdminSettings));
        }
      }
      
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Could not load profile information. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await API.put('/auth/update-profile', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber
      });
      
      // Update localStorage
      localStorage.setItem('firstName', profileData.firstName);
      localStorage.setItem('lastName', profileData.lastName);
      localStorage.setItem('fullName', `${profileData.firstName} ${profileData.lastName}`.trim());
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleProfessionalProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await API.put('/auth/update-profile', {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber,
        bio: professionalProfileData.bio,
        specialization: professionalProfileData.specialization,
        yearsOfExperience: professionalProfileData.yearsOfExperience,
        education: professionalProfileData.education,
        certifications: professionalProfileData.certifications,
        licenseNumber: professionalProfileData.licenseNumber,
        professionalLinks: {
          linkedin: professionalProfileData.linkedin,
          website: professionalProfileData.website,
          portfolio: professionalProfileData.portfolio
        },
        languages: languages
      });
      
      // Update localStorage
      localStorage.setItem('firstName', profileData.firstName);
      localStorage.setItem('lastName', profileData.lastName);
      localStorage.setItem('fullName', `${profileData.firstName} ${profileData.lastName}`.trim());
      
      setSuccess('Professional profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update professional profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      await API.put('/auth/update-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      
      setSuccess('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  // Save notification settings to localStorage
  const handleNotificationChange = (key, value) => {
    const updated = { ...notificationSettings, [key]: value };
    setNotificationSettings(updated);
    localStorage.setItem('notificationSettings', JSON.stringify(updated));
    setSuccess('Notification settings saved');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Save professional settings to localStorage
  const handleProfessionalChange = (key, value) => {
    const updated = { ...professionalSettings, [key]: value };
    setProfessionalSettings(updated);
    localStorage.setItem('professionalSettings', JSON.stringify(updated));
    setSuccess('Professional settings saved');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Save admin settings to localStorage
  const handleAdminChange = (key, value) => {
    const updated = { ...adminSettings, [key]: value };
    setAdminSettings(updated);
    localStorage.setItem('adminSettings', JSON.stringify(updated));
    setSuccess('Admin settings saved');
    setTimeout(() => setSuccess(''), 2000);
  };

  const addLanguage = () => {
    if (newLanguage.trim() && !languages.includes(newLanguage.trim())) {
      setLanguages([...languages, newLanguage.trim()]);
      setNewLanguage('');
    }
  };

  const removeLanguage = (lang) => {
    setLanguages(languages.filter(l => l !== lang));
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'security', label: 'Security', icon: '🔒' }
  ];
  
  // Add notification tab for all users
  tabs.push({ id: 'notifications', label: 'Notifications', icon: '🔔' });
  
  // Add professional-specific tab
  if (role === 'Professional') {
    tabs.push({ id: 'professional', label: 'Professional Profile', icon: '💼' });
    tabs.push({ id: 'professional-settings', label: 'Preferences', icon: '⚙️' });
  }
  
  // Add admin-specific tab
  if (role === 'Admin') {
    tabs.push({ id: 'admin', label: 'Admin Settings', icon: '⚙️' });
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: '#e91e8c', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
          Manage your account preferences and settings
        </p>
      </div>

      {/* Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        borderBottom: '1.5px solid var(--border)',
        marginBottom: 32,
        overflowX: 'auto',
        flexWrap: 'wrap'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #e91e8c' : '2px solid transparent',
              color: activeTab === tab.id ? '#e91e8c' : 'var(--text-secondary)',
              fontSize: 14,
              fontWeight: activeTab === tab.id ? 600 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error/Success Messages */}
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

      {/* Profile Settings Tab */}
      {activeTab === 'profile' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 28
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Profile Information
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Update your personal information
          </p>
          
          <form onSubmit={handleProfileUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  First Name
                </label>
                <input
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Last Name
                </label>
                <input
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Email Address
              </label>
              <input
                type="email"
                value={profileData.email}
                disabled
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-hover)',
                  color: 'var(--text-muted)',
                  cursor: 'not-allowed'
                }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Email cannot be changed. Contact support for assistance.
              </p>
            </div>
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Phone Number
              </label>
              <input
                type="tel"
                value={profileData.phoneNumber}
                onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                placeholder="254712345678"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 28
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Theme Preferences
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Choose your preferred color theme
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <button
              onClick={() => setThemeMode('light')}
              style={{
                padding: '24px',
                background: theme === 'light' ? 'linear-gradient(135deg, #e91e8c, #9c27b0)' : 'var(--bg-hover)',
                border: theme === 'light' ? 'none' : '2px solid var(--border)',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>☀️</div>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                color: theme === 'light' ? 'white' : 'var(--text-primary)',
                marginBottom: 4
              }}>
                Light Mode
              </div>
              <div style={{ 
                fontSize: 12, 
                color: theme === 'light' ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'
              }}>
                Bright and clean interface
              </div>
              {theme === 'light' && (
                <div style={{ marginTop: 12, color: 'white', fontSize: 20 }}>✓</div>
              )}
            </button>
            
            <button
              onClick={() => setThemeMode('dark')}
              style={{
                padding: '24px',
                background: theme === 'dark' ? 'linear-gradient(135deg, #e91e8c, #9c27b0)' : 'var(--bg-hover)',
                border: theme === 'dark' ? 'none' : '2px solid var(--border)',
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>🌙</div>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                color: theme === 'dark' ? 'white' : 'var(--text-primary)',
                marginBottom: 4
              }}>
                Dark Mode
              </div>
              <div style={{ 
                fontSize: 12, 
                color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)'
              }}>
                Easy on the eyes at night
              </div>
              {theme === 'dark' && (
                <div style={{ marginTop: 12, color: 'white', fontSize: 20 }}>✓</div>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 28
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Notification Preferences
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Choose what notifications you want to receive
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Email Notifications
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Receive important updates via email
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.emailNotifications}
                  onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Session Reminders
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Get reminders before your scheduled sessions
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.sessionReminders}
                  onChange={(e) => handleNotificationChange('sessionReminders', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Assessment Reminders
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Get reminders to complete regular assessments
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={notificationSettings.assessmentReminders}
                  onChange={(e) => handleNotificationChange('assessmentReminders', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 28
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Security Settings
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Manage your password and security preferences
          </p>
          
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: '2px solid #e91e8c',
                borderRadius: 10,
                color: '#e91e8c',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordUpdate}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Password must be at least 8 characters with uppercase, lowercase, and special character
                </p>
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: 'transparent',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Professional Profile Tab - Complete Professional Profile Edit */}
      {activeTab === 'professional' && role === 'Professional' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 28
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Professional Profile
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Update your professional information and credentials
          </p>
          
          <form onSubmit={handleProfessionalProfileUpdate}>
            {/* License/Certification Number */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                License/Certification Number *
              </label>
              <input
                type="text"
                value={professionalProfileData.licenseNumber}
                onChange={(e) => setProfessionalProfileData({ ...professionalProfileData, licenseNumber: e.target.value })}
                placeholder="e.g., KMPDC-2024-12345"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Specialization */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Specialization *
              </label>
              <input
                type="text"
                value={professionalProfileData.specialization}
                onChange={(e) => setProfessionalProfileData({ ...professionalProfileData, specialization: e.target.value })}
                placeholder="e.g., Cognitive Behavioural Therapy, Clinical Psychology"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Years of Experience */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Years of Experience *
              </label>
              <select
                value={professionalProfileData.yearsOfExperience}
                onChange={(e) => setProfessionalProfileData({ ...professionalProfileData, yearsOfExperience: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Select years of experience</option>
                <option value="0-1">Less than 1 year</option>
                <option value="1-3">1-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10+">10+ years</option>
              </select>
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Bio *
              </label>
              <textarea
                value={professionalProfileData.bio}
                onChange={(e) => setProfessionalProfileData({ ...professionalProfileData, bio: e.target.value })}
                placeholder="Tell clients about your experience, approach, and what makes you unique..."
                rows={4}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Education & Qualifications */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Education & Qualifications
              </label>
              <textarea
                value={professionalProfileData.education}
                onChange={(e) => setProfessionalProfileData({ ...professionalProfileData, education: e.target.value })}
                placeholder="e.g., MSc Clinical Psychology - University of Nairobi (2018)"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Certifications & Awards */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Certifications & Awards
              </label>
              <textarea
                value={professionalProfileData.certifications}
                onChange={(e) => setProfessionalProfileData({ ...professionalProfileData, certifications: e.target.value })}
                placeholder="e.g., Certified CBT Practitioner - Beck Institute (2020)"
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Professional Links Section */}
            <h4 style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 12px', color: 'var(--text-primary)' }}>
              Professional Links
            </h4>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                LinkedIn Profile
              </label>
              <input
                value={professionalProfileData.linkedin}
                onChange={(e) => setProfessionalProfileData({ ...professionalProfileData, linkedin: e.target.value })}
                placeholder="https://linkedin.com/in/your-profile"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Professional Website/Portfolio
              </label>
              <input
                value={professionalProfileData.website}
                onChange={(e) => setProfessionalProfileData({ ...professionalProfileData, website: e.target.value })}
                placeholder="https://yourwebsite.com"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Credentials/Reviews Portal
              </label>
              <input
                value={professionalProfileData.portfolio}
                onChange={(e) => setProfessionalProfileData({ ...professionalProfileData, portfolio: e.target.value })}
                placeholder="https://psychologytoday.com/profile/123"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 10,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            {/* Languages Section */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                Languages Spoken
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input
                  placeholder="e.g., English, Swahili"
                  value={newLanguage}
                  onChange={(e) => setNewLanguage(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    fontSize: 14,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                />
                <button
                  type="button"
                  onClick={addLanguage}
                  style={{
                    padding: '0 20px',
                    background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {languages.map(lang => (
                  <span key={lang} style={{
                    background: 'rgba(156,39,176,0.1)',
                    color: '#9c27b0',
                    padding: '6px 12px',
                    borderRadius: 20,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}>
                    {lang}
                    <button
                      type="button"
                      onClick={() => removeLanguage(lang)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: 0,
                        color: '#9c27b0'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(135deg, #e91e8c, #9c27b0)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Professional Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Professional Settings Tab - Preferences */}
      {activeTab === 'professional-settings' && role === 'Professional' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 28
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Professional Preferences
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Manage your professional preferences and workflow settings
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Auto-confirm Sessions
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Automatically confirm session requests
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={professionalSettings.autoConfirmSessions}
                  onChange={(e) => handleProfessionalChange('autoConfirmSessions', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Session Buffer Time (minutes)
              </div>
              <select
                value={professionalSettings.sessionBufferTime}
                onChange={(e) => handleProfessionalChange('sessionBufferTime', parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
            
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                Timezone
              </div>
              <select
                value={professionalSettings.timezone}
                onChange={(e) => handleProfessionalChange('timezone', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1.5px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 14,
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings Tab */}
      {activeTab === 'admin' && role === 'Admin' && (
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          padding: 28
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            Admin Settings
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
            Manage platform administration preferences
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Low Stock Alerts
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Receive alerts when resources are low
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={adminSettings.lowStockAlert}
                  onChange={(e) => handleAdminChange('lowStockAlert', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Weekly Reports
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Receive weekly platform reports via email
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={adminSettings.weeklyReports}
                  onChange={(e) => handleAdminChange('weeklyReports', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Toggle Switch Styles */
        .switch {
          position: relative;
          display: inline-block;
          width: 52px;
          height: 26px;
        }
        
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: 0.3s;
        }
        
        .slider:before {
          position: absolute;
          content: "";
          height: 20px;
          width: 20px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.3s;
        }
        
        input:checked + .slider {
          background: linear-gradient(135deg, #e91e8c, #9c27b0);
        }
        
        input:checked + .slider:before {
          transform: translateX(26px);
        }
        
        .slider.round {
          border-radius: 34px;
        }
        
        .slider.round:before {
          border-radius: 50%;
        }
      `}</style>
    </div>
  );
}