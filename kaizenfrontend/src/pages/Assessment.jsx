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

const scaleLabels = { 1: 'Never', 2: 'Rarely', 3: 'Sometimes', 4: 'Often', 5: 'Always' };

const PINK   = '#e91e8c';
const PURPLE = '#9c27b0';

const categoryColors = {
  Anxiety:    { bg: 'rgba(233,30,140,0.1)',  text: PINK,   bar: PINK,   icon: '😰' },
  Depression: { bg: 'rgba(156,39,176,0.1)',  text: PURPLE, bar: PURPLE, icon: '😔' },
  Loneliness: { bg: 'rgba(103,58,183,0.1)',  text: '#673ab7', bar: '#673ab7', icon: '🫂' },
};

const levelColors = {
  Good:     { bg: '#d1fae5', text: '#065f46', icon: '😊' },
  Mild:     { bg: '#fef3c7', text: '#92400e', icon: '😐' },
  Moderate: { bg: '#fed7aa', text: '#9a3412', icon: '😟' },
  Severe:   { bg: '#fee2e2', text: '#dc2626', icon: '😰' },
};

const typeIcons = {
  Article:  '📄', Video: '🎥', Guide: '📘',
  Exercise: '🧘', Podcast: '🎙️', Audio: '🎧',
};

export default function Assessment() {
  const navigate = useNavigate();
  const [step, setStep]                       = useState('consent');
  const [currentQ, setCurrentQ]               = useState(0);
  const [answers, setAnswers]                 = useState({});
  const [result, setResult]                   = useState(null);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');
  const [assessmentHistory, setAssessmentHistory] = useState([]);
  const [ setHasCompletedAssessment] = useState(false);

  useEffect(() => { 
    fetchAssessmentHistory();
    checkIfHasCompleted();
  }, []);

  const checkIfHasCompleted = async () => {
    try {
      const res = await API.get('/selfassessment/has-completed');
      setHasCompletedAssessment(res.data.hasCompleted);
    } catch (err) {
      console.error('Failed to check assessment status:', err);
    }
  };

  const fetchAssessmentHistory = async () => {
    try {
      const res = await API.get('/selfassessment/my-history');
      setAssessmentHistory(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAssessmentHistory([]);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleAnswer = (value) => {
    setAnswers(prev => ({ ...prev, [questions[currentQ].id]: value }));
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

  const handleBack = () => { if (currentQ > 0) setCurrentQ(prev => prev - 1); };

  const handleSubmit = async () => {
    setLoading(true);
    setStep('loading');
    try {
      const payload = {};
      questions.forEach(q => { payload[q.id] = answers[q.id]; });
      const res = await API.post('/selfassessment/submit', payload);
      setResult(res.data);
      setStep('results');
      fetchAssessmentHistory();
    } catch (err) {
      setError(err.response?.data || 'Something went wrong. Please try again.');
      setStep('questions');
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.round(((currentQ + 1) / questions.length) * 100);

  const getTrendIcon  = (cur, prev) => !prev ? '🆕' : cur < prev ? '📉' : cur > prev ? '📈' : '➡️';
  const getTrendColor = (cur, prev) => !prev ? '#6b7280' : cur < prev ? '#065f46' : cur > prev ? '#dc2626' : '#6b7280';

  /* ══════════════════════════════════════════
     CONSENT SCREEN
  ══════════════════════════════════════════ */
  if (step === 'consent') return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
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
            {assessmentHistory.length > 0 && (
              <button
                onClick={() => navigate('/assessment-history')}
                style={{ background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => { e.currentTarget.style.background = PINK; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PINK; }}
              >
                📊 View History
                <span style={{ background: PINK, color: 'white', borderRadius: 12, padding: '2px 8px', fontSize: 11 }}>
                  {assessmentHistory.length}
                </span>
              </button>
            )}
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1.5px solid var(--border)', padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer', borderRadius: 10 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ← Back
            </button>
          </div>
        </div>
        <div style={{ height: 3, width: 60, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, marginTop: 16, borderRadius: 3 }} />
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 32, boxShadow: 'var(--shadow)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🧠</div>
          <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
            Welcome to Your Wellness Check-in
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: 14 }}>
            Understanding your mental wellbeing is the first step toward healing
          </p>
        </div>

        <div style={{ background: 'rgba(237,137,54,0.1)', borderRadius: 12, padding: '16px 20px', marginBottom: 28, borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.6 }}>
              <strong>Important notice:</strong> This self-assessment is a <strong>screening tool only</strong> and does <strong>not</strong> constitute a medical diagnosis. Results are intended to help you understand your wellbeing and find relevant resources. Please consult a qualified mental health professional for clinical advice.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { icon: '📝', title: '15 Questions',        sub: 'Across 3 wellness areas' },
            { icon: '⭐', title: 'Scale 1–5',           sub: 'From Never to Always' },
            { icon: '🔒', title: 'Secure & Private',    sub: 'Only visible to you' },
            { icon: '📊', title: 'Track Progress',      sub: 'Retake anytime to see improvement' },
          ].map(c => (
            <div key={c.title} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg-hover)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 24 }}>{c.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{c.title}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleSkip}
            style={{ flex: 1, padding: '14px', background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = PINK; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PINK; }}
          >
            Skip for Now
          </button>
          <button
            onClick={() => setStep('questions')}
            style={{ flex: 2, padding: '14px', background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
          >
            Begin Assessment →
          </button>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════
     LOADING SCREEN
  ══════════════════════════════════════════ */
  if (step === 'loading') return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 50, height: 50, border: '3px solid var(--border)', borderTopColor: PINK, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)' }}>Analysing your responses…</p>
        <style>{`@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════
     QUESTIONS SCREEN
  ══════════════════════════════════════════ */
  if (step === 'questions') return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
              Question {currentQ + 1} of {questions.length}
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {questions[currentQ].category}
            </p>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: PINK }}>{progress}%</span>
        </div>
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border)', padding: 28, boxShadow: 'var(--shadow)' }}>
        <p style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 28 }}>
          {questions[currentQ].text}
        </p>

        <div style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map(val => {
            const isSelected = answers[questions[currentQ].id] === val;
            return (
              <button
                key={val}
                onClick={() => handleAnswer(val)}
                style={{
                  width: '100%', marginBottom: 10,
                  background: isSelected ? `linear-gradient(135deg, ${PINK}, ${PURPLE})` : 'var(--bg-card)',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  border: isSelected ? `2px solid ${PINK}` : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', textAlign: 'left', borderRadius: 12,
                  cursor: 'pointer', fontSize: 14, transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = PINK; } }}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)'; } }}
              >
                <span style={{ width: 32, height: 32, borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                  {val}
                </span>
                <span style={{ flex: 1 }}>{scaleLabels[val]}</span>
                {isSelected && <span style={{ fontSize: 16 }}>✓</span>}
              </button>
            );
          })}
        </div>

        {error && (
          <div style={{ background: 'rgba(233,30,140,0.1)', color: PINK, padding: '12px 16px', borderRadius: 10, marginBottom: 20, fontSize: 13, border: `1px solid ${PINK}` }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          {currentQ > 0 && (
            <button
              onClick={handleBack}
              style={{ flex: 1, padding: '12px', background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = PINK; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PINK; }}
            >
              ← Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={loading}
            style={{ flex: 2, padding: '12px', background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
          >
            {currentQ === questions.length - 1 ? 'Submit Assessment' : 'Next Question →'}
          </button>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════
     RESULTS SCREEN
  ══════════════════════════════════════════ */
  if (step === 'results' && result) {
    const resources    = result.recommendedResources || [];
    const hasResources = resources.length > 0;

    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                Your Results
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
                Completed on {new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })}
              </p>
            </div>
            {assessmentHistory.length > 0 && (
              <button
                onClick={() => navigate('/assessment-history')}
                style={{ background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 8 }}
                onMouseEnter={e => { e.currentTarget.style.background = PINK; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PINK; }}
              >
                📊 View Full History ({assessmentHistory.length})
              </button>
            )}
          </div>
          <div style={{ height: 3, width: 60, background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, marginTop: 16, borderRadius: 3 }} />
        </div>

        <div style={{ background: 'var(--bg-card)', borderRadius: 20, border: '1px solid var(--border)', padding: 32, boxShadow: 'var(--shadow)' }}>

          {/* ── CRISIS BANNER ── */}
          {result.crisisSupport && (
            <div style={{ background: '#fee2e2', borderRadius: 16, padding: 24, marginBottom: 28, border: '2px solid #dc2626' }}>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 40 }}>⚠️</span>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', margin: '8px 0' }}>
                  We're Here for You
                </h3>
                <p style={{ fontSize: 14, color: '#991b1b', lineHeight: 1.6, margin: 0 }}>
                  Your results suggest you may be experiencing significant distress.
                  <strong> You don't have to go through this alone.</strong>
                </p>
              </div>
              <div style={{ background: 'white', borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid #fecaca' }}>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
                  📞 <strong>24/7 Free Crisis Support</strong>
                </p>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#dc2626', margin: '4px 0', letterSpacing: 1 }}>
                  0800 723 253
                </p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '8px 0 4px' }}>
                  Befrienders Kenya
                </p>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                  Free, confidential, available 24 hours a day
                </p>
              </div>
            </div>
          )}

          {/* ── OVERALL SCORE ── */}
          <div style={{ textAlign: 'center', marginBottom: 28, padding: 24, background: 'var(--bg-hover)', borderRadius: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Overall Wellbeing Score</p>
            <div style={{ fontSize: 52, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {result.overallScore}<span style={{ fontSize: 20, color: 'var(--text-muted)' }}>/5</span>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 30, fontSize: 14, fontWeight: 600,
              background: levelColors[result.overallLevel]?.bg,
              color:      levelColors[result.overallLevel]?.text
            }}>
              {levelColors[result.overallLevel]?.icon} {result.overallLevel}
            </span>
          </div>

          {/* ── CATEGORY BREAKDOWN ── */}
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Category Breakdown</h3>
          {['Anxiety', 'Depression', 'Loneliness'].map(cat => {
            const scoreKey = cat.toLowerCase() + 'Score';
            const levelKey = cat.toLowerCase() + 'Level';
            const score    = result[scoreKey];
            const level    = result[levelKey];
            const color    = categoryColors[cat];
            const barWidth = Math.round((score / 5) * 100);
            const prevScore = assessmentHistory[1]?.[scoreKey];
            const isPrimary = result.primaryConcern === cat;

            return (
              <div key={cat} style={{
                marginBottom: 14, padding: 16, borderRadius: 12,
                background: color.bg,
                border: isPrimary ? `2px solid ${color.bar}` : '1.5px solid transparent'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{color.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: color.text }}>{cat}</span>
                    {isPrimary && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: color.bar, color: 'white', fontWeight: 600 }}>
                        Primary concern
                      </span>
                    )}
                    {prevScore && (
                      <span style={{ marginLeft: 4, fontSize: 11, color: getTrendColor(score, prevScore) }}>
                        {getTrendIcon(score, prevScore)} prev: {prevScore}/5
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: color.text }}>{score}/5</span>
                    <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: levelColors[level]?.bg, color: levelColors[level]?.text, fontWeight: 500 }}>
                      {level}
                    </span>
                  </div>
                </div>
                <div style={{ height: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${barWidth}%`, background: color.bar, borderRadius: 4, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}

          {/* ── SUMMARY ── */}
          <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: 16, marginBottom: 28 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              🎯 Primary Area of Concern: <span style={{ color: PINK }}>{result.primaryConcern}</span>
            </p>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {result.resultSummary}
            </p>
          </div>

          {/* ── RECOMMENDED RESOURCES ── */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid var(--border)` }}>
              <div style={{ width: 4, height: 28, background: `linear-gradient(180deg, ${PINK}, ${PURPLE})`, borderRadius: 2 }} />
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Recommended For You
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                  {hasResources
                    ? `${resources.length} resource${resources.length !== 1 ? 's' : ''} matched to your primary concern: ${result.primaryConcern}`
                    : 'Resources from our professionals'}
                </p>
              </div>
            </div>

            {hasResources ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {resources.map((resource, idx) => (
                  <div
                    key={resource.id ?? idx}
                    style={{
                      background: 'var(--bg-hover)', borderRadius: 14,
                      border: resource.isExactMatch
                        ? `1.5px solid ${PINK}`
                        : '1.5px solid var(--border)',
                      padding: 20, transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = PINK}
                    onMouseLeave={e => e.currentTarget.style.borderColor = resource.isExactMatch ? PINK : 'var(--border)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ fontSize: 36, flexShrink: 0 }}>
                        {typeIcons[resource.type] || resource.icon || '📖'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                          <h4 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                            {resource.title}
                          </h4>
                          {resource.type && (
                            <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                              {resource.type}
                            </span>
                          )}
                          {resource.isExactMatch && (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(233,30,140,0.12)', color: PINK, fontWeight: 600, border: `1px solid ${PINK}` }}>
                              ✓ {resource.category}
                            </span>
                          )}
                        </div>

                        {resource.description && (
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
                            {resource.description}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {resource.uploadedBy && (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                👩‍⚕️ {resource.uploadedBy}
                              </span>
                            )}
                            {resource.averageRating > 0 && (
                              <span style={{ fontSize: 12, color: '#f6ad55' }}>
                                ★ {Number(resource.averageRating).toFixed(1)}
                                <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                                  ({resource.totalRatings})
                                </span>
                              </span>
                            )}
                          </div>

                          {resource.url && resource.url !== '#' && (
                            <button
                              onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
                              style={{
                                padding: '8px 18px',
                                background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`,
                                color: 'white', border: 'none', borderRadius: 8,
                                fontSize: 13, fontWeight: 500, cursor: 'pointer'
                              }}
                            >
                              View Resource →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: 40, background: 'var(--bg-hover)', borderRadius: 16, textAlign: 'center', border: '2px dashed var(--border)' }}>
                <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>📭</span>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  No Resources Uploaded Yet
                </h3>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>
                  No resources have been uploaded yet for <strong>{result.primaryConcern}</strong>.
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
                  Professionals on the platform will add resources soon. Meanwhile, consider booking a session.
                </p>
                <button
                  onClick={() => navigate('/sessions')}
                  style={{ padding: '10px 24px', background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  Book a Session →
                </button>
              </div>
            )}
          </div>

          {/* ── DISCLAIMER ── */}
          {result.disclaimer && (
            <div style={{ background: 'rgba(156,39,176,0.08)', borderRadius: 10, padding: 14, marginBottom: 24, fontSize: 12, color: PURPLE, textAlign: 'center', border: `1px solid rgba(156,39,176,0.2)` }}>
              ℹ️ {result.disclaimer}
            </div>
          )}

          {/* ── CTA BUTTONS ── */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ flex: 1, padding: '14px', background: `linear-gradient(135deg, ${PINK}, ${PURPLE})`, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => { setStep('consent'); setCurrentQ(0); setAnswers({}); setResult(null); }}
              style={{ flex: 1, padding: '14px', background: 'transparent', color: PINK, border: `1.5px solid ${PINK}`, borderRadius: 10, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = PINK; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = PINK; }}
            >
              Retake Assessment
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}