import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome to Kaizen</h2>
        <p>You are successfully logged in. Your dashboard is coming soon.</p>
        <br />
        <button onClick={handleLogout}>Log Out</button>
      </div>
    </div>
  );
}