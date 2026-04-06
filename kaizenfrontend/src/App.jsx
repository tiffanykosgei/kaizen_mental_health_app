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
// AdminHome is no longer needed since /admin redirects to /dashboard
import AdminUsers from './pages/admin/AdminUsers';
import AdminSessions from './pages/admin/AdminSessions';
import AdminAssessments from './pages/admin/AdminAssessments';
import AdminResources from './pages/admin/AdminResources';
import AdminRevenue from './pages/admin/AdminRevenue';
import AdminReports from './pages/admin/AdminReports';

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
          
          {/* Main dashboard for all users - shows image + wellness message */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Redirect /admin to /dashboard - Admin users see the same dashboard */}
          <Route path="/admin" element={<Navigate to="/dashboard" />} />
          
          {/* Feature routes - accessed via sidebar */}
          <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
          <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
          <Route path="/upload-resource" element={<ProtectedRoute><UploadResource /></ProtectedRoute>} />
          <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
          <Route path="/sessions" element={<ProtectedRoute><ClientSessions /></ProtectedRoute>} />
          <Route path="/professional-sessions" element={<ProtectedRoute><ProfessionalSessions /></ProtectedRoute>} />
          
          {/* Admin management routes - accessed via sidebar by Admin users only */}
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/sessions" element={<ProtectedRoute><AdminSessions /></ProtectedRoute>} />
          <Route path="/admin/assessments" element={<ProtectedRoute><AdminAssessments /></ProtectedRoute>} />
          <Route path="/admin/resources" element={<ProtectedRoute><AdminResources /></ProtectedRoute>} />
          <Route path="/admin/revenue" element={<ProtectedRoute><AdminRevenue /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}