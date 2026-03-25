import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  HeartPulse, User, Stethoscope, Mail,
  Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, Check, X
} from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { showSuccess, showError, showWarning, getErrorMessage } from '../../utils/toast'

const ROLES = [
  { key: 'patient', label: 'Patient', icon: User,        accent: 'blue', desc: 'Book appointments & manage your health records' },
  { key: 'doctor',  label: 'Doctor',  icon: Stethoscope, accent: 'teal', desc: 'Manage patients, schedules & diagnoses' },
]

const ACCENT = {
  blue:   { card: 'border-blue-300 bg-blue-50',   badge: 'bg-blue-100 text-blue-700 border-blue-200',   icon: 'text-blue-600'   },
  teal:   { card: 'border-teal-300 bg-teal-50',   badge: 'bg-teal-100 text-teal-700 border-teal-200',   icon: 'text-teal-600'   },
}

const INSTITUTE_DOMAIN = '@rguktn.ac.in'

// Password policy checks
const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: pw => pw.length >= 8 },
  { label: 'Uppercase letter',      test: pw => /[A-Z]/.test(pw) },
  { label: 'Lowercase letter',      test: pw => /[a-z]/.test(pw) },
  { label: 'Number',                test: pw => /[0-9]/.test(pw) },
  { label: 'Special character',     test: pw => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw) },
]

const isPasswordStrong = (pw) => PASSWORD_RULES.every(r => r.test(pw))

