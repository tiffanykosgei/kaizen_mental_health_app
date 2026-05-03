// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = "313014122842-3jlphcr1c2vnau644k3k4imuh9pfrobe.apps.googleusercontent.com"

// StrictMode causes double component mounts which breaks Daily.co video calls
// In development, this creates "Duplicate Dailyframe instances" errors
// In production, StrictMode is automatically disabled
// This configuration keeps StrictMode for general development benefits
// but the VideoCall component handles the double mount gracefully
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>
)