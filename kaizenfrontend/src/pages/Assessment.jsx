import { useState } from 'react';
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
  Anxiety:    { bg: '#EEEDFE', text: '#3C3489', bar: '#7F77DD' },
  Depression: { bg: '#E1F5EE', text: '#085041', bar: '#1D9E75' },
  Loneliness: { bg: '#FAECE7', text: '#712B13', bar: '#D85A30' },
};

const levelColors = {
  Good:     { bg: '#EAF3DE', text: '#27500A' },
  Mild:     { bg: '#FAEEDA', text: '#633806' },
  Moderate: { bg: '#FAECE7', text: '#712B13' },
  Severe:   { bg: '#FCEBEB', text: '#791F1F' },
};

export default function Assessment() {
  const navigate = useNavigate();
  const [step, setStep] = useState('consent');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnswer = (value) => {
    const qId = questions[currentQ].id;
    setAnswers(prev => ({ ...prev, [qId]: value }));
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
      
      // Fetch recommended resources based on the assessment
      const resourcesResponse = await API.get('/resource/recommended');
      
      setResult({
        ...response.data,
        recommendedResources: resourcesResponse.data.resources || []
      });
      setStep('results');
    } catch (err) {
      console.error('Error submitting assessment:', err);  
      setError('Something went wrong. Please try again.');
      setStep('questions');
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.round(((currentQ + 1) / questions.length) * 100);
  const currentCategory = questions[currentQ]?.category;
  const catColor = categoryColors[currentCategory] || {};

  if (step === 'consent') return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <h2>Before you begin</h2>
        <p style={{ marginBottom: 16 }}>Please read this carefully</p>
        <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: 13, lineHeight: 1.7, color: '#633806' }}>
          <strong>Important notice:</strong> This self-assessment is a <strong>screening tool only</strong> and does <strong>not</strong> constitute a medical diagnosis. Results are intended to help you understand your wellbeing and find relevant resources. Please consult a qualified mental health professional for clinical advice.
        </div>
        <div style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.7, marginBottom: 24 }}>
          <p>You will be asked <strong>15 questions</strong> across three areas: Anxiety, Depression and Loneliness. Each question is answered on a scale of 1 (Never) to 5 (Always).</p>
          <br />
          <p>Your responses are stored securely and are only visible to you and your assigned mental health professional. You can retake this assessment at any time to track your progress.</p>
        </div>
        <button onClick={() => setStep('questions')}>I understand — begin assessment</button>
        <div className="switch-link" style={{ marginTop: 16 }}>
          <a href="#" onClick={() => navigate('/dashboard')}>Return to dashboard</a>
        </div>
      </div>
    </div>
  );

  if (step === 'loading') return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2>Analysing your responses...</h2>
        <p>Please wait while we calculate your results.</p>
      </div>
    </div>
  );

  if (step === 'results' && result) return (
    <div className="auth-container" style={{ alignItems: 'flex-start', padding: '40px 20px' }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <h2>Your Assessment Results</h2>
        <p style={{ marginBottom: 20 }}>Completed on {new Date().toLocaleDateString('en-KE', { dateStyle: 'long' })}</p>

        {result.crisisSupport && (
          <div style={{ background: '#FCEBEB', border: '1px solid #F09595', borderRadius: 8, padding: '14px 16px', marginBottom: 20, fontSize: 13, color: '#791F1F', lineHeight: 1.7 }}>
            <strong>We are concerned about your wellbeing.</strong> Your results suggest you may be experiencing significant distress. Please reach out for support immediately.<br /><br />
            <strong>Befrienders Kenya (free, 24 hours):</strong> 0800 723 253
          </div>
        )}

        <div style={{ background: '#f7f9fc', borderRadius: 10, padding: '16px', marginBottom: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: '#718096', marginBottom: 6 }}>Overall wellbeing score</p>
          <p style={{ fontSize: 36, fontWeight: 600, color: '#1a202c', margin: 0 }}>{result.overallScore}<span style={{ fontSize: 16, color: '#718096' }}>/5</span></p>
          <span style={{ display: 'inline-block', marginTop: 8, padding: '4px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, background: levelColors[result.overallLevel]?.bg, color: levelColors[result.overallLevel]?.text }}>
            {result.overallLevel}
          </span>
        </div>

        {['Anxiety', 'Depression', 'Loneliness'].map(cat => {
          const scoreKey = cat.toLowerCase() + 'Score';
          const levelKey = cat.toLowerCase() + 'Level';
          const score = result[scoreKey];
          const level = result[levelKey];
          const color = categoryColors[cat];
          const barWidth = Math.round((score / 5) * 100);
          return (
            <div key={cat} style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 10, background: color.bg }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: color.text }}>{cat}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: color.text }}>{score}/5</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: levelColors[level]?.bg, color: levelColors[level]?.text, fontWeight: 500 }}>{level}</span>
                </div>
              </div>
              <div style={{ height: 8, background: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: barWidth + '%', background: color.bar, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}

        <div style={{ background: '#f7f9fc', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 500, color: '#1a202c', marginBottom: 6 }}>Primary area of concern</p>
          <p style={{ fontSize: 13, color: '#4a5568', lineHeight: 1.6 }}>{result.resultSummary}</p>
        </div>

        {/* Recommended Resources Section with Podcast Support */}
        {result.recommendedResources && result.recommendedResources.length > 0 && (
          <div style={{ marginTop: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>Recommended Resources</h3>
            <p style={{ fontSize: 13, color: '#4a5568', marginBottom: 16 }}>
              Based on your primary concern: <strong>{result.primaryConcern}</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.recommendedResources.slice(0, 3).map(resource => {
                const isPodcast = resource.type === 'Podcast';
                const isAudio = resource.type === 'Audio';
                return (
                  <div key={resource.id} style={{
                    background: '#f7f9fc',
                    borderRadius: 10,
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#1a202c' }}>{resource.title}</span>
                      <span style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: isPodcast ? '#F3E5F5' : '#E1F5EE',
                        color: isPodcast ? '#4A1D6D' : '#085041'
                      }}>{resource.type}</span>
                    </div>
                    {resource.description && (
                      <p style={{ fontSize: 12, color: '#718096', marginBottom: 10 }}>{resource.description}</p>
                    )}
                    
                    {isPodcast ? (
                      <div style={{ marginTop: 8 }}>
                        <audio controls style={{ width: '100%' }}>
                          <source src={resource.url} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                        <p style={{ fontSize: 10, color: '#a0aec0', marginTop: 6 }}>
                          🎙️ Podcast episode — press play to listen
                        </p>
                      </div>
                    ) : isAudio ? (
                      <div style={{ marginTop: 8 }}>
                        <audio controls style={{ width: '100%' }}>
                          <source src={resource.url} type="audio/mpeg" />
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    ) : (
                      <a href={resource.url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: '#6c63ff', textDecoration: 'none' }}>
                        Open resource →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
            {result.recommendedResources.length > 3 && (
              <button
                onClick={() => navigate('/resources')}
                style={{
                  marginTop: 12,
                  width: 'auto',
                  padding: '8px 16px',
                  fontSize: 12,
                  background: 'transparent',
                  color: '#6c63ff',
                  border: '1px solid #6c63ff'
                }}
              >
                View all resources
              </button>
            )}
          </div>
        )}

        <div style={{ background: '#FAEEDA', border: '1px solid #EF9F27', borderRadius: 8, padding: '12px 14px', marginBottom: 20, fontSize: 12, color: '#633806', lineHeight: 1.6 }}>
          <strong>Disclaimer:</strong> {result.disclaimer}
        </div>

        <button onClick={() => navigate('/dashboard')} style={{ marginBottom: 10 }}>
          Go to dashboard
        </button>
        <button onClick={() => { setStep('consent'); setCurrentQ(0); setAnswers({}); setResult(null); }}
          style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}>
          Retake assessment
        </button>
      </div>
    </div>
  );

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 540 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#718096' }}>Question {currentQ + 1} of {questions.length}</span>
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 4, background: catColor.bg, color: catColor.text, fontWeight: 500 }}>{currentCategory}</span>
          </div>
          <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: progress + '%', background: '#6c63ff', borderRadius: 3, transition: 'width 0.3s ease' }} />
          </div>
        </div>

        <p style={{ fontSize: 16, fontWeight: 500, color: '#1a202c', lineHeight: 1.6, marginBottom: 24, minHeight: 60 }}>
          {questions[currentQ].text}
        </p>

        <div style={{ marginBottom: 24 }}>
          {[1, 2, 3, 4, 5].map(val => (
            <button
              key={val}
              onClick={() => handleAnswer(val)}
              style={{
                marginBottom: 10,
                background: answers[questions[currentQ].id] === val ? '#6c63ff' : 'white',
                color: answers[questions[currentQ].id] === val ? 'white' : '#1a202c',
                border: answers[questions[currentQ].id] === val ? '1px solid #6c63ff' : '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                textAlign: 'left',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.15s'
              }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: answers[questions[currentQ].id] === val ? 'rgba(255,255,255,0.3)' : '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{val}</span>
              {scaleLabels[val]}
            </button>
          ))}
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          {currentQ > 0 && (
            <button onClick={handleBack} style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff', flex: 1 }}>
              Back
            </button>
          )}
          <button onClick={handleNext} style={{ flex: 2 }} disabled={loading}>
            {currentQ === questions.length - 1 ? 'Submit assessment' : 'Next question'}
          </button>
        </div>
      </div>
    </div>
  );
}