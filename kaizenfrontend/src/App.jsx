// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';

// New landing pages (placed in a folder called "Landing")
import LandingPage from './pages/landing/LandingPage';           // Marketing homepage
import AboutPage from './pages/landing/AboutPage';               // About Kaizen
import HowItWorksPage from './pages/landing/HowItWorksPage';     // Role explanation
import RolePortalPage from './pages/landing/RolePortalPage';     // Single role portal

// New static pages (Our Story, Careers, Terms, Privacy)
import OurStory from './pages/landing/OurStory';
import Careers from './pages/landing/Careers';
import Terms from './pages/landing/Terms';
import PrivacyPolicy from './pages/landing/PrivacyInfo';

// Existing authentication and dashboard pages
import RegisterClient from './pages/Register/RegisterClient';
import RegisterProfessional from './pages/Register/RegisterProfessional';
import RegisterAdmin from './pages/Register/RegisterAdmin';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import ProfessionalDashboard from './pages/dashboard/ProfessionalDashboard';
import ClientDashboard from './pages/dashboard/ClientDashboard';
import Assessment from './pages/Assessment';
import Resources from './pages/Resources';
import UploadResource from './pages/UploadResource';
import Journal from './pages/Journal';
import ClientSessions from './pages/sessions/ClientSessions';
import ProfessionalSessions from './pages/sessions/ProfessionalSessions';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSessions from './pages/admin/AdminSessions';
import AdminAssessments from './pages/admin/AdminAssessments';
import AdminResources from './pages/admin/AdminResources';
import AdminRevenue from './pages/admin/AdminRevenue';
import ProfessionalPayment from './pages/ProfessionalPayment';
import UserProfile from './pages/admin/UserProfile';
import AdminPayouts from './pages/admin/AdminPayouts';
import ClientProfile from './pages/Profile/ClientProfile';
import ProfessionalProfile from './pages/Profile/ProfessionalProfile';
import AdminProfile from './pages/Profile/AdminProfile';
import CompleteProfile from './pages/CompleteProfile';
import AssessmentHistory from './pages/AssessmentHistory';
import ProfessionalAssessmentHistory from './pages/ProfessionalAssessmentHistory';
import Settings from './pages/Settings';
import ProfessionalClientProfile from './pages/sessions/ProfessionalClientProfile';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
}

// Dashboard router based on role
function DashboardRouter() {
  const role = localStorage.getItem('role');
  if (role === 'Admin') return <AdminDashboard />;
  if (role === 'Professional') return <ProfessionalDashboard />;
  return <ClientDashboard />;
}

// Profile router based on role
function ProfileRouter() {
  const role = localStorage.getItem('role');
  if (role === 'Professional') return <ProfessionalProfile />;
  if (role === 'Admin') return <AdminProfile />;
  return <ClientProfile />;
}

// Sessions router based on role
function SessionsRouter() {
  const role = localStorage.getItem('role');
  if (role === 'Professional') return <ProfessionalSessions />;
  return <ClientSessions />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="kaizen-page-hearts" aria-hidden="true">
        <span style={{ left: '7%', animationDelay: '0s' }} />
        <span style={{ left: '28%', animationDelay: '4s' }} />
        <span style={{ left: '54%', animationDelay: '1.8s' }} />
        <span style={{ left: '82%', animationDelay: '6.2s' }} />
      </div>
      <Routes>
        {/* ========== PUBLIC LANDING & MARKETING ROUTES ========== */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works/:role" element={<HowItWorksPage />} />
        <Route path="/portal" element={<Navigate to="/" />} />
        <Route path="/portal/:role" element={<RolePortalPage />} />

        {/* ========== NEW STATIC PAGES ========== */}
        <Route path="/our-story" element={<OurStory />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* ========== AUTHENTICATION ROUTES ========== */}
        <Route path="/register/client" element={<RegisterClient />} />
        <Route path="/register/professional" element={<RegisterProfessional />} />
        <Route path="/register/admin" element={<RegisterAdmin />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/login/:role" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ========== PROTECTED DASHBOARD ========== */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        } />

        {/* Redirects for legacy role-specific paths */}
        <Route path="/admin" element={<Navigate to="/dashboard" />} />
        <Route path="/professional" element={<Navigate to="/dashboard" />} />
        <Route path="/client" element={<Navigate to="/dashboard" />} />

        {/* ========== PROTECTED FEATURE ROUTES ========== */}
        <Route path="/assessment" element={
          <ProtectedRoute><Assessment /></ProtectedRoute>
        } />
        <Route path="/assessment-history" element={
          <ProtectedRoute><AssessmentHistory /></ProtectedRoute>
        } />
        <Route path="/professional-assessment-history/:clientId" element={
          <ProtectedRoute><ProfessionalAssessmentHistory /></ProtectedRoute>
        } />

        <Route path="/resources" element={
          <ProtectedRoute><Resources /></ProtectedRoute>
        } />
        <Route path="/upload-resource" element={
          <ProtectedRoute><UploadResource /></ProtectedRoute>
        } />

        <Route path="/journal" element={
          <ProtectedRoute><Journal /></ProtectedRoute>
        } />

        <Route path="/sessions" element={
          <ProtectedRoute><SessionsRouter /></ProtectedRoute>
        } />
        {/* Backward compatibility redirect */}
        <Route path="/professional-sessions" element={<Navigate to="/sessions" />} />

        {/* ========== ADMIN SPECIFIC ROUTES ========== */}
        <Route path="/admin/users" element={
          <ProtectedRoute><AdminUsers /></ProtectedRoute>
        } />
        <Route path="/admin/sessions" element={
          <ProtectedRoute><AdminSessions /></ProtectedRoute>
        } />
        <Route path="/admin/assessments" element={
          <ProtectedRoute><AdminAssessments /></ProtectedRoute>
        } />
        <Route path="/admin/resources" element={
          <ProtectedRoute><AdminResources /></ProtectedRoute>
        } />
        <Route path="/admin/revenue" element={
          <ProtectedRoute><AdminRevenue /></ProtectedRoute>
        } />
        <Route path="/admin/payouts" element={
          <ProtectedRoute><AdminPayouts /></ProtectedRoute>
        } />
        <Route path="/admin/users/:userId" element={
          <ProtectedRoute><UserProfile /></ProtectedRoute>
        } />

        {/* ========== PROFESSIONAL SPECIFIC ROUTES ========== */}
        <Route path="/professional-payment" element={
          <ProtectedRoute><ProfessionalPayment /></ProtectedRoute>
        } />

        {/* NEW: Professional view of client profile (with emergency contact + assessment history) */}
        <Route path="/professional/client-profile/:clientId" element={
          <ProtectedRoute><ProfessionalClientProfile /></ProtectedRoute>
        } />

        {/* ========== PROFILE & SETTINGS ========== */}
        <Route path="/profile" element={
          <ProtectedRoute><ProfileRouter /></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><Settings /></ProtectedRoute>
        } />

        {/* Catch-all redirect to landing page */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
