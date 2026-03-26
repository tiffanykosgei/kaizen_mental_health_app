import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const fullName = localStorage.getItem('fullName') || 'there';
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('fullName');
    localStorage.removeItem('role');
    navigate('/login');
  };

  return (
    <div className="auth-container" style={{ alignItems: 'flex-start', padding: '40px 20px' }}>
      <div className="auth-card" style={{ maxWidth: 500 }}>
        <h2>Welcome back, {fullName}</h2>
        <p style={{ marginBottom: 28 }}>
          {role === 'Professional' ? 'Professional dashboard' : role === 'Admin' ? 'Admin dashboard' : 'What would you like to do today?'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {role === 'Client' && <>
            <button onClick={() => navigate('/assessment')}>Take self-assessment</button>
            <button onClick={() => navigate('/resources')}
              style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}>
              Browse resources
            </button>
            <button onClick={() => navigate('/journal')}
              style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}>
              Journal entries
            </button>
            <button onClick={() => navigate('/sessions')}
              style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}>
              Book a session
            </button>
          </>}

          {role === 'Professional' && <>
            <button onClick={() => navigate('/upload-resource')}>Upload a resource</button>
            <button onClick={() => navigate('/upload-resource')}
              style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}>
              My resources
            </button>
            <button onClick={() => navigate('/resources')}
              style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}>
              Browse all resources
            </button>
            <button onClick={() => navigate('/sessions')}
              style={{ background: 'transparent', color: '#6c63ff', border: '1px solid #6c63ff' }}>
              My sessions
            </button>
          </>}

          {role === 'Admin' && <>
            <button onClick={() => navigate('/admin')}>Admin panel</button>
          </>}
        </div>

        <div className="switch-link" style={{ marginTop: 24 }}>
          <a href="#" onClick={handleLogout}>Log out</a>
        </div>
      </div>
    </div>
  );
}