import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

const questions = [
  { id: 'q1',  category: 'Anxiety',    text: 'How often do you feel nervous, anxious or on edge without a clear reason?' },
  { id: 'q2',  category: 'Anxiety',    text: 'How often are you unable to stop or control your worrying?' },
  { id: 'q3',  category: 'Anxiety',    text: 'How often does your heart race or do you experience physical tension when nothing alarming is happening?' },
  { id: 'q4',  category: 'Anxiety',    text: 'How often do you avoid situations or people because they make you feel anxious?' },
  { id: 'q5',  category: 'Anxiety',    text: 'How difficult is it for you to relax even when you have time to do so?' },
  { id: 'q6',  category: 'Depression', text: 'How often do you feel little interest or pleasure in things you used to enjoy?' },
  { id: 'q7',  category: 'Depression', text: 'How often do you feel down, hopeless or empty inside?' },
  { id: 'q8',  category: 'Depression', text: 'How often do you feel so tired that even small tasks feel like too much effort?' },
  { id: 'q9',  category: 'Depression', text: 'How often do you feel like a burden to the people around you?' },
  { id: 'q10', category: 'Depression', text: 'How often do you have trouble concentrating on everyday tasks like work, reading or conversations?' },
  { id: 'q11', category: 'Loneliness', text: 'How often do you feel lonely or disconnected from the people around you?' },
  { id: 'q12', category: 'Loneliness', text: 'How often do you feel like no one truly understands you?' },
  { id: 'q13', category: 'Loneliness', text: 'How often do you feel left out or excluded from social situations?' },
  { id: 'q14', category: 'Loneliness', text: 'How often do you find it difficult to reach out to others when you need support?' },
  { id: 'q15', category: 'Loneliness', text: 'How often do you feel that your relationships lack depth or meaning?' },
];

const scaleLabels = {
  1: 'Never',
  2: 'Rarely',
  3: 'Sometimes',
  4: 'Often',
  5: 'Always'
};

const categoryColors = {
  Anxiety:    { bg: 'var(--info-bg)', text: 'var(--info-text)', bar: '#7F77DD', icon: '😰' },
  Depression: { bg: 'var(--success-bg)', text: 'var(--success-text)', bar: '#1D9E75', icon: '😔' },
  Loneliness: { bg: 'var(--warning-bg)', text: 'var(--warning-text)', bar: '#D85A30', icon: '🫂' },
};

const levelColors = {
  Good:     { bg: 'var(--success-bg)', text: 'var(--success-text)', icon: '😊' },
  Mild:     { bg: 'var(--warning-bg)', text: 'var(--warning-text)', icon: '😐' },
  Moderate: { bg: 'var(--warning-bg)', text: 'var(--warning-text)', icon: '😟' },
  Severe:   { bg: 'var(--error-bg)', text: 'var(--error-text)', icon: '😰' },
};

