// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// REMOVE: import { ThemeProvider } from './context/ThemeContext';  // Already wrapped in main.jsx!
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import RegisterClient from './pages/Register/RegisterClient';
import RegisterProfessional from './pages/Register/RegisterProfessional';
import RegisterAdmin from './pages/Register/RegisterAdmin';
import Login from './pages/Login';
// Import the three separate dashboards
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ProfessionalDashboard from './pages/dashboard/ProfessionalDashboard';
import ClientDashboard from './pages/dashboard/ClientDashboard';
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
import ProfessionalPayment from './pages/ProfessionalPayment';
import UserProfile from './pages/admin/UserProfile';
import AdminPayouts from './pages/admin/AdminPayouts';
// Import separated profile components
import ClientProfile from './pages/Profile/ClientProfile';
import ProfessionalProfile from './pages/Profile/ProfessionalProfile';
import AdminProfile from './pages/Profile/AdminProfile';
import CompleteProfile from './pages/CompleteProfile';
import AssessmentHistory from './pages/AssessmentHistory';
import ProfessionalAssessmentHistory from './pages/ProfessionalAssessmentHistory';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
}

// Component to render the correct dashboard based on user role
function DashboardRouter() {
  const role = localStorage.getItem('role');
  
  if (role === 'Admin') {
    return <AdminDashboard />;
  } else if (role === 'Professional') {
    return <ProfessionalDashboard />;
  } else {
    return <ClientDashboard />;
  }
}

// Component to render the correct profile based on user role
function ProfileRouter() {
  const role = localStorage.getItem('role');
  
  if (role === 'Professional') {
    return <ProfessionalProfile />;
  } else if (role === 'Admin') {
    return <AdminProfile />;
  } else {
    return <ClientProfile />;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register/client" element={<RegisterClient />} />
        <Route path="/register/professional" element={<RegisterProfessional />} />
        <Route path="/register/admin" element={<RegisterAdmin />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/login/:role" element={<Login />} />
        
        {/* Dashboard Route - This will show the appropriate dashboard based on role */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        } />
        
        {/* Redirect root admin/professional/client to dashboard */}
        <Route path="/admin" element={<Navigate to="/dashboard" />} />
        <Route path="/professional" element={<Navigate to="/dashboard" />} />
        <Route path="/client" element={<Navigate to="/dashboard" />} />
        
        {/* Assessment Routes */}
        <Route path="/assessment" element={<ProtectedRoute><Assessment /></ProtectedRoute>} />
        <Route path="/assessment-history" element={<ProtectedRoute><AssessmentHistory /></ProtectedRoute>} />
        
        {/* Resource Routes */}
        <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
        <Route path="/upload-resource" element={<ProtectedRoute><UploadResource /></ProtectedRoute>} />
        
        {/* Journal Routes */}
        <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
        
        {/* Session Routes */}
        <Route path="/sessions" element={<ProtectedRoute><ClientSessions /></ProtectedRoute>} />
        <Route path="/professional-sessions" element={<ProtectedRoute><ProfessionalSessions /></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
        <Route path="/admin/sessions" element={<ProtectedRoute><AdminSessions /></ProtectedRoute>} />
        <Route path="/admin/assessments" element={<ProtectedRoute><AdminAssessments /></ProtectedRoute>} />
        <Route path="/admin/resources" element={<ProtectedRoute><AdminResources /></ProtectedRoute>} />
        <Route path="/admin/revenue" element={<ProtectedRoute><AdminRevenue /></ProtectedRoute>} />
        <Route path="/admin/payouts" element={<ProtectedRoute><AdminPayouts /></ProtectedRoute>} />
        <Route path="/admin/users/:userId" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
        
        {/* Professional Routes */}
        <Route path="/professional-payment" element={<ProtectedRoute><ProfessionalPayment /></ProtectedRoute>} />
        <Route path="/professional/client/:clientId/assessments" element={<ProtectedRoute><ProfessionalAssessmentHistory /></ProtectedRoute>} />
        
        {/* Profile Routes */}
        <Route path="/profile" element={<ProtectedRoute><ProfileRouter /></ProtectedRoute>} />
        
        {/* Settings Route */}
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        
        {/* Catch all - redirect to dashboard if logged in, otherwise to landing */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}