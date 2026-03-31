import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assessment from './pages/Assessment';
import Resources from './pages/Resources';
import UploadResource from './pages/UploadResource';
import Journal from './pages/Journal';
import ClientSessions from './pages/ClientSessions';
import ProfessionalSessions from './pages/ProfessionalSessions';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login/:role" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
          <Route path="/upload-resource" element={<ProtectedRoute><UploadResource /></ProtectedRoute>} />
          <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><ClientSessions /></ProtectedRoute>} />
          <Route path="/professional-sessions" element={<ProtectedRoute><ProfessionalSessions /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}