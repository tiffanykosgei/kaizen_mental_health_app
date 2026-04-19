import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../../context/useTheme';
import { GoogleLogin } from '@react-oauth/google';
import API from '../../api/axios';

export default function RegisterProfessional() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  
  // Flow state
  const [step, setStep] = useState(1); // 1: choose method, 2: email verification, 3: complete profile
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  // Profile data
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '',
    password: '', confirmPassword: '',
    role: 'Professional', phoneNumber: '',
    bio: '', specialization: '',
    // New fields for professional portfolio
    yearsOfExperience: '',
    education: '',
    certifications: '',
    professionalLinks: {
      linkedin: '',
      website: '',
      portfolio: ''
    },
    languages: [],
    profileImage: null,
    licenseNumber: ''
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');

  const config = { icon: '👩‍⚕️', color: '#9c27b0', label: 'Professional' };

  const validatePassword = (pwd) => ({
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
  });

  const pwdChecks = validatePassword(formData.password);
  const pwdScore = Object.values(pwdChecks).filter(Boolean).length;
  const pwdStrength = [
    null,
    { text: 'Weak', color: '#e53e3e', width: '25%' },
    { text: 'Fair', color: '#ed8936', width: '50%' },
    { text: 'Good', color: '#ecc94b', width: '75%' },
    { text: 'Strong', color: '#48bb78', width: '100%' }
  ][pwdScore];

  // Send verification code
  const handleSendCode = async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrors({ email: 'Please enter a valid email address.' });
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      await API.post('/auth/send-verification', { email });
      setIsCodeSent(true);
      setCountdown(60);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to send verification code.' });
    } finally {
      setLoading(false);
    }
  };

  // Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setErrors({ code: 'Please enter the 6-digit verification code.' });
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      await API.post('/auth/verify-code', { email, code: verificationCode });
      setFormData(prev => ({ ...prev, email }));
      setStep(3);
    } catch (err) {
      setErrors({ code: err.response?.data?.message || 'Invalid verification code.' });
    } finally {
      setLoading(false);
    }
  };

  // Google sign-up
  const handleGoogleSuccess = async (credentialResponse) => {
    setErrors({});
    setLoading(true);
    try {
      const response = await API.post('/auth/google-login', {
        credential: credentialResponse.credential,
        role: 'Professional'
      });
      const data = response.data;
      
      if (data.requiresPassword) {
        localStorage.setItem('googleEmail', data.email);
        localStorage.setItem('googleFirstName', data.firstName);
        localStorage.setItem('googleLastName', data.lastName);
        localStorage.setItem('googleRole', 'Professional');
        navigate('/complete-profile');
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('fullName', data.fullName);
        localStorage.setItem('firstName', data.firstName);
        localStorage.setItem('lastName', data.lastName);
        navigate('/dashboard');
      }
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Google sign-up failed.' });
    } finally {
      setLoading(false);
    }
  };

  // Add language
  const addLanguage = () => {
    if (newLanguage.trim() && !formData.languages.includes(newLanguage.trim())) {
      setFormData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage.trim()]
      }));
      setNewLanguage('');
    }
  };

  // Remove language
  const removeLanguage = (lang) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== lang)
    }));
  };

  // Handle professional links
  const handleLinkChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      professionalLinks: {
        ...prev.professionalLinks,
        [type]: value
      }
    }));
  };

  // Complete registration
  const handleCompleteRegistration = async (e) => {
    e.preventDefault();
    
    const eObj = {};
    if (!formData.firstName.trim()) eObj.firstName = 'First name is required';
    if (!formData.lastName.trim()) eObj.lastName = 'Last name is required';
    if (!formData.password) eObj.password = 'Password is required';
    else if (formData.password.length < 8) eObj.password = 'Password must be at least 8 characters';
    else if (!pwdChecks.uppercase) eObj.password = 'Password must include an uppercase letter';
    else if (!pwdChecks.lowercase) eObj.password = 'Password must include a lowercase letter';
    else if (!pwdChecks.special) eObj.password = 'Password must include a special character';
    if (formData.password !== formData.confirmPassword) eObj.confirmPassword = 'Passwords do not match';
    if (!formData.specialization) eObj.specialization = 'Specialization is required';
    if (!formData.bio) eObj.bio = 'Bio is required';
    if (!formData.yearsOfExperience) eObj.yearsOfExperience = 'Years of experience is required';
    if (!formData.licenseNumber) eObj.licenseNumber = 'License/Certification number is required';
    
    if (Object.keys(eObj).length > 0) {
      setErrors(eObj);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      const payload = { ...formData, isGoogleUser: false };
      const response = await API.post('/auth/complete-registration', payload);
      const data = response.data;
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('fullName', data.fullName);
      localStorage.setItem('firstName', data.firstName);
      localStorage.setItem('lastName', data.lastName);
      
      navigate('/dashboard');
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Registration failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const inputStyle = (hasError) => ({
    width: '100%', padding: '13px 16px',
    border: `1.5px solid ${hasError ? '#e53e3e' : 'var(--border)'}`,
    borderRadius: 10, fontSize: 14,
    background: 'var(--bg-card)', color: 'var(--text-primary)',
    outline: 'none', fontFamily: 'inherit'
  });

  const labelStyle = {
    display: 'block', fontSize: 13, fontWeight: 500,
    color: 'var(--text-secondary)', marginBottom: 6
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ position: 'absolute', top: 20, right: 24 }}>
        <button onClick={toggle} className={`theme-toggle ${dark ? 'dark' : ''}`} type="button">
          <div className="theme-toggle-thumb" />
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 700, background: 'var(--bg-card)', borderRadius: 20, border: '1.5px solid var(--border)', padding: '40px 36px', boxShadow: 'var(--shadow)', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>{config.icon}</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: config.color, margin: 0 }}>
            Professional Registration
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            Join as a Professional to help others
          </p>
        </div>

        {/* Step 1: Choose sign-up method */}
        {step === 1 && (
          <>
            <div style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErrors({ submit: 'Google sign-up failed.' })}
                useOneTap={false}
                text="signup_with"
                shape="rectangular"
                width="400"
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <button
              onClick={() => setStep(2)}
              style={{
                width: '100%', padding: '14px', fontSize: 15, fontWeight: 600,
                background: 'transparent', color: config.color,
                border: `2px solid ${config.color}`, borderRadius: 10,
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Sign up with Email
            </button>

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login/professional" style={{ color: config.color, fontWeight: 500 }}>
                Sign In
              </Link>
            </div>
          </>
        )}

        {/* Step 2A: Enter Email (before code is sent) */}
        {step === 2 && !isCodeSent && (
          <form onSubmit={handleSendCode}>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle(errors.email)}
                required
                autoFocus
              />
              {errors.email && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.email}</p>}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                We'll send a 6-digit verification code to this email
              </p>
            </div>

            {errors.submit && (
              <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {errors.submit}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 600, background: config.color, color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {/* Step 2B: Enter Verification Code (after code is sent) */}
        {step === 2 && isCodeSent && (
          <form onSubmit={handleVerifyCode}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Verification Code</label>
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={inputStyle(errors.code)}
                maxLength={6}
                required
                autoFocus
              />
              {errors.code && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.code}</p>}
              
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Code sent to: <strong>{email}</strong>
                </p>
                {countdown > 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Resend available in {countdown} seconds
                  </p>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleSendCode} 
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: config.color, 
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 500,
                      textDecoration: 'underline'
                    }}
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 600, background: config.color, color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Verifying...' : 'Verify Email & Continue'}
            </button>
          </form>
        )}

        {/* Step 3: Complete Profile */}
        {step === 3 && (
          <form onSubmit={handleCompleteRegistration}>
            {errors.submit && (
              <div style={{ background: '#FCEBEB', color: '#791F1F', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
                {errors.submit}
              </div>
            )}

            <div style={{ 
              background: 'rgba(156,39,176,0.1)', 
              padding: '10px 14px', 
              borderRadius: 8, 
              marginBottom: 20,
              fontSize: 13,
              color: config.color,
              border: `1px solid ${config.color}`
            }}>
              ✓ Email verified: <strong>{formData.email}</strong>
            </div>

            {/* Basic Information */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, marginTop: 8 }}>
              Basic Information
            </h3>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>First Name *</label>
                <input 
                  name="firstName" 
                  placeholder="First name" 
                  value={formData.firstName} 
                  onChange={handleChange} 
                  style={inputStyle(errors.firstName)} 
                />
                {errors.firstName && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.firstName}</p>}
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Last Name *</label>
                <input 
                  name="lastName" 
                  placeholder="Last name" 
                  value={formData.lastName} 
                  onChange={handleChange} 
                  style={inputStyle(errors.lastName)} 
                />
                {errors.lastName && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.lastName}</p>}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Phone Number</label>
              <input 
                name="phoneNumber" 
                placeholder="e.g., 0712345678" 
                value={formData.phoneNumber} 
                onChange={handleChange} 
                style={inputStyle(false)} 
              />
            </div>

            {/* Professional Information */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, marginTop: 24 }}>
              Professional Information
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Specialization *</label>
              <input 
                name="specialization" 
                placeholder="e.g., Cognitive Behavioural Therapy, Clinical Psychology" 
                value={formData.specialization} 
                onChange={handleChange} 
                style={inputStyle(errors.specialization)} 
              />
              {errors.specialization && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.specialization}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>License/Certification Number *</label>
              <input 
                name="licenseNumber" 
                placeholder="e.g., KMPDC-2024-12345" 
                value={formData.licenseNumber} 
                onChange={handleChange} 
                style={inputStyle(errors.licenseNumber)} 
              />
              {errors.licenseNumber && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.licenseNumber}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Years of Experience *</label>
              <select
                name="yearsOfExperience"
                value={formData.yearsOfExperience}
                onChange={handleChange}
                style={inputStyle(errors.yearsOfExperience)}
              >
                <option value="">Select years of experience</option>
                <option value="0-1">Less than 1 year</option>
                <option value="1-3">1-3 years</option>
                <option value="3-5">3-5 years</option>
                <option value="5-10">5-10 years</option>
                <option value="10+">10+ years</option>
              </select>
              {errors.yearsOfExperience && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.yearsOfExperience}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Bio *</label>
              <textarea 
                name="bio" 
                placeholder="Tell clients about your experience, approach, and what makes you unique..." 
                value={formData.bio} 
                onChange={handleChange} 
                rows={4} 
                style={{ ...inputStyle(errors.bio), resize: 'vertical' }} 
              />
              {errors.bio && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.bio}</p>}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Education & Qualifications</label>
              <textarea 
                name="education" 
                placeholder="e.g., MSc Clinical Psychology - University of Nairobi (2018)&#10;BSc Psychology - Kenyatta University (2014)" 
                value={formData.education} 
                onChange={handleChange} 
                rows={3} 
                style={{ ...inputStyle(false), resize: 'vertical' }} 
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Certifications & Awards</label>
              <textarea 
                name="certifications" 
                placeholder="e.g., Certified CBT Practitioner - Beck Institute (2020)&#10;Best Mental Health Professional Award 2023" 
                value={formData.certifications} 
                onChange={handleChange} 
                rows={3} 
                style={{ ...inputStyle(false), resize: 'vertical' }} 
              />
            </div>

            {/* Professional Portfolio Links */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, marginTop: 24 }}>
              Professional Portfolio Links
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
              Add links where clients can view your credentials, reviews, and professional background
            </p>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>LinkedIn Profile</label>
              <input 
                placeholder="https://linkedin.com/in/your-profile" 
                value={formData.professionalLinks.linkedin} 
                onChange={(e) => handleLinkChange('linkedin', e.target.value)} 
                style={inputStyle(false)} 
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Professional Website/Portfolio</label>
              <input 
                placeholder="https://yourwebsite.com" 
                value={formData.professionalLinks.website} 
                onChange={(e) => handleLinkChange('website', e.target.value)} 
                style={inputStyle(false)} 
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Credentials/Reviews Portal</label>
              <input 
                placeholder="e.g., https://psychologytoday.com/profile/123" 
                value={formData.professionalLinks.portfolio} 
                onChange={(e) => handleLinkChange('portfolio', e.target.value)} 
                style={inputStyle(false)} 
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Link to a page with your certificates, client reviews, or professional portfolio
              </p>
            </div>

            {/* Languages Spoken */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Languages Spoken</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <input 
                  placeholder="e.g., English, Swahili" 
                  value={newLanguage} 
                  onChange={(e) => setNewLanguage(e.target.value)} 
                  style={{ ...inputStyle(false), flex: 1 }} 
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                />
                <button 
                  type="button" 
                  onClick={addLanguage}
                  style={{ padding: '0 16px', background: config.color, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {formData.languages.map(lang => (
                  <span key={lang} style={{ background: 'rgba(156,39,176,0.1)', color: config.color, padding: '4px 10px', borderRadius: 16, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {lang}
                    <button type="button" onClick={() => removeLanguage(lang)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, color: config.color }}>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Password Section */}
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16, marginTop: 24 }}>
              Account Security
            </h3>

            <div style={{ marginBottom: 8 }}>
              <label style={labelStyle}>Create Password *</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password" 
                  placeholder="Create a strong password" 
                  value={formData.password} 
                  onChange={handleChange} 
                  style={{ ...inputStyle(errors.password), paddingRight: 44 }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(v => !v)}
                  style={{ 
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 17,
                    color: 'var(--text-muted)', padding: 0, width: 'auto'
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.password}</p>}
            </div>

            {formData.password && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pwdStrength?.width || '0%', background: pwdStrength?.color || 'var(--border)', borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: pwdStrength?.color }}>{pwdStrength?.text}</span>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { key: 'length', label: '8+' }, 
                      { key: 'uppercase', label: 'A-Z' }, 
                      { key: 'lowercase', label: 'a-z' }, 
                      { key: 'special', label: '!@#' }
                    ].map(r => (
                      <span key={r.key} style={{ fontSize: 11, color: pwdChecks[r.key] ? '#48bb78' : 'var(--text-muted)' }}>
                        {pwdChecks[r.key] ? '✓' : '○'} {r.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Confirm Password *</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  name="confirmPassword" 
                  placeholder="Confirm your password" 
                  value={formData.confirmPassword} 
                  onChange={handleChange} 
                  style={{ ...inputStyle(errors.confirmPassword), paddingRight: 44 }} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowConfirmPassword(v => !v)}
                  style={{ 
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 17,
                    color: 'var(--text-muted)', padding: 0, width: 'auto'
                  }}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.confirmPassword && <p style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.confirmPassword}</p>}
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px', fontSize: 15, fontWeight: 600, background: config.color, color: 'white', border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}