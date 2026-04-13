import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import RegisterClient from './pages/Register/RegisterClient';
import RegisterProfessional from './pages/Register/RegisterProfessional';
import RegisterAdmin from './pages/Register/RegisterAdmin';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assessment from './pages/Assessment';
import Resources from './pages/Resources';
import UploadResource from './pages/UploadResource';
import Journal from './pages/Journal';
import ClientSessions from './pages/ClientSessions';
import ProfessionalSessions from './pages/ProfessionalSessions';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSessions from './pages/admin/AdminSessions';
import AdminAssessments from './pages/admin/AdminAssessments';
import AdminResources from './pages/admin/AdminResources';
import AdminRevenue from './pages/admin/AdminRevenue';
import AdminReports from './pages/admin/AdminReports';
import ProfessionalPayment from './pages/ProfessionalPayment';
import UserProfile from './pages/admin/UserProfile';
import AdminPayouts from './pages/admin/AdminPayouts';
import Profile from './pages/Profile';
import CompleteProfile from './pages/CompleteProfile';

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
          
          {/* Role-based registration pages - NO role selection buttons inside */}
          <Route path="/register/client" element={<RegisterClient />} />
          <Route path="/register/professional" element={<RegisterProfessional />} />
          <Route path="/register/admin" element={<RegisterAdmin />} />
          
          {/* Complete profile after Google auth */}
          <Route path="/complete-profile" element={<CompleteProfile />} />
          
          {/* Login page */}
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
          <Route path="/professional-payment" element={<ProtectedRoute><ProfessionalPayment /></ProtectedRoute>} />
          <Route path="/admin/users/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/admin/payouts" element={<ProtectedRoute><AdminPayouts /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}