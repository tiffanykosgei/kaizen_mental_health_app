import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/useTheme';
import API from '../api/axios';

export default function CompleteProfile() {
  const navigate = useNavigate();
  const { dark, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    email: '', firstName: '', lastName: '',
    password: '', confirmPassword: '',
    role: '', phoneNumber: '',
    specialization: '', licenseNumber: '',
    yearsOfExperience: '', bio: '',
    education: '', certifications: '',
    externalProfileUrl: ''
  });

  const [errors,              setErrors]              = useState({});
  const [loading,             setLoading]             = useState(false);
  const [showPassword,        setShowPassword]        = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const email     = localStorage.getItem('googleEmail');
    const firstName = localStorage.getItem('googleFirstName');
    const lastName  = localStorage.getItem('googleLastName');
    const role      = localStorage.getItem('googleRole');

    if (!email || !role) { navigate('/'); return; }

    setFormData(prev => ({ ...prev, email, firstName: firstName || '', lastName: lastName || '', role }));
  }, [navigate]);

  const getRoleConfig = () => {
    switch (formData.role) {
      case 'Client':       return { icon: '🧠',  color: 'var(--primary)',   label: 'Client'       };
      case 'Professional': return { icon: '👩‍⚕️', color: '#9c27b0',          label: 'Professional' };
      case 'Admin':        return { icon: '🛡️',  color: 'var(--accent)',    label: 'Admin'        };
      default:             return { icon: '👤',  color: 'var(--text-secondary)', label: 'User'   };
    }
  };

  const config = getRoleConfig();

  const isValidUrl = (url) => {
    if (!url) return true;
    try {
      const u = url.startsWith('http') ? url : `https://${url}`;
      new URL(u);
      return true;
    } catch { return false; }
  };

  const validatePassword = (pwd) => ({
    length:    pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    special:   /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
  });

  const pwdChecks  = validatePassword(formData.password);
  const pwdScore   = Object.values(pwdChecks).filter(Boolean).length;
  const pwdStrength = [
    null,
    { text: 'Weak',   color: 'var(--error-text)',   width: '25%'  },
    { text: 'Fair',   color: 'var(--warning-text)', width: '50%'  },
    { text: 'Good',   color: 'var(--warning-text)', width: '75%'  },
    { text: 'Strong', color: 'var(--success-text)', width: '100%' }
  ][pwdScore];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const eObj = {};

    // Personal — always required
    if (!formData.firstName.trim()) eObj.firstName = 'First name is required.';
    if (!formData.lastName.trim())  eObj.lastName  = 'Last name is required.';

    // Password
    if (!formData.password)                eObj.password = 'Password is required.';
    else if (formData.password.length < 8) eObj.password = 'Password must be at least 8 characters.';
    else if (!pwdChecks.uppercase)         eObj.password = 'Password must include an uppercase letter.';
    else if (!pwdChecks.lowercase)         eObj.password = 'Password must include a lowercase letter.';
    else if (!pwdChecks.special)           eObj.password = 'Password must include a special character.';
    if (formData.password !== formData.confirmPassword)
      eObj.confirmPassword = 'Passwords do not match.';

    // Professional required fields
    if (formData.role === 'Professional') {
      if (!formData.phoneNumber.trim())      eObj.phoneNumber      = 'Phone number is required.';
      if (!formData.licenseNumber.trim())    eObj.licenseNumber    = 'License/Certification number is required.';
      if (!formData.specialization)          eObj.specialization   = 'Specialization is required.';
      if (!formData.yearsOfExperience)       eObj.yearsOfExperience = 'Years of experience is required.';
      if (!formData.bio.trim())              eObj.bio              = 'Bio is required.';
      if (!formData.education.trim())        eObj.education        = 'Education & Qualifications is required.';
      if (formData.externalProfileUrl && !isValidUrl(formData.externalProfileUrl))
        eObj.externalProfileUrl = 'Please enter a valid URL (e.g. https://linkedin.com/in/yourprofile).';
    }

    if (Object.keys(eObj).length > 0) {
      setErrors(eObj);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        email:              formData.email,
        firstName:          formData.firstName,
        lastName:           formData.lastName,
        password:           formData.password,
        confirmPassword:    formData.confirmPassword,
        role:               formData.role,
        phoneNumber:        formData.phoneNumber,
        isGoogleUser:       true,
        specialization:     formData.specialization,
        licenseNumber:      formData.licenseNumber,
        yearsOfExperience:  formData.yearsOfExperience,
        bio:                formData.bio,
        education:          formData.education,
        certifications:     formData.certifications,
        externalProfileUrl: formData.externalProfileUrl
      };

      const response = await API.post('/auth/complete-registration', payload);
      const data     = response.data;

      localStorage.removeItem('googleEmail');
      localStorage.removeItem('googleFirstName');
      localStorage.removeItem('googleLastName');
      localStorage.removeItem('googleRole');

      localStorage.setItem('token',     data.token);
      localStorage.setItem('role',      data.role);
      localStorage.setItem('fullName',  data.fullName);
      localStorage.setItem('firstName', data.firstName);
      localStorage.setItem('lastName',  data.lastName);

      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      setErrors({ submit: msg });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  // ── shared styles ──────────────────────────────────────────────────────────
  const inputStyle = (hasError) => ({
    width: '100%', padding: '13px 16px',
    border: `1.5px solid ${hasError ? 'var(--error-text)' : 'var(--border)'}`,
    borderRadius: 10, fontSize: 14,
    background: 'var(--bg-card)', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit'
  });

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 500,
    color: 'var(--text-secondary)', marginBottom: 6
  };

  const errText = (key) => errors[key]
    ? <p style={{ color: 'var(--error-text, #e53e3e)', fontSize: 12, marginTop: 4 }}>{errors[key]}</p>
    : null;

  const requiredMark = <span style={{ color: '#e53e3e', marginLeft: 2 }}>*</span>;

  const isPro = formData.role === 'Professional';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <button onClick={toggleTheme} className={`theme-toggle ${dark ? 'dark' : ''}`} type="button">
          <div className="theme-toggle-thumb" />
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: isPro ? 700 : 550, background: 'var(--bg-card)', borderRadius: 20, border: '1.5px solid var(--border)', padding: '40px 36px', boxShadow: 'var(--shadow-md)', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>{config.icon}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: config.color, margin: 0 }}>Complete Your Profile</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            {isPro ? 'Please complete all required fields to access the platform' : 'Welcome! Please set a password to secure your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {errors.submit && (
            <div style={{ background: 'var(--error-bg, #FCEBEB)', color: 'var(--error-text, #791F1F)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              {errors.submit}
            </div>
          )}

          <div style={{ background: 'var(--info-bg)', padding: '10px 14px', borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--info-text)' }}>
            ✓ Google Verified Email: <strong>{formData.email}</strong>
          </div>

          {/* ── Personal Information ── */}
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
            Personal Information
          </h3>

          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First Name{requiredMark}</label>
              <input name="firstName" placeholder="First name" value={formData.firstName}
                onChange={handleChange} style={inputStyle(errors.firstName)} />
              {errText('firstName')}
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last Name{requiredMark}</label>
              <input name="lastName" placeholder="Last name" value={formData.lastName}
                onChange={handleChange} style={inputStyle(errors.lastName)} />
              {errText('lastName')}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Phone Number{isPro ? requiredMark : ''}</label>
            <input name="phoneNumber" placeholder="e.g., 0712345678" value={formData.phoneNumber}
              onChange={handleChange} style={inputStyle(errors.phoneNumber)} />
            {errText('phoneNumber')}
          </div>

          {/* ── Professional-only fields ── */}
          {isPro && (
            <>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, marginTop: 20 }}>
                Professional Information
              </h3>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>License/Certification Number{requiredMark}</label>
                <input name="licenseNumber" placeholder="e.g., KMPDC-2024-12345" value={formData.licenseNumber}
                  onChange={handleChange} style={inputStyle(errors.licenseNumber)} />
                {errText('licenseNumber')}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Specialization{requiredMark}</label>
                <select name="specialization" value={formData.specialization}
                  onChange={handleChange} style={inputStyle(errors.specialization)}>
                  <option value="">Select specialization</option>
                  <option value="Anxiety">Anxiety</option>
                  <option value="Depression">Depression</option>
                  <option value="Loneliness">Loneliness</option>
                  <option value="General">General</option>
                </select>
                {errText('specialization')}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Years of Experience{requiredMark}</label>
                <select name="yearsOfExperience" value={formData.yearsOfExperience}
                  onChange={handleChange} style={inputStyle(errors.yearsOfExperience)}>
                  <option value="">Select years of experience</option>
                  <option value="0-1">Less than 1 year</option>
                  <option value="1-3">1-3 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="5-10">5-10 years</option>
                  <option value="10+">10+ years</option>
                </select>
                {errText('yearsOfExperience')}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Bio{requiredMark}</label>
                <textarea name="bio" placeholder="Tell clients about your experience and approach..."
                  value={formData.bio} onChange={handleChange} rows={4}
                  style={{ ...inputStyle(errors.bio), resize: 'vertical' }} />
                {errText('bio')}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Education & Qualifications{requiredMark}</label>
                <textarea name="education"
                  placeholder={`e.g., MSc Clinical Psychology - University of Nairobi (2018)`}
                  value={formData.education} onChange={handleChange} rows={3}
                  style={{ ...inputStyle(errors.education), resize: 'vertical' }} />
                {errText('education')}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Certifications & Awards</label>
                <textarea name="certifications"
                  placeholder="e.g., Certified CBT Practitioner - Beck Institute (2020)"
                  value={formData.certifications} onChange={handleChange} rows={3}
                  style={{ ...inputStyle(false), resize: 'vertical' }} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>External Professional Profile URL</label>
                <input name="externalProfileUrl"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.externalProfileUrl} onChange={handleChange}
                  style={inputStyle(errors.externalProfileUrl)} />
                {errText('externalProfileUrl')}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Link to your LinkedIn or government registry. Clients use this to verify your credentials.
                </p>
              </div>
            </>
          )}

          {/* ── Password ── */}
          <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14, marginTop: 20 }}>
            Account Security
          </h3>

          <div style={{ marginBottom: 8 }}>
            <label style={labelStyle}>Create Password{requiredMark}</label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} name="password"
                placeholder="Create a strong password" value={formData.password}
                onChange={handleChange} style={{ ...inputStyle(errors.password), paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--text-muted)', padding: 0, width: 'auto' }}>
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errText('password')}
          </div>

          {formData.password && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pwdStrength?.width || '0%', background: pwdStrength?.color || 'var(--border)', borderRadius: 2, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: pwdStrength?.color }}>{pwdStrength?.text}</span>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[{ key: 'length', label: '8+' }, { key: 'uppercase', label: 'A-Z' }, { key: 'lowercase', label: 'a-z' }, { key: 'special', label: '!@#' }].map(r => (
                    <span key={r.key} style={{ fontSize: 11, color: pwdChecks[r.key] ? 'var(--success-text)' : 'var(--text-muted)' }}>
                      {pwdChecks[r.key] ? '✓' : '○'} {r.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Confirm Password{requiredMark}</label>
            <div style={{ position: 'relative' }}>
              <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword"
                placeholder="Confirm your password" value={formData.confirmPassword}
                onChange={handleChange} style={{ ...inputStyle(errors.confirmPassword), paddingRight: 44 }} />
              <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 17, color: 'var(--text-muted)', padding: 0, width: 'auto' }}>
                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {formData.confirmPassword && formData.password && (
              <p style={{ fontSize: 12, marginTop: 4, color: formData.password === formData.confirmPassword ? 'var(--success-text)' : 'var(--error-text)' }}>
                {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </p>
            )}
            {errText('confirmPassword')}
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 600, background: config.color, color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating Account...' : 'Complete Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}