export default function Assessment() {
  const navigate = useNavigate();
  const [step, setStep] = useState('consent');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [hasAssessments, setHasAssessments] = useState(false);

  useEffect(() => {
    fetchAssessmentHistory();
  }, []);

  const fetchAssessmentHistory = async () => {
    try {
      const response = await API.get('/selfassessment/history');
      console.log('Assessment history response:', response.data);
      
      // Check if we have assessments (array with length > 0)
      const hasHistory = response.data && Array.isArray(response.data) && response.data.length > 0;
      setHasAssessments(hasHistory);
      setAssessmentHistory(response.data || []);
      
      console.log('Has assessments:', hasHistory);
      console.log('Number of assessments:', response.data?.length || 0);
    } catch (err) {
      console.error('Failed to fetch assessment history:', err);
      setHasAssessments(false);
      setAssessmentHistory([]);
    }
  };

  const handleAnswer = (value) => {
    const qId = questions[currentQ].id;
    setAnswers(prev => ({ ...prev, [qId]: value }));
    setError('');
  };

  const handleNext = () => {
    if (!answers[questions[currentQ].id]) {
      setError('Please select an answer before continuing.');
      return;
    }
    setError('');
    if (currentQ < questions.length - 1) {
      setCurrentQ(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setStep('loading');
    try {
      const payload = {};
      questions.forEach(q => { payload[q.id] = answers[q.id]; });
      const response = await API.post('/selfassessment/submit', payload);
      
      const resourcesResponse = await API.get('/resource/recommended');
      
      setResult({
        ...response.data,
        recommendedResources: resourcesResponse.data.resources || []
      });
      setStep('results');
      
      // Refresh history after new assessment
      await fetchAssessmentHistory();
    } catch (err) {
      console.error('Error submitting assessment:', err);  
      setError('Something went wrong. Please try again.');
      setStep('questions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistory = () => {
    if (hasAssessments && assessmentHistory.length > 0) {
      navigate('/assessment-history');
    } else {
      // Show a more helpful message
      alert('No assessment history found. Please complete at least one assessment first to view your history.');
    }
  };

  const progress = Math.round(((currentQ + 1) / questions.length) * 100);
  const currentCategory = questions[currentQ]?.category;
  //const catColor = categoryColors[currentCategory] || {};

  const getTrendIcon = (current, previous) => {
    if (!previous) return '🆕';
    if (current < previous) return '📉';
    if (current > previous) return '📈';
    return '➡️';
  };

  const getTrendColor = (current, previous) => {
    if (!previous) return 'var(--text-muted)';
    if (current < previous) return 'var(--success-text)';
    if (current > previous) return 'var(--error-text)';
    return 'var(--text-muted)';
  };

  // Consent Screen
  if (step === 'consent') return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Mental Health Assessment
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
              Take a moment to check in with yourself
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            {/* View History Button - Always Visible */}
            <button
              onClick={handleViewHistory}
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                border: '1.5px solid var(--accent)',
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: 10,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--accent)';
              }}
            >
              📊 View History
              {hasAssessments && assessmentHistory.length > 0 && (
                <span style={{
                  background: 'var(--accent)',
                  color: 'white',
                  borderRadius: 12,
                  padding: '2px 8px',
                  fontSize: 11,
                  marginLeft: 4
                }}>
                  {assessmentHistory.length}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
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
                e.currentTarget.style.borderColor = 'var(--accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              ← Back
            </button>
          </div>
        </div>
        <div style={{ height: 3, width: 60, background: 'var(--gradient-primary)', marginTop: 16, borderRadius: 3 }} />
      </div>

      {/* Main Card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: 32,
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Welcome Section */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🧠</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Welcome to Your Wellness Check-in
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: 14 }}>
            Understanding your mental wellbeing is the first step toward healing
          </p>
        </div>

        {/* Important Notice */}
        <div style={{
          background: 'var(--warning-bg)',
          borderRadius: 12,
          padding: '16px 20px',
          marginBottom: 28,
          borderLeft: `4px solid var(--warning-text)`
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <p style={{ fontSize: 13, color: 'var(--warning-text)', margin: 0, lineHeight: 1.6 }}>
              <strong>Important notice:</strong> This self-assessment is a <strong>screening tool only</strong> and does <strong>not</strong> constitute a medical diagnosis. Results are intended to help you understand your wellbeing and find relevant resources. Please consult a qualified mental health professional for clinical advice.
            </p>
          </div>
        </div>

        {/* What to Expect Section */}
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
            What to expect:
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 24 }}>📝</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>15 Questions</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Across 3 wellness areas</p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 24 }}>⭐</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Scale 1-5</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>From Never to Always</p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 24 }}>🔒</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Secure & Private</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Only visible to you and your professional</p>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 24 }}>📊</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Track Progress</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Retake anytime to see improvement</p>
              </div>
            </div>
          </div>
        </div>

        {/* Button */}
        <button 
          onClick={() => setStep('questions')} 
          style={{
            width: '100%',
            padding: '14px',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#5a52d5'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
        >
          Begin Assessment →
        </button>
      </div>
    </div>
  );

  // Loading Screen
  if (step === 'loading') return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 50, height: 50, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-secondary)' }}>Analysing your responses...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // Questions Screen
  if (step === 'questions') return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
      {/* Progress Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Question {currentQ + 1} of {questions.length}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {currentCategory}
            </p>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>{progress}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: progress + '%', background: 'var(--gradient-primary)', borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Question Card */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 16,
        border: '1px solid var(--border)',
        padding: 28,
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 20
      }}>
        <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 28 }}>
          {questions[currentQ].text}
        </p>

        {/* Answer Options */}
        <div style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map(val => {
            const isSelected = answers[questions[currentQ].id] === val;
            return (
              <button
                key={val}
                onClick={() => handleAnswer(val)}
                style={{
                  width: '100%',
                  marginBottom: 10,
                  background: isSelected ? 'var(--accent)' : 'var(--bg-card)',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  textAlign: 'left',
                  borderRadius: 12,
                  cursor: 'pointer',
                  fontSize: 14,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }
                }}
              >
                <span style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0
                }}>
                  {val}
                </span>
                <span style={{ flex: 1 }}>{scaleLabels[val]}</span>
                {isSelected && <span style={{ fontSize: 16 }}>✓</span>}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ background: 'var(--error-bg)', color: 'var(--error-text)', padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          {currentQ > 0 && (
            <button 
              onClick={handleBack} 
              style={{
                flex: 1,
                padding: '12px',
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--accent)';
              }}
            >
              ← Back
            </button>
          )}
          <button 
            onClick={handleNext} 
            disabled={loading}
            style={{
              flex: 2,
              padding: '12px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = '#5a52d5';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--accent)';
            }}
          >
            {currentQ === questions.length - 1 ? 'Submit Assessment' : 'Next Question →'}
          </button>
        </div>
      </div>
    </div>
  );

  // Results Screen
  if (step === 'results' && result) return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              Your Results
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, marginBottom: 0 }}>
              Completed on {new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              onClick={handleViewHistory}
              style={{
                background: 'transparent',
                color: 'var(--accent)',
                border: '1px solid var(--accent)',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: 8,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--accent)';
              }}
            >
              📊 View Full History
              {hasAssessments && assessmentHistory.length > 0 && (
                <span style={{ marginLeft: 6 }}>({assessmentHistory.length})</span>
              )}
            </button>
          </div>
        </div>
        <div style={{ height: 3, width: 60, background: 'var(--gradient-primary)', marginTop: 16, borderRadius: 3 }} />
      </div>

      {/* Results Card - Keep existing results display */}
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 20,
        border: '1px solid var(--border)',
        padding: 32,
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Crisis Alert */}
        {result.crisisSupport && (
          <div style={{
            background: 'var(--error-bg)',
            borderRadius: 12,
            padding: '20px',
            marginBottom: 28,
            textAlign: 'center',
            border: '1px solid var(--error-text)'
          }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>⚠️</span>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--error-text)', marginBottom: 12 }}>
              We're Here for You
            </h3>
            <p style={{ fontSize: 14, color: 'var(--error-text)', marginBottom: 16, lineHeight: 1.6 }}>
              Your results suggest you may be experiencing significant distress. <strong>You don't have to go through this alone.</strong>
            </p>
            <div style={{ background: 'white', borderRadius: 10, padding: '16px' }}>
              <p style={{ fontSize: 13, marginBottom: 8 }}>📞 <strong>24/7 Crisis Support Hotline</strong></p>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--error-text)', margin: 0 }}>0800 723 253</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Befrienders Kenya - Free, confidential support</p>
            </div>
          </div>
        )}

        {/* Score Overview */}
        <div style={{ textAlign: 'center', marginBottom: 28, padding: '20px', background: 'var(--bg-secondary)', borderRadius: 16 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Overall Wellbeing Score</p>
          <div style={{ fontSize: 52, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            {result.overallScore}<span style={{ fontSize: 20, color: 'var(--text-muted)' }}>/5</span>
          </div>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 20px',
            borderRadius: 30,
            fontSize: 14,
            fontWeight: 600,
            background: levelColors[result.overallLevel]?.bg,
            color: levelColors[result.overallLevel]?.text
          }}>
            {levelColors[result.overallLevel]?.icon} {result.overallLevel}
          </span>
        </div>

        {/* Category Breakdown */}
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Category Breakdown</h3>
        {['Anxiety', 'Depression', 'Loneliness'].map(cat => {
          const scoreKey = cat.toLowerCase() + 'Score';
          const levelKey = cat.toLowerCase() + 'Level';
          const score = result[scoreKey];
          const level = result[levelKey];
          const color = categoryColors[cat];
          const barWidth = Math.round((score / 5) * 100);
          
          const previousAssessment = assessmentHistory[1];
          const previousScore = previousAssessment?.[scoreKey];
          const trendIcon = getTrendIcon(score, previousScore);
          const trendColor = getTrendColor(score, previousScore);
          
          return (
            <div key={cat} style={{ marginBottom: 16, padding: '16px', borderRadius: 12, background: color.bg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{color.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: color.text }}>{cat}</span>
                  {previousScore && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: trendColor }}>{trendIcon} {previousScore}/5</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: color.text }}>{score}/5</span>
                  <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: levelColors[level]?.bg, color: levelColors[level]?.text }}>{level}</span>
                </div>
              </div>
              <div style={{ height: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: barWidth + '%', background: color.bar, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}

        {/* Primary Concern */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: '16px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>🎯 Primary Area of Concern</p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{result.resultSummary}</p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={{
              flex: 1,
              padding: '12px',
              background: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#5a52d5'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
          >
            Go to Dashboard
          </button>
          <button 
            onClick={() => { setStep('consent'); setCurrentQ(0); setAnswers({}); setResult(null); }} 
            style={{
              flex: 1,
              padding: '12px',
              background: 'transparent',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--accent)';
            }}
          >
            Retake Assessment
          </button>
        </div>
      </div>
    </div>
  );

  return null;
}