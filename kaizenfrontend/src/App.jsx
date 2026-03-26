import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assessment from './pages/Assessment';
import Resources from './pages/Resources';
import UploadResource from './pages/UploadResource';
import Journal from './pages/Journal';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/register" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/assessment" element={
          <ProtectedRoute>
            <Assessment />
          </ProtectedRoute>
        } />
        <Route path="/resources" element={
          <ProtectedRoute>
            <Resources />
          </ProtectedRoute>
        } />
        <Route path="/upload-resource" element={
          <ProtectedRoute>
            <UploadResource />
          </ProtectedRoute>
        } />
        <Route path="/journal" element={
  <ProtectedRoute>
    <Journal />
  </ProtectedRoute>
} />
      </Routes>
    </BrowserRouter>
  );
}