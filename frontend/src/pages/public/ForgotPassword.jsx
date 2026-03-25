import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HeartPulse, Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import { showSuccess, showError, getErrorMessage } from '../../utils/toast'

export default function ForgotPassword() {
  const [step, setStep] = useState(1) // 1=email, 2=otp, 3=new password
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', ''])
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const navigate = useNavigate()
  const otpRefs = [useRef(), useRef(), useRef(), useRef()]

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setFieldErrors({})
    try {
      const res = await api.post('/auth/forgot-password', { email })
      showSuccess(res.data.message || 'OTP sent to your email!')
      setStep(2)
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to send OTP'))
    } finally {
      setLoading(false)
    }
  }

  // OTP input handler
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return // only digits
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1) // single digit
    setOtp(newOtp)
    // Auto-focus next
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      setOtp(pasted.split(''))
      otpRefs[3].current?.focus()
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    const otpCode = otp.join('')
    if (otpCode.length !== 4) {
      setFieldErrors({ otp: 'Please enter the complete 4-digit OTP' })
      return
    }
    setLoading(true)
    setFieldErrors({})
    try {
      const res = await api.post('/auth/verify-otp', { email, otp: otpCode })
      setResetToken(res.data.resetToken)
      showSuccess('OTP verified successfully!')
      setStep(3)
    } catch (err) {
      showError(getErrorMessage(err, 'Invalid OTP'))
    } finally {
      setLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setFieldErrors({ confirm: 'Passwords do not match!' })
      return
    }
    if (password.length < 6) {
      setFieldErrors({ password: 'Password must be at least 6 characters' })
      return
    }
    setLoading(true)
    setFieldErrors({})
    try {
      const res = await api.post('/auth/reset-password', { resetToken, password, confirmPassword })
      showSuccess(res.data.message || 'Password reset successful!')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      showError(getErrorMessage(err, 'Password reset failed'))
    } finally {
      setLoading(false)
    }
  }

  // Resend OTP
  const handleResendOtp = async () => {
    setLoading(true)
    setFieldErrors({})
    setOtp(['', '', '', ''])
    try {
      const res = await api.post('/auth/forgot-password', { email })
      showSuccess(res.data.message || 'New OTP sent to your email!')
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to resend OTP'))
    } finally {
      setLoading(false)
    }
  }

  const Spinner = () => (
    <svg className="animate-spin w-5 h-5 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  )

  return (
    <div className="min-h-[calc(100vh-70px)] flex items-center justify-center p-4 bg-gray-50 animate-fadeIn">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl mx-auto mb-4 border-2 border-white">
            <img src="/logo2.png" alt="NeoTherapy Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Reset Password</h1>
          <p className="text-gray-500 mt-2">
            {step === 1 && 'Enter your email to receive a verification code'}
            {step === 2 && 'Enter the 4-digit OTP sent to your email'}
            {step === 3 && 'Set your new password'}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s ? 'bg-green-500 text-white' : step === s ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <CheckCircle2 size={18} /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="card shadow-md">
          {/* Step 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Gmail Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-3 text-gray-400" />
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com" className="form-input pl-10" />
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                {loading ? <Spinner /> : <><Mail size={18} /> Send OTP</>}
              </button>
            </form>
          )}

          {/* Step 2: Enter OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <p className="text-sm text-gray-500 text-center">OTP sent to <strong className="text-gray-700">{email}</strong></p>

              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={otpRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  />
                ))}
              </div>
              {fieldErrors.otp && (
                <p className="text-center text-xs text-red-500 flex items-center justify-center gap-1"><AlertCircle size={12} /> {fieldErrors.otp}</p>
              )}

              <button type="submit" disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2">
                {loading ? <Spinner /> : <><KeyRound size={18} /> Verify OTP</>}
              </button>

              <div className="text-center">
                <button type="button" onClick={handleResendOtp} disabled={loading}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline">
                  Didn't receive OTP? Resend
                </button>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.password}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input required type={showConfirm ? 'text' : 'password'} value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white transition-all" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {confirmPassword && password && (
                  <p className={`mt-1.5 text-xs flex items-center gap-1 ${
                    password === confirmPassword ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {password === confirmPassword
                      ? <><CheckCircle2 size={12} /> Passwords match</>
                      : '✗ Passwords do not match'}
                  </p>
                )}
                {fieldErrors.confirm && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {fieldErrors.confirm}</p>
                )}
              </div>

              <button type="submit" disabled={loading}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2 mt-2">
                {loading ? <Spinner /> : <><Lock size={18} /> Reset Password</>}
              </button>
            </form>
          )}

          <div className="text-center mt-6">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-blue-600 transition-colors">
              <ArrowLeft size={16} /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
