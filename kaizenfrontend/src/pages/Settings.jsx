import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/useTheme';
import API from '../api/axios';

export default function Settings() {
  const { theme, setThemeMode } = useTheme();
  const role = localStorage.getItem('role');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState('default');

  const [profileData, setProfileData] = useState({
    firstName: '', lastName: '', email: '', phoneNumber: '', profilePicture: ''
  });

  const [profilePictureFile,    setProfilePictureFile]    = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState('');
  const [uploadingPicture,      setUploadingPicture]      = useState(false);
  const fileInputRef = useRef(null);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  // MERGED: Unified Notification & Reminder Settings
  const [reminderSettings, setReminderSettings] = useState({
    // Browser/Push Notifications
    browserNotifications: {
      enabled: false,
      permissionRequested: false
    },
    // Email notifications master toggle
    emailNotifications: {
      enabled: true
    },
    // Client-specific reminders
    clientReminders: {
      sessionStartReminder: {
        enabled: true,
        minutesBefore: 30,
        pushNotification: true,
        emailNotification: true
      },
      journalReminder: {
        enabled: true,
        reminderTime: '20:00',
        reminderDays: ['monday', 'wednesday', 'friday'],
        pushNotification: true,
        emailNotification: true
      },
      paymentProcessedReminder: {
        enabled: true,
        pushNotification: true,
        emailNotification: true
      },
      assessmentReminder: {
        enabled: true,
        reminderFrequency: 'weekly',
        pushNotification: true,
        emailNotification: true
      },
      sessionFeedbackReminder: {
        enabled: true,
        hoursAfterSession: 2,
        pushNotification: true,
        emailNotification: true
      }
    },
    // Professional-specific reminders
    professionalReminders: {
      sessionStartReminder: {
        enabled: true,
        minutesBefore: 30,
        pushNotification: true,
        emailNotification: true
      },
      professionalPaidReminder: {
        enabled: true,
        pushNotification: true,
        emailNotification: true
      },
      newSessionBookedReminder: {
        enabled: true,
        pushNotification: true,
        emailNotification: true
      },
      sessionCancelledReminder: {
        enabled: true,
        pushNotification: true,
        emailNotification: true
      }
    },
    // Admin-specific reminders
    adminReminders: {
      adminPaymentProcessingReminder: {
        enabled: true,
        reminderFrequency: 'biweekly',
        emailNotification: true
      },
      newProfessionalRegistrationReminder: {
        enabled: true,
        emailNotification: true
      },
      platformReportReminder: {
        enabled: true,
        reminderFrequency: 'weekly',
        emailNotification: true
      },
      lowStockAlert: {
        enabled: true,
        emailNotification: true
      }
    },
    // Platform updates (visible to all roles)
    platformUpdates: {
      enabled: false,
      emailNotification: false,
      pushNotification: false
    },
    // Marketing emails (visible to all roles)
    marketingEmails: {
      enabled: false
    }
  });

  const [professionalProfileData, setProfessionalProfileData] = useState({
    bio: '', specialization: '', yearsOfExperience: '',
    education: '', certifications: '', licenseNumber: '', externalProfileUrl: ''
  });

  const [professionalSettings, setProfessionalSettings] = useState({
    autoConfirmSessions: false, sessionBufferTime: 15, timezone: 'Africa/Nairobi'
  });

  const [adminSettings, setAdminSettings] = useState({
    lowStockAlert: true, weeklyReports: true, autoBackup: false
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [activeTab,        setActiveTab]        = useState('profile');

  // Request browser notification permission
  const requestBrowserNotificationPermission = async () => {
    if (!('Notification' in window)) {
      setError('This browser does not support desktop notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setBrowserNotificationPermission('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setBrowserNotificationPermission(permission);
      if (permission === 'granted') {
        setSuccess('Browser notifications enabled! You will now receive real-time alerts.');
        setTimeout(() => setSuccess(''), 3000);
        return true;
      }
    }
    return false;
  };

  // Check browser notification permission on load
  useEffect(() => {
    if ('Notification' in window) {
      setBrowserNotificationPermission(Notification.permission);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res      = await API.get('/auth/profile');
      const userData = res.data;

      setProfileData({
        firstName:      userData.firstName      || '',
        lastName:       userData.lastName       || '',
        email:          userData.email          || '',
        phoneNumber:    userData.phoneNumber    || '',
        profilePicture: userData.profilePicture || ''
      });

      if (userData.profilePicture) {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        setProfilePicturePreview(`${baseUrl}${userData.profilePicture}`);
      } else {
        setProfilePicturePreview('');
      }

      if (role === 'Professional' && userData.professionalProfile) {
        const prof = userData.professionalProfile;
        setProfessionalProfileData({
          bio:                prof.bio                || '',
          specialization:     prof.specialization     || '',
          yearsOfExperience:  prof.yearsOfExperience  || '',
          education:          prof.education          || '',
          certifications:     prof.certifications     || '',
          licenseNumber:      prof.licenseNumber      || '',
          externalProfileUrl: prof.externalProfileUrl || ''
        });
      }

      // Load saved preferences
      const savedReminders = localStorage.getItem('reminderSettings');
      if (savedReminders) {
        const parsed = JSON.parse(savedReminders);
        // Ensure all nested structures exist
        const mergedReminders = {
          ...reminderSettings,
          ...parsed,
          browserNotifications: { ...reminderSettings.browserNotifications, ...parsed.browserNotifications },
          emailNotifications: { ...reminderSettings.emailNotifications, ...parsed.emailNotifications },
          clientReminders: { ...reminderSettings.clientReminders, ...parsed.clientReminders },
          professionalReminders: { ...reminderSettings.professionalReminders, ...parsed.professionalReminders },
          adminReminders: { ...reminderSettings.adminReminders, ...parsed.adminReminders },
          platformUpdates: { ...reminderSettings.platformUpdates, ...parsed.platformUpdates },
          marketingEmails: { ...reminderSettings.marketingEmails, ...parsed.marketingEmails }
        };
        setReminderSettings(mergedReminders);
      }

      if (role === 'Professional') {
        const savedProf = localStorage.getItem('professionalSettings');
        if (savedProf) setProfessionalSettings(JSON.parse(savedProf));
      }

      if (role === 'Admin') {
        const savedAdmin = localStorage.getItem('adminSettings');
        if (savedAdmin) setAdminSettings(JSON.parse(savedAdmin));
      }

    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Could not load profile information. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const isValidUrl = (url) => {
    if (!url || url.trim() === '') return true;
    const toTest = url.startsWith('http') ? url : `https://${url}`;
    try {
      new URL(toTest);
      return true;
    } catch {
      return false;
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file (JPEG, PNG, GIF)'); return; }
    if (file.size > 5 * 1024 * 1024)     { setError('Profile picture must be less than 5MB'); return; }
    setProfilePictureFile(file);
    setProfilePicturePreview(URL.createObjectURL(file));
  };

  const uploadProfilePicture = async () => {
    if (!profilePictureFile) return;
    setUploadingPicture(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', profilePictureFile);

      const response = await API.post('/auth/upload-profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        setProfileData(prev => ({ ...prev, profilePicture: response.data.profilePictureUrl }));
        setSuccess('Profile picture uploaded successfully!');
        setTimeout(() => setSuccess(''), 3000);
        await fetchSettings();
        
        localStorage.setItem('profilePictureUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('profilePictureChanged'));
      } else {
        setError(response.data.message || 'Failed to upload profile picture');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
      setProfilePictureFile(null);
    }
  };

  const removeProfilePicture = async () => {
    setUploadingPicture(true);
    setError('');
    try {
      const response = await API.delete('/auth/remove-profile-picture');
      if (response.data.success) {
        setProfilePicturePreview('');
        setProfilePictureFile(null);
        setProfileData(prev => ({ ...prev, profilePicture: '' }));
        setSuccess('Profile picture removed successfully!');
        setTimeout(() => setSuccess(''), 3000);
        
        localStorage.setItem('profilePictureUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('profilePictureChanged'));
      } else {
        setError(response.data.message || 'Failed to remove profile picture');
      }
    } catch (err) {
      console.error('Remove error:', err);
      setError(err.response?.data?.message || 'Failed to remove profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleProfessionalProfileUpdate = async (e) => {
    e.preventDefault();
    if (professionalProfileData.externalProfileUrl && !isValidUrl(professionalProfileData.externalProfileUrl)) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      await API.put('/auth/update-profile', {
        firstName:          profileData.firstName,
        lastName:           profileData.lastName,
        phoneNumber:        profileData.phoneNumber,
        bio:                professionalProfileData.bio,
        specialization:     professionalProfileData.specialization,
        yearsOfExperience:  professionalProfileData.yearsOfExperience,
        education:          professionalProfileData.education,
        certifications:     professionalProfileData.certifications,
        licenseNumber:      professionalProfileData.licenseNumber,
        externalProfileUrl: professionalProfileData.externalProfileUrl
          ? (professionalProfileData.externalProfileUrl.startsWith('http')
              ? professionalProfileData.externalProfileUrl
              : `https://${professionalProfileData.externalProfileUrl}`)
          : null
      });

      localStorage.setItem('firstName', profileData.firstName);
      localStorage.setItem('lastName',  profileData.lastName);
      localStorage.setItem('fullName',  `${profileData.firstName} ${profileData.lastName}`.trim());

      if (profilePictureFile) await uploadProfilePicture();

      setSuccess('Professional profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update professional profile');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await API.put('/auth/update-profile', {
        firstName:   profileData.firstName,
        lastName:    profileData.lastName,
        phoneNumber: profileData.phoneNumber
      });

      if (profilePictureFile) await uploadProfilePicture();

      localStorage.setItem('firstName', profileData.firstName);
      localStorage.setItem('lastName',  profileData.lastName);
      localStorage.setItem('fullName',  `${profileData.firstName} ${profileData.lastName}`.trim());

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) { setError('New passwords do not match'); return; }
    if (passwordData.newPassword.length < 8)                       { setError('Password must be at least 8 characters'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      await API.put('/auth/update-password', {
        currentPassword: passwordData.currentPassword,
        newPassword:     passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword
      });
      setSuccess('Password updated successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  const handleReminderChange = (category, subcategory, key, value) => {
    if (subcategory === null) {
      const updated = {
        ...reminderSettings,
        [category]: {
          ...reminderSettings[category],
          [key]: value
        }
      };
      setReminderSettings(updated);
      localStorage.setItem('reminderSettings', JSON.stringify(updated));
      setSuccess('Settings updated');
      setTimeout(() => setSuccess(''), 2000);
    } else {
      const updated = {
        ...reminderSettings,
        [category]: {
          ...reminderSettings[category],
          [subcategory]: {
            ...reminderSettings[category]?.[subcategory],
            [key]: value
          }
        }
      };
      setReminderSettings(updated);
      localStorage.setItem('reminderSettings', JSON.stringify(updated));
      setSuccess('Settings updated');
      setTimeout(() => setSuccess(''), 2000);
    }
  };

  const handleReminderDaysChange = (category, subcategory, day) => {
    const currentDays = reminderSettings[category]?.[subcategory]?.reminderDays || [];
    const updatedDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    const updated = {
      ...reminderSettings,
      [category]: {
        ...reminderSettings[category],
        [subcategory]: {
          ...reminderSettings[category]?.[subcategory],
          reminderDays: updatedDays
        }
      }
    };
    setReminderSettings(updated);
    localStorage.setItem('reminderSettings', JSON.stringify(updated));
    setSuccess('Reminder days updated'); 
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleProfessionalChange = (key, value) => {
    const updated = { ...professionalSettings, [key]: value };
    setProfessionalSettings(updated);
    localStorage.setItem('professionalSettings', JSON.stringify(updated));
    setSuccess('Professional settings saved'); 
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleAdminChange = (key, value) => {
    const updated = { ...adminSettings, [key]: value };
    setAdminSettings(updated);
    localStorage.setItem('adminSettings', JSON.stringify(updated));
    setSuccess('Admin settings saved'); 
    setTimeout(() => setSuccess(''), 2000);
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px',
    border: '1.5px solid var(--border)', borderRadius: 10,
    fontSize: 14, background: 'var(--bg-card)', color: 'var(--text-primary)'
  };

  const pictureBtnStyle = (color, bg) => ({
    padding: '8px 16px', background: bg, color,
    border: bg === 'transparent' ? `1.5px solid ${color}` : 'none',
    borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: uploadingPicture ? 'not-allowed' : 'pointer',
    opacity: uploadingPicture ? 0.6 : 1
  });

  const tabs = [
    { id: 'profile',      label: 'Profile',      icon: '👤' },
    { id: 'appearance',   label: 'Appearance',   icon: '🎨' },
    { id: 'security',     label: 'Security',     icon: '🔒' },
    { id: 'notifications',label: 'Notifications & Reminders', icon: '🔔' }
  ];
  if (role === 'Professional') tabs.push({ id: 'professional-settings', label: 'Preferences', icon: '⚙️' });
  if (role === 'Admin')        tabs.push({ id: 'admin',                  label: 'Admin',       icon: '⚙️' });

  const ProfilePictureBlock = () => (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#e91e8c', borderLeft: '3px solid #e91e8c', paddingLeft: 10 }}>
        Profile Picture
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
          {profilePicturePreview
            ? <img src={profilePicturePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: 42, color: 'white' }}>
                {profileData.firstName?.charAt(0).toUpperCase()}{profileData.lastName?.charAt(0).toUpperCase()}
              </span>
          }
        </div>
        <div style={{ flex: 1 }}>
          <input type="file" ref={fileInputRef} onChange={handleProfilePictureChange} accept="image/*" style={{ display: 'none' }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPicture}
              style={pictureBtnStyle('white', 'linear-gradient(135deg, #e91e8c, #9c27b0)')}>
              📷 {uploadingPicture ? 'Uploading...' : 'Upload Picture'}
            </button>
            {profilePicturePreview && (
              <button type="button" onClick={removeProfilePicture} disabled={uploadingPicture}
                style={pictureBtnStyle('#e53e3e', 'transparent')}>
                🗑️ Remove
              </button>
            )}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Recommended: Square image, max 5MB (JPG, PNG, GIF)
          </p>
        </div>
      </div>
    </div>
  );

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

  const card = { background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 28 };
  const sectionTitle = (color) => ({ fontSize: 16, fontWeight: 600, marginBottom: 16, color, borderLeft: `3px solid ${color}`, paddingLeft: 10 });
  const saveBtn = (label) => (
    <button type="submit" disabled={saving}
      style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
      {saving ? 'Saving...' : label}
    </button>
  );

  const ReminderSection = ({ title, icon, reminders, category }) => {
    // Get the category object safely
    const categoryData = reminderSettings[category];
    if (!categoryData) return null;

    return (
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#e91e8c', borderLeft: '3px solid #e91e8c', paddingLeft: 10 }}>
          {icon} {title}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.entries(reminders).map(([key, config]) => {
            const reminder = categoryData[key];
            if (!reminder) return null;
            
            return (
              <div key={key} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: reminder.enabled ? 12 : 0 }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{config.label}</h4>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{config.description}</p>
                  </div>
                  <label className="switch">
                    <input type="checkbox" checked={reminder.enabled} onChange={(e) => handleReminderChange(category, key, 'enabled', e.target.checked)} />
                    <span className="slider round" />
                  </label>
                </div>
                {reminder.enabled && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    {config.hasMinutesBefore && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Remind me</label>
                        <select value={reminder.minutesBefore} onChange={(e) => handleReminderChange(category, key, 'minutesBefore', parseInt(e.target.value))} style={inputStyle}>
                          <option value={10}>10 minutes before</option>
                          <option value={15}>15 minutes before</option>
                          <option value={30}>30 minutes before</option>
                          <option value={60}>1 hour before</option>
                          <option value={120}>2 hours before</option>
                        </select>
                      </div>
                    )}
                    {config.hasReminderTime && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Reminder Time</label>
                        <input type="time" value={reminder.reminderTime} onChange={(e) => handleReminderChange(category, key, 'reminderTime', e.target.value)} style={inputStyle} />
                      </div>
                    )}
                    {config.hasReminderDays && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Reminder Days</label>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => handleReminderDaysChange(category, key, day)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 20,
                                fontSize: 12,
                                border: `1px solid ${(reminder.reminderDays || []).includes(day) ? '#e91e8c' : 'var(--border)'}`,
                                background: (reminder.reminderDays || []).includes(day) ? 'rgba(233,30,140,0.1)' : 'transparent',
                                color: (reminder.reminderDays || []).includes(day) ? '#e91e8c' : 'var(--text-secondary)',
                                cursor: 'pointer'
                              }}
                            >
                              {day.charAt(0).toUpperCase() + day.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {config.hasFrequency && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Frequency</label>
                        <select value={reminder.reminderFrequency || 'weekly'} onChange={(e) => handleReminderChange(category, key, 'reminderFrequency', e.target.value)} style={inputStyle}>
                          <option value="weekly">Weekly</option>
                          <option value="biweekly">Bi-weekly</option>
                          <option value="monthly">Monthly</option>
                        </select>
                      </div>
                    )}
                    {config.hasHoursAfter && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Remind me after session</label>
                        <select value={reminder.hoursAfterSession} onChange={(e) => handleReminderChange(category, key, 'hoursAfterSession', parseInt(e.target.value))} style={inputStyle}>
                          <option value={1}>1 hour after</option>
                          <option value={2}>2 hours after</option>
                          <option value={6}>6 hours after</option>
                          <option value={12}>12 hours after</option>
                          <option value={24}>1 day after</option>
                        </select>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {config.hasPushNotification !== false && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <input type="checkbox" checked={reminder.pushNotification} onChange={(e) => handleReminderChange(category, key, 'pushNotification', e.target.checked)} disabled={!reminderSettings.browserNotifications?.enabled} />
                          Push Notification
                        </label>
                      )}
                      {config.hasEmailNotification !== false && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <input type="checkbox" checked={reminder.emailNotification} onChange={(e) => handleReminderChange(category, key, 'emailNotification', e.target.checked)} disabled={!reminderSettings.emailNotifications?.enabled} />
                          Email
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Define reminder configurations for each role
  const clientReminderConfigs = {
    sessionStartReminder: {
      label: '⏰ Session Start Reminder',
      description: 'Get reminded before your session begins',
      hasMinutesBefore: true,
      hasPushNotification: true,
      hasEmailNotification: true
    },
    journalReminder: {
      label: '📝 Journal Reminder',
      description: 'Get reminded to write in your journal',
      hasReminderTime: true,
      hasReminderDays: true,
      hasPushNotification: true,
      hasEmailNotification: true
    },
    paymentProcessedReminder: {
      label: '💰 Payment Confirmation',
      description: 'Get notified when your payment is processed',
      hasPushNotification: true,
      hasEmailNotification: true
    },
    assessmentReminder: {
      label: '📊 Assessment Reminder',
      description: 'Get reminded to complete regular assessments',
      hasFrequency: true,
      hasPushNotification: true,
      hasEmailNotification: true
    },
    sessionFeedbackReminder: {
      label: '⭐ Session Feedback Reminder',
      description: 'Get reminded to provide feedback after sessions',
      hasHoursAfter: true,
      hasPushNotification: true,
      hasEmailNotification: true
    }
  };

  const professionalReminderConfigs = {
    sessionStartReminder: {
      label: '⏰ Session Start Reminder',
      description: 'Get reminded before your client session begins',
      hasMinutesBefore: true,
      hasPushNotification: true,
      hasEmailNotification: true
    },
    professionalPaidReminder: {
      label: '💰 Payment Received',
      description: 'Get notified when you receive payment',
      hasPushNotification: true,
      hasEmailNotification: true
    },
    newSessionBookedReminder: {
      label: '📅 New Session Booked',
      description: 'Get notified when a client books a session with you',
      hasPushNotification: true,
      hasEmailNotification: true
    },
    sessionCancelledReminder: {
      label: '❌ Session Cancelled',
      description: 'Get notified when a client cancels a session',
      hasPushNotification: true,
      hasEmailNotification: true
    }
  };

  const adminReminderConfigs = {
    adminPaymentProcessingReminder: {
      label: '🏦 Payment Processing Reminder',
      description: 'Get reminded to process professional payments',
      hasFrequency: true,
      hasEmailNotification: true,
      hasPushNotification: false
    },
    newProfessionalRegistrationReminder: {
      label: '👨‍⚕️ New Professional Registration',
      description: 'Get notified when a new professional registers',
      hasEmailNotification: true,
      hasPushNotification: false
    },
    platformReportReminder: {
      label: '📊 Platform Report Reminder',
      description: 'Get reminded to review weekly platform reports',
      hasFrequency: true,
      hasEmailNotification: true,
      hasPushNotification: false
    },
    lowStockAlert: {
      label: '⚠️ Low Stock Alert',
      description: 'Receive alerts when resources are running low',
      hasEmailNotification: true,
      hasPushNotification: false
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px' }}>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Settings</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>Manage your account preferences and settings</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1.5px solid var(--border)', marginBottom: 32, overflowX: 'auto', flexWrap: 'wrap' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', background: 'transparent', border: 'none', borderBottom: activeTab === tab.id ? '2px solid #e91e8c' : '2px solid transparent', color: activeTab === tab.id ? '#e91e8c' : 'var(--text-secondary)', fontSize: 14, fontWeight: activeTab === tab.id ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error   && <div style={{ background: 'rgba(233,30,140,0.1)', color: '#e91e8c', padding: '12px 16px', borderRadius: 12, marginBottom: 20, borderLeft: '3px solid #e91e8c' }}>{error}</div>}
      {success && <div style={{ background: 'rgba(76,175,80,0.1)',  color: '#4caf50',  padding: '12px 16px', borderRadius: 12, marginBottom: 20, borderLeft: '3px solid #4caf50'  }}>{success}</div>}

      {/* ── Professional Profile Tab ── */}
      {activeTab === 'profile' && role === 'Professional' && (
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Professional Profile</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Update your professional information and credentials</p>

          <form onSubmit={handleProfessionalProfileUpdate}>
            <ProfilePictureBlock />

            <div style={{ marginBottom: 24 }}>
              <h3 style={sectionTitle('#e91e8c')}>Personal Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>First Name</label>
                  <input type="text" value={profileData.firstName} onChange={e => setProfileData({ ...profileData, firstName: e.target.value })} style={inputStyle} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Last Name</label>
                  <input type="text" value={profileData.lastName} onChange={e => setProfileData({ ...profileData, lastName: e.target.value })} style={inputStyle} required />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email Address</label>
                <input type="email" value={profileData.email} disabled style={{ ...inputStyle, background: 'var(--bg-hover)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed.</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Phone Number</label>
                <input type="tel" value={profileData.phoneNumber} onChange={e => setProfileData({ ...profileData, phoneNumber: e.target.value })} placeholder="254712345678" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h3 style={sectionTitle('#9c27b0')}>Professional Information</h3>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>License/Certification Number *</label>
                <input type="text" value={professionalProfileData.licenseNumber} onChange={e => setProfessionalProfileData({ ...professionalProfileData, licenseNumber: e.target.value })} placeholder="e.g., KMPDC-2024-12345" required style={inputStyle} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Specialization *</label>
                <select 
                  value={professionalProfileData.specialization} 
                  onChange={e => setProfessionalProfileData({ ...professionalProfileData, specialization: e.target.value })} 
                  required 
                  style={inputStyle}
                >
                  <option value="">Select specialization</option>
                  <option value="Anxiety">Anxiety</option>
                  <option value="Depression">Depression</option>
                  <option value="Loneliness">Loneliness</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Years of Experience *</label>
                <select value={professionalProfileData.yearsOfExperience} onChange={e => setProfessionalProfileData({ ...professionalProfileData, yearsOfExperience: e.target.value })} required style={inputStyle}>
                  <option value="">Select years of experience</option>
                  <option value="0-1">Less than 1 year</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Bio *</label>
                <textarea value={professionalProfileData.bio} onChange={e => setProfessionalProfileData({ ...professionalProfileData, bio: e.target.value })} placeholder="Tell clients about your experience and approach..." rows={4} required style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Education & Qualifications</label>
                <textarea value={professionalProfileData.education} onChange={e => setProfessionalProfileData({ ...professionalProfileData, education: e.target.value })} placeholder="e.g., MSc Clinical Psychology - University of Nairobi (2018)" rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Certifications & Awards</label>
                <textarea value={professionalProfileData.certifications} onChange={e => setProfessionalProfileData({ ...professionalProfileData, certifications: e.target.value })} placeholder="e.g., Certified CBT Practitioner (2020)" rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>External Professional Profile URL</label>
                <input type="url" value={professionalProfileData.externalProfileUrl} onChange={e => setProfessionalProfileData({ ...professionalProfileData, externalProfileUrl: e.target.value })} placeholder="https://linkedin.com/in/your-profile" style={inputStyle} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Link to your LinkedIn, government registry, or official professional website.</p>
              </div>
            </div>

            {saveBtn('Save Professional Profile')}
          </form>
        </div>
      )}

      {/* ── Client / Admin Profile Tab ── */}
      {activeTab === 'profile' && role !== 'Professional' && (
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Profile Information</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Update your personal information</p>

          <form onSubmit={handleProfileUpdate}>
            <ProfilePictureBlock />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>First Name</label>
                <input type="text" value={profileData.firstName} onChange={e => setProfileData({ ...profileData, firstName: e.target.value })} style={inputStyle} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Last Name</label>
                <input type="text" value={profileData.lastName} onChange={e => setProfileData({ ...profileData, lastName: e.target.value })} style={inputStyle} required />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email Address</label>
              <input type="email" value={profileData.email} disabled style={{ ...inputStyle, background: 'var(--bg-hover)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Email cannot be changed.</p>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Phone Number</label>
              <input type="tel" value={profileData.phoneNumber} onChange={e => setProfileData({ ...profileData, phoneNumber: e.target.value })} placeholder="254712345678" style={inputStyle} />
            </div>

            {saveBtn('Save Changes')}
          </form>
        </div>
      )}

      {/* ── Appearance Tab ── */}
      {activeTab === 'appearance' && (
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Theme Preferences</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Choose your preferred color theme</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[{ id: 'light', icon: '☀️', label: 'Light Mode', sub: 'Bright and clean interface' },
              { id: 'dark',  icon: '🌙', label: 'Dark Mode',  sub: 'Easy on the eyes at night' }].map(t => (
              <button key={t.id} onClick={() => setThemeMode(t.id)}
                style={{ padding: 24, background: theme === t.id ? 'linear-gradient(135deg, #e91e8c, #9c27b0)' : 'var(--bg-hover)', border: theme === t.id ? 'none' : '2px solid var(--border)', borderRadius: 12, cursor: 'pointer' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>{t.icon}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: theme === t.id ? 'white' : 'var(--text-primary)', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 12, color: theme === t.id ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>{t.sub}</div>
                {theme === t.id && <div style={{ marginTop: 12, color: 'white', fontSize: 20 }}>✓</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MERGED: Notifications & Reminders Tab ── */}
      {activeTab === 'notifications' && (
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Notifications & Reminders</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Configure how and when you receive alerts</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Browser Notifications Section */}
            <div style={{ padding: 16, background: 'linear-gradient(135deg, rgba(233,30,140,0.1), rgba(156,39,176,0.1))', borderRadius: 12, border: `2px solid #e91e8c` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#e91e8c' }}>🔔 Real-Time Browser Notifications</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Get instant pop-up notifications even when you're not on the page
                  </p>
                </div>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={reminderSettings.browserNotifications?.enabled || false} 
                    onChange={async (e) => {
                      if (e.target.checked) {
                        const granted = await requestBrowserNotificationPermission();
                        if (granted) {
                          handleReminderChange('browserNotifications', null, 'enabled', true);
                        } else {
                          setError('Please enable browser notifications in your browser settings');
                          e.target.checked = false;
                        }
                      } else {
                        handleReminderChange('browserNotifications', null, 'enabled', false);
                      }
                    }} 
                  />
                  <span className="slider round" />
                </label>
              </div>
              {reminderSettings.browserNotifications?.enabled && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(233,30,140,0.3)' }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Permission status: 
                      <strong style={{ color: browserNotificationPermission === 'granted' ? '#4caf50' : '#ff9800', marginLeft: 4 }}>
                        {browserNotificationPermission === 'granted' ? '✅ Allowed' : browserNotificationPermission === 'denied' ? '❌ Blocked' : '⚠️ Not requested'}
                      </strong>
                    </span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                    💡 Real-time notifications work in Chrome, Firefox, Edge, and Safari. You'll see pop-ups for session reminders, payments, and updates.
                  </p>
                </div>
              )}
            </div>

            {/* Email Notifications Master Toggle */}
            <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>📧 Email Notifications</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Master toggle for all email alerts</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={reminderSettings.emailNotifications?.enabled || false} onChange={(e) => {
                    const updated = { ...reminderSettings, emailNotifications: { enabled: e.target.checked } };
                    setReminderSettings(updated);
                    localStorage.setItem('reminderSettings', JSON.stringify(updated));
                    setSuccess('Email notifications updated');
                    setTimeout(() => setSuccess(''), 2000);
                  }} />
                  <span className="slider round" />
                </label>
              </div>
            </div>

            {/* Role-specific reminders sections */}
            {role === 'Client' && reminderSettings.clientReminders && (
              <ReminderSection 
                title="Client Reminders" 
                icon="👤" 
                reminders={clientReminderConfigs} 
                category="clientReminders" 
              />
            )}

            {role === 'Professional' && reminderSettings.professionalReminders && (
              <ReminderSection 
                title="Professional Reminders" 
                icon="👨‍⚕️" 
                reminders={professionalReminderConfigs} 
                category="professionalReminders" 
              />
            )}

            {role === 'Admin' && reminderSettings.adminReminders && (
              <ReminderSection 
                title="Admin Reminders" 
                icon="👑" 
                reminders={adminReminderConfigs} 
                category="adminReminders" 
              />
            )}

            {/* Platform Updates (visible to all roles) */}
            <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>🚀 Platform Updates</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Receive news about new features and platform improvements</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={reminderSettings.platformUpdates?.enabled || false} onChange={(e) => {
                    const updated = { ...reminderSettings, platformUpdates: { ...reminderSettings.platformUpdates, enabled: e.target.checked } };
                    setReminderSettings(updated);
                    localStorage.setItem('reminderSettings', JSON.stringify(updated));
                    setSuccess('Platform updates updated');
                    setTimeout(() => setSuccess(''), 2000);
                  }} />
                  <span className="slider round" />
                </label>
              </div>
              {reminderSettings.platformUpdates?.enabled && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input type="checkbox" checked={reminderSettings.platformUpdates?.pushNotification || false} onChange={(e) => {
                        const updated = { ...reminderSettings, platformUpdates: { ...reminderSettings.platformUpdates, pushNotification: e.target.checked } };
                        setReminderSettings(updated);
                        localStorage.setItem('reminderSettings', JSON.stringify(updated));
                      }} disabled={!reminderSettings.browserNotifications?.enabled} />
                      Push Notification
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <input type="checkbox" checked={reminderSettings.platformUpdates?.emailNotification || false} onChange={(e) => {
                        const updated = { ...reminderSettings, platformUpdates: { ...reminderSettings.platformUpdates, emailNotification: e.target.checked } };
                        setReminderSettings(updated);
                        localStorage.setItem('reminderSettings', JSON.stringify(updated));
                      }} disabled={!reminderSettings.emailNotifications?.enabled} />
                      Email
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Marketing Emails (visible to all roles) */}
            <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>📧 Marketing Emails</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Receive promotional offers and updates about our services</p>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={reminderSettings.marketingEmails?.enabled || false} onChange={(e) => {
                    const updated = { ...reminderSettings, marketingEmails: { enabled: e.target.checked } };
                    setReminderSettings(updated);
                    localStorage.setItem('reminderSettings', JSON.stringify(updated));
                    setSuccess('Marketing emails updated');
                    setTimeout(() => setSuccess(''), 2000);
                  }} />
                  <span className="slider round" />
                </label>
              </div>
            </div>

          </div>

          <div style={{ marginTop: 24, padding: 12, background: 'rgba(76,175,80,0.1)', borderRadius: 8, borderLeft: '3px solid #4caf50' }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              ✅ <strong>Real-time notifications work!</strong> Once enabled, you'll receive instant pop-up notifications for your relevant reminders - even when you're not actively using the platform!
            </p>
          </div>
        </div>
      )}

      {/* ── Security Tab ── */}
      {activeTab === 'security' && (
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Security Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Manage your password and security preferences</p>

          {!showPasswordForm ? (
            <button onClick={() => setShowPasswordForm(true)}
              style={{ width: '100%', padding: 14, background: 'transparent', border: '2px solid #e91e8c', borderRadius: 10, color: '#e91e8c', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordUpdate}>
              {[
                { key: 'currentPassword', label: 'Current Password' },
                { key: 'newPassword',     label: 'New Password',     hint: 'At least 8 characters with uppercase, lowercase, and special character' },
                { key: 'confirmPassword', label: 'Confirm New Password' }
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{f.label}</label>
                  <input type="password" value={passwordData[f.key]} onChange={e => setPasswordData({ ...passwordData, [f.key]: e.target.value })} style={inputStyle} required />
                  {f.hint && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{f.hint}</p>}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg, #e91e8c, #9c27b0)', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
                <button type="button" onClick={() => { setShowPasswordForm(false); setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                  style={{ flex: 1, padding: 12, background: 'transparent', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Professional Preferences Tab ── */}
      {activeTab === 'professional-settings' && role === 'Professional' && (
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Professional Preferences</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Manage your workflow settings</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Auto-confirm Sessions</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Automatically confirm session requests</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={professionalSettings.autoConfirmSessions} onChange={e => handleProfessionalChange('autoConfirmSessions', e.target.checked)} />
                <span className="slider round" />
              </label>
            </div>
            <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Session Buffer Time</div>
              <select value={professionalSettings.sessionBufferTime} onChange={e => handleProfessionalChange('sessionBufferTime', parseInt(e.target.value))} style={inputStyle}>
                {[5, 10, 15, 30].map(m => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </div>
            <div style={{ padding: '12px 0' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Timezone</div>
              <select value={professionalSettings.timezone} onChange={e => handleProfessionalChange('timezone', e.target.value)} style={inputStyle}>
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

      {/* ── Admin Settings Tab ── */}
      {activeTab === 'admin' && role === 'Admin' && (
        <div style={card}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Admin Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Manage platform administration preferences</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'lowStockAlert',  label: 'Low Stock Alerts',  sub: 'Receive alerts when resources are low' },
              { key: 'weeklyReports',  label: 'Weekly Reports',    sub: 'Receive weekly platform reports via email' }
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.sub}</div>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={adminSettings[item.key]} onChange={e => handleAdminChange(item.key, e.target.checked)} />
                  <span className="slider round" />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .switch { position: relative; display: inline-block; width: 52px; height: 26px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: 0.3s; }
        .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px; background-color: white; transition: 0.3s; }
        input:checked + .slider { background: linear-gradient(135deg, #e91e8c, #9c27b0); }
        input:checked + .slider:before { transform: translateX(26px); }
        .slider.round { border-radius: 34px; }
        .slider.round:before { border-radius: 50%; }
      `}</style>
    </div>
  );
}