const Spinner = () => (
  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export default function Register() {
  // Registration mode: 'choose' | 'google' | 'email'
  const [mode, setMode] = useState('choose')

  // --- Google OAuth flow state ---
  const [googleStep, setGoogleStep]     = useState(1) // 1=google-btn, 2=role, 3=password
  const [idToken, setIdToken]           = useState('')
  const [googleUser, setGoogleUser]     = useState(null)

  // --- Email+OTP flow state ---
  const [emailStep, setEmailStep]       = useState(1) // 1=form, 2=otp, 3=done(auto)

  // Shared state
  const [name, setName]                 = useState('')
  const [email, setEmail]               = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPwd, setShowPwd]           = useState(false)
  const [showCfm, setShowCfm]           = useState(false)
  const [loading, setLoading]           = useState(false)
  const [fieldErrors, setFieldErrors]   = useState({})

  // OTP state
  const [otp, setOtp]                   = useState(['', '', '', ''])
  const otpRefs = [useRef(), useRef(), useRef(), useRef()]

  const { loginWithData } = useAuth()
  const navigate = useNavigate()

  // ── Helpers ──
  const decodeGoogleToken = (token) => {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
      return JSON.parse(atob(base64))
    } catch { return {} }
  }

  const redirectToLogin = (email) => {
    navigate('/login', { state: { registered: true, email } })
  }

  // ── Google flow handlers ──
  const handleGoogleSuccess = async (credentialResponse) => {
    const token = credentialResponse.credential
    const payload = decodeGoogleToken(token)
    setIdToken(token)
    setGoogleUser({ name: payload.name || '', email: payload.email || '' })
    setFieldErrors({})

    // Check if user already exists
    setLoading(true)
    try {
      const res = await api.post('/auth/google', { idToken: token })
      if (res.data.needs_registration) {
        // New user — proceed to role selection
        setMode('google')
        setGoogleStep(2)
      } else if (res.data.token) {
        // Existing user — redirect to login (no auto-login per requirement)
        showWarning('Account already exists. Please sign in on the login page.')
        redirectToLogin(payload.email)
      }
    } catch (err) {
      showError(getErrorMessage(err, 'Google sign-in failed.'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRoleSelect = async (role) => {
    if (role === 'doctor' && googleUser) {
      setLoading(true)
      try {
        const res = await api.get(`/auth/check-doctor-email?email=${encodeURIComponent(googleUser.email)}`)
        if (!res.data.authorized) {
          showError(res.data.message || 'This email is not authorized to register as a doctor.')
          setLoading(false)
          return
        }
      } catch {
        showError('This email is not authorized to register as a doctor.')
        setLoading(false)
        return
      }
      setLoading(false)
    }
    setSelectedRole(role)
    setFieldErrors({})
    setGoogleStep(3)
  }

  const handleGoogleRegister = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!isPasswordStrong(password)) errors.password = 'Password does not meet all requirements.'
    if (password !== confirm) errors.confirm = 'Passwords do not match.'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    setLoading(true)
    setFieldErrors({})
    try {
      const res = await api.post('/auth/google-register', {
        idToken, role: selectedRole, password, confirmPassword: confirm
      })
      if (res.data.success) {
        showSuccess('Registration successful! Please sign in with your credentials.')
        redirectToLogin(res.data.email || googleUser?.email)
      }
    } catch (err) {
      showError(getErrorMessage(err, 'Registration failed. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  // ── Email+OTP flow handlers ──
  const handleEmailSendOtp = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!selectedRole) errors.role = 'Please select a role.'
    if (!isPasswordStrong(password)) errors.password = 'Password does not meet all requirements.'
    if (password !== confirm) errors.confirm = 'Passwords do not match.'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    setLoading(true)
    setFieldErrors({})
    try {
      await api.post('/auth/register/send-otp', {
        name, email, password, confirmPassword: confirm, role: selectedRole
      })
      showSuccess('OTP sent to your email!')
      setEmailStep(2)
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to send OTP.')
      // Authorization errors (wrong role, not approved by admin) → always show as toast
      if (msg.toLowerCase().includes('not authorized') || msg.toLowerCase().includes('authorized to register')) {
        showError(msg)
      // Duplicate email errors → show inline under the email field
      } else if (msg.toLowerCase().includes('account already') || msg.toLowerCase().includes('already exists')) {
        setFieldErrors({ email: msg })
      } else {
        showError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 3) otpRefs[index + 1].current?.focus()
  }
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs[index - 1].current?.focus()
  }
  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) { setOtp(pasted.split('')); otpRefs[3].current?.focus() }
  }

  const handleEmailVerifyOtp = async (e) => {
    e.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length !== 4) { setFieldErrors({ otp: 'Please enter the complete 4-digit OTP.' }); return }
    setLoading(true)
    setFieldErrors({})
    try {
      const res = await api.post('/auth/register/verify-otp', { email, otp: otpCode })
      if (res.data.success) {
        showSuccess('Registration successful! Please sign in with your credentials.')
        redirectToLogin(email)
      }
    } catch (err) {
      showError(getErrorMessage(err, 'OTP verification failed.'))
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setLoading(true); setFieldErrors({}); setOtp(['', '', '', ''])
    try {
      await api.post('/auth/register/send-otp', {
        name, email, password, confirmPassword: confirm, role: selectedRole
      })
      showSuccess('New OTP sent to your email!')
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to resend OTP.'))
    } finally { setLoading(false) }
  }

  const activeRole = ROLES.find(r => r.key === selectedRole)

  // ── Determine step label for progress indicator ──
  const getSteps = () => {
    if (mode === 'google') return ['Google', 'Role', 'Password']
    if (mode === 'email')  return ['Details', 'Verify OTP']
    return []
  }
  const getCurrentStep = () => {
    if (mode === 'google') return googleStep
    if (mode === 'email')  return emailStep
    return 0
  }
  const steps = getSteps()
  const currentStep = getCurrentStep()

  // ── Password strength indicator ──
  const PasswordStrengthIndicator = () => {
    if (!password) return null
    const passed = PASSWORD_RULES.filter(r => r.test(password)).length
    const pct = (passed / PASSWORD_RULES.length) * 100
    const color = pct <= 40 ? 'bg-red-500' : pct <= 70 ? 'bg-yellow-500' : 'bg-green-500'
    return (
      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full ${color} transition-all duration-300 rounded-full`} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[10px] font-semibold text-gray-500">{passed}/{PASSWORD_RULES.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {PASSWORD_RULES.map(r => (
            <div key={r.label} className={`flex items-center gap-1.5 text-[11px] ${r.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
              {r.test(password) ? <Check size={10} /> : <X size={10} />}
              {r.label}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full shadow-xl mb-4 overflow-hidden border-2 border-white">
            <img src="/logo2.png" alt="NeoTherapy Logo" className="w-full h-full object-cover scale-[2.0] translate-y-2.5" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-500 mt-1.5 text-sm">NeoTherapy · Smart Hospital Portal</p>
        </div>

        {/* Step Indicator */}
        {steps.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-7">
            {steps.map((label, i) => {
              const s = i + 1
              const done = currentStep > s
              const active = currentStep === s
              return (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {done ? <CheckCircle2 size={16} /> : s}
                    </div>
                    <span className={`text-[11px] font-medium ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`}>{label}</span>
                  </div>
                  {s < steps.length && <div className={`w-16 h-0.5 mb-4 transition-all duration-300 ${currentStep > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
                </React.Fragment>
              )
            })}
          </div>
        )}

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">



          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* CHOOSE MODE */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {mode === 'choose' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-800">Get Started</h2>
                <p className="text-sm text-gray-500 mt-1">Choose how you'd like to create your account.</p>
              </div>

              {/* Google option */}
              <div className="flex flex-col items-center gap-4">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => showError('Google sign-in failed. Please try again.')}
                  text="signup_with"
                  shape="rectangular"
                  size="large"
                  theme="outline"
                  width="320"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">OR</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Email registration */}
              <button onClick={() => { setMode('email'); setEmailStep(1); setFieldErrors({}) }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700 font-semibold text-sm rounded-xl transition-all duration-200">
                <Mail size={18} /> Register with Email
              </button>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <p className="text-xs text-blue-700 font-semibold mb-2">How registration works</p>
                <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                  <li>Sign up with Google or enter your email</li>
                  <li>Select your role (Patient / Doctor)</li>
                  <li>Set a strong password for your account</li>
                  <li>Verify via OTP (email registration) and you're in!</li>
                </ol>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GOOGLE FLOW — STEP 2: ROLE SELECTION */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {mode === 'google' && googleStep === 2 && (
            <div className="space-y-5">
              <button type="button" onClick={() => { setMode('choose'); setFieldErrors({}) }}
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 transition-colors">
                <ArrowLeft size={15} /> Back
              </button>

              {googleUser && (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {googleUser.name?.[0]?.toUpperCase() || 'G'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{googleUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">{googleUser.email}</p>
                  </div>
                  <CheckCircle2 size={18} className="text-green-500 ml-auto flex-shrink-0" />
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Select your role</p>
                <div className="flex flex-col gap-3">
                  {ROLES.map(r => {
                    const Icon = r.icon
                    const a = ACCENT[r.accent]
                    const restricted = r.key === 'doctor'
                    const eligible = !restricted || (googleUser?.email?.toLowerCase().endsWith(INSTITUTE_DOMAIN))
                    return (
                      <button key={r.key} type="button" onClick={() => handleGoogleRoleSelect(r.key)}
                        disabled={!eligible}
                        title={!eligible ? 'Requires @rguktn.ac.in institutional email' : ''}
                        className={`flex items-center gap-4 w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                          !eligible
                            ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                            : `hover:shadow-sm ${selectedRole === r.key ? `${a.card} ring-2` : 'border-gray-200 hover:border-gray-300 bg-white'}`
                        }`}>
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          r.accent === 'blue' ? 'bg-blue-100' : 'bg-teal-100'
                        }`}>
                          <Icon size={22} className={a.icon} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800 text-sm">{r.label}</p>
                            {restricted && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                eligible ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-400 border-gray-200'
                              }`}>
                                <Lock size={9} /> @rguktn.ac.in only
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* GOOGLE FLOW — STEP 3: SET PASSWORD */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {mode === 'google' && googleStep === 3 && (
            <div className="space-y-5">
              <button type="button" onClick={() => { setGoogleStep(2); setFieldErrors({}) }}
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 transition-colors">
                <ArrowLeft size={15} /> Back
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {googleUser && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                    <CheckCircle2 size={12} /> {googleUser.email}
                  </span>
                )}
                {activeRole && (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${ACCENT[activeRole.accent].badge}`}>
                    <activeRole.icon size={12} /> {activeRole.label}
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-800">Set your login password</h2>
                <p className="text-sm text-gray-500 mt-0.5">You'll use your email + this password to sign in.</p>
              </div>

              <form onSubmit={handleGoogleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type={showPwd ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Create a strong password"
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator />
                  {fieldErrors.password && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type={showCfm ? 'text' : 'password'} value={confirm}
                      onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your password"
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" />
                    <button type="button" onClick={() => setShowCfm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCfm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {confirm && password && (
                    <p className={`mt-1.5 text-xs flex items-center gap-1 ${password === confirm ? 'text-green-600' : 'text-red-500'}`}>
                      {password === confirm ? <><CheckCircle2 size={12} /> Passwords match</> : '✗ Passwords do not match'}
                    </p>
                  )}
                  {fieldErrors.confirm && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.confirm}</p>
                  )}
                </div>

                <button type="submit" disabled={loading || !isPasswordStrong(password) || password !== confirm}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                  {loading ? <Spinner /> : <><CheckCircle2 size={18} /> Complete Registration</>}
                </button>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* EMAIL FLOW — STEP 1: REGISTRATION FORM */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {mode === 'email' && emailStep === 1 && (
            <div className="space-y-5">
              <button type="button" onClick={() => { setMode('choose'); setFieldErrors({}) }}
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 transition-colors">
                <ArrowLeft size={15} /> Back
              </button>

              <div>
                <h2 className="text-lg font-semibold text-gray-800">Register with Email</h2>
                <p className="text-sm text-gray-500 mt-0.5">Fill in your details to create an account.</p>
              </div>

              <form onSubmit={handleEmailSendOtp} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <div className="relative">
                    <User size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Gmail Address</label>
                  <div className="relative">
                    <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type="email" value={email} onChange={e => { setEmail(e.target.value); setFieldErrors(f => ({...f, email: ''})) }}
                      placeholder="yourname@gmail.com"
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all ${fieldErrors.email ? 'border-red-400' : 'border-gray-200'}`} />
                  </div>
                  {fieldErrors.email && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.email}
                      {fieldErrors.email.toLowerCase().includes('login') && (
                        <Link to="/login" className="ml-1 text-blue-600 font-semibold hover:underline">Go to Login</Link>
                      )}
                    </p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <div className="flex gap-3">
                    {ROLES.map(r => {
                      const Icon = r.icon
                      const selected = selectedRole === r.key
                      const restricted = r.key === 'doctor'
                      return (
                        <button key={r.key} type="button" onClick={() => { setSelectedRole(r.key); setFieldErrors(f => ({...f, role: ''})) }}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border-2 text-sm font-medium transition-all ${
                            selected ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}>
                          <Icon size={16} /> {r.label}
                          {restricted && <Lock size={10} className="text-amber-500" />}
                        </button>
                      )
                    })}
                  </div>
                  {selectedRole === 'doctor' && (
                    <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle size={11} /> Doctor registration requires an @rguktn.ac.in email approved by admin.
                    </p>
                  )}
                  {fieldErrors.role && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.role}</p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type={showPwd ? 'text' : 'password'} value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Create a strong password"
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator />
                  {fieldErrors.password && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.password}</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input required type={showCfm ? 'text' : 'password'} value={confirm}
                      onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your password"
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" />
                    <button type="button" onClick={() => setShowCfm(v => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCfm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {confirm && password && (
                    <p className={`mt-1.5 text-xs flex items-center gap-1 ${password === confirm ? 'text-green-600' : 'text-red-500'}`}>
                      {password === confirm ? <><CheckCircle2 size={12} /> Passwords match</> : '✗ Passwords do not match'}
                    </p>
                  )}
                  {fieldErrors.confirm && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.confirm}</p>
                  )}
                </div>

                <button type="submit" disabled={loading || !isPasswordStrong(password) || password !== confirm || !selectedRole}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2">
                  {loading ? <Spinner /> : <><Mail size={18} /> Send Verification OTP</>}
                </button>
              </form>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* EMAIL FLOW — STEP 2: OTP VERIFICATION */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {mode === 'email' && emailStep === 2 && (
            <div className="space-y-5">
              <button type="button" onClick={() => { setEmailStep(1); setFieldErrors({}) }}
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-blue-600 transition-colors">
                <ArrowLeft size={15} /> Back
              </button>

              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-800">Verify Your Email</h2>
                <p className="text-sm text-gray-500 mt-1">Enter the 4-digit OTP sent to <strong className="text-gray-700">{email}</strong></p>
              </div>

              <form onSubmit={handleEmailVerifyOtp} className="space-y-5">
                <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input key={i} ref={otpRefs[i]} type="text" inputMode="numeric" maxLength={1}
                      value={digit} onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all" />
                  ))}
                </div>
                {fieldErrors.otp && (
                  <p className="text-center text-xs text-red-500 flex items-center justify-center gap-1"><AlertCircle size={12} /> {fieldErrors.otp}</p>
                )}

                <button type="submit" disabled={loading || otp.join('').length !== 4}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading ? <Spinner /> : <><CheckCircle2 size={18} /> Verify & Create Account</>}
                </button>

                <p className="text-center text-xs text-gray-500">
                  Didn't receive the code?{' '}
                  <button type="button" onClick={handleResendOtp} disabled={loading}
                    className="text-blue-600 font-semibold hover:underline disabled:opacity-50">
                    Resend OTP
                  </button>
                </p>
              </form>
            </div>
          )}

          <p className="text-center text-gray-400 text-sm mt-7 pt-5 border-t border-gray-100">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
