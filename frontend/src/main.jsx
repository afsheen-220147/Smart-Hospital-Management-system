import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import App from './App'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'

// ==========================================
// FIX #1: Disable Service Worker caching
// ==========================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      registration.unregister().catch(err => {
        console.log('Service Worker unregister error:', err);
      });
    });
  });
}

// ==========================================
// FIX #2: Clear all browser caches on load
// ==========================================
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name).then(deleted => {
        if (deleted) console.log(`Cache '${name}' cleared`);
      });
    });
  });
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your_google_client_id_here'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ThemeProvider>
        <App />
        </ThemeProvider>
        <ToastContainer
          position="top-right"
          autoClose={3500}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
          limit={5}
        />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
