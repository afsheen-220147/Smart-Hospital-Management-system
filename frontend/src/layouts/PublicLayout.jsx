import React, { useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { HeartPulse } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const REDIRECT_PATHS = ['/', '/login', '/register', '/forgot-password']

export default function PublicLayout() {
  const { user } = useAuth()
  const { pathname } = useLocation()

  // Always reset scroll lock when navigating to any public page
  // This prevents Home.jsx's overflow:hidden from persisting to Register, Login etc.
  useEffect(() => {
    if (pathname !== '/') {
      document.body.style.overflow = 'auto';
    }
  }, [pathname]);

  // Redirect logged-in users away from the home/auth pages to their dashboard
  if (user && REDIRECT_PATHS.includes(pathname)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'doctor') return <Navigate to="/doctor" replace />
    return <Navigate to="/patient" replace />
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary, #F5F1EC)' }}>
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="bg-gradient-to-r from-blue-900 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-14 h-14 rounded-full overflow-hidden shadow-lg border-2 border-white mb-4">
                <img src="/logo2.png" alt="NeoTherapy Logo" className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-bold">NeoTherapy</span>
            </div>
            <p className="text-blue-200 text-sm leading-relaxed max-w-xs italic mb-2">
              “Care You Can Trust, Technology You Can Rely On.”
            </p>
            <p className="text-blue-300 text-xs leading-relaxed max-w-xs opacity-80">
              Smart healthcare at your fingertips. Book appointments, manage records, and connect with top doctors online.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white/90">Quick Links</h4>
            <ul className="space-y-2 text-sm text-blue-200">
              <li><a href="/" className="hover:text-white transition-colors">Home</a></li>
              <li><a href="/doctors" className="hover:text-white transition-colors">Find Doctors</a></li>
              <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="/login" className="hover:text-white transition-colors">Patient Login</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-white/90">Contact</h4>
            <ul className="space-y-2 text-sm text-blue-200">
              <li>📞 +91 1800-000-0000</li>
              <li>✉️ care@neotherapy.com</li>
              <li>📍 123 Healthcare Ave, City</li>
              <li>🕒 24/7 Emergency</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 text-center py-4 text-sm text-blue-300">
          © {new Date().getFullYear()} NeoTherapy Hospital. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
