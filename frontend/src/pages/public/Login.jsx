import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { GoogleLogin } from '@react-oauth/google'
import { googleLoginAuto } from '../../services/auth'
import {
  HeartPulse, Mail, Lock, LogIn, Eye, EyeOff,
  ShieldCheck, Calendar, ClipboardList, CheckCircle2, AlertCircle
} from 'lucide-react'
import { showSuccess, showError, getErrorMessage } from '../../utils/toast'

const FEATURES = [
  { icon: Calendar,      text: 'Book & manage appointments online' },
  { icon: ClipboardList, text: 'Access medical records anytime' },
  { icon: ShieldCheck,   text: 'Secure, HIPAA-compliant platform' },
]

export default function Login() {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [showPassword, setShowPwd]  = useState(false)
  const [remember, setRemember]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const { login, loginWithData }    = useAuth()
  const navigate     = useNavigate()
  const location     = useLocation()
  const redirectUrl  = new URLSearchParams(location.search).get('redirect')

  // Show success toast if redirected from registration
  useEffect(() => {
    if (location.state?.registered) {
      showSuccess('Registration successful! Please sign in with your email and password.')
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})
    try {
      const res = await login({ email, password })
      const role = res?.data?.role || res?.role
      showSuccess('Login successful!')
      if (role === 'admin')        navigate('/admin')
      else if (role === 'doctor')  navigate('/doctor')
      else                         navigate(redirectUrl || '/patient')
    } catch (err) {
      const msg = getErrorMessage(err, 'Invalid email or password.')
      // Show inline for credential-specific errors
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('credentials') || msg.toLowerCase().includes('invalid')) {
        setFieldErrors({ credentials: msg, suggestRegister: true })
      } else {
        showError(msg)
      }
      setLoading(false)
    }
  }

  // Google Login Handler
  const handleGoogleLogin = async (credentialResponse) => {
    const token = credentialResponse.credential
    setGoogleLoading(true)
    setFieldErrors({})
    try {
      const res = await googleLoginAuto(token)
      if (res.data && res.data.token) {
        loginWithData(res.data)
        showSuccess('Login successful!')
        const role = res.data.role
        if (role === 'admin') navigate('/admin')
        else if (role === 'doctor') navigate('/doctor')
        else navigate(redirectUrl || '/patient')
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Google login failed. Please try again.')
      showError(msg)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel (branding) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-16 h-16 rounded-full overflow-hidden shadow-2xl border-2 border-white/20">
              <img src="/logo2.png" alt="NeoTherapy Logo" className="w-full h-full object-cover scale-[2.0] translate-y-2.5" />
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">NeoTherapy</p>
              <p className="text-blue-200 text-xs">Smart Hospital Portal</p>
            </div>
          </div>

          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Care You Can Trust,<br />Technology You Can Rely On.
          </h2>
          <p className="text-blue-200 text-base leading-relaxed max-w-sm">
            Manage appointments, access medical records, and connect with your care team — all in one place.
          </p>
        </div>

        <div className="relative z-10 space-y-4">
          {FEATURES.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-blue-100 text-sm">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right Panel (form) ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-full overflow-hidden shadow-md border border-gray-200">
              <img src="/logo2.png" alt="NeoTherapy Logo" className="w-full h-full object-cover scale-[2.0] translate-y-2" />
            </div>
            <div>
              <p className="font-bold text-gray-900 leading-none">NeoTherapy</p>
              <p className="text-gray-500 text-xs">Smart Hospital Portal</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
            <p className="text-gray-500 mt-1">Sign in to your account to continue</p>
          </div>

          {/* Inline credential error */}
          {fieldErrors.credentials && (
            <div className="mb-5 flex flex-col gap-3 bg-red-50 text-red-600 text-sm p-3.5 rounded-xl border border-red-100 animate-fadeIn">
              <div className="flex items-start gap-2">
                <AlertCircle size={17} className="mt-0.5 flex-shrink-0" />
                <span>{fieldErrors.credentials}</span>
              </div>
              {fieldErrors.suggestRegister && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-600">Don't have an account?</span>
                  <Link to="/register" className="text-blue-600 font-semibold hover:underline hover:text-blue-700">
                    Register Now →
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white dark:bg-gray-800 placeholder-gray-400 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white dark:bg-gray-800 placeholder-gray-400 transition-all"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400 cursor-pointer" />
              <span className="text-sm text-gray-600">Keep me signed in</span>
            </label>

            {/* Submit */}
            <button type="submit" disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
              {loading ? (
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : <><LogIn size={18} /> Sign In</>}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium uppercase">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google Login Button */}
          <div className="flex flex-col items-center">
            {googleLoading ? (
              <div className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border-2 border-gray-200 text-gray-500 font-semibold text-sm rounded-xl">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Signing in with Google...
              </div>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => showError('Google sign-in failed. Please try again.')}
                text="continue_with"
                shape="rectangular"
                size="large"
                theme="outline"
                width="320"
              />
            )}
          </div>

          <p className="text-center text-gray-500 text-sm mt-7 pt-5 border-t border-gray-200">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
