import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Send, CheckCircle, AlertCircle, Loader, ArrowLeft } from 'lucide-react'
import api from '../../services/api'
import { showSuccess, showError } from '../../utils/toast'

export default function RequestLeave() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    date: '',
    session: 'morning',
    reason: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.date) {
      showError('Please select a date')
      return
    }

    // Check if date is in future
    const selectedDate = new Date(formData.date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (selectedDate <= today) {
      showError('Please select a future date')
      return
    }

    setLoading(true)
    try {
      await api.post('/doctor/off-duty/request', formData)
      showSuccess('Leave request submitted successfully')
      setSubmitted(true)
      setTimeout(() => {
        setFormData({ date: '', session: 'morning', reason: '' })
        setSubmitted(false)
        navigate('/doctor')
      }, 2000)
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to submit leave request')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 rounded-full blur-lg"></div>
                <CheckCircle className="w-20 h-20 text-green-600 relative" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Leave Request Submitted</h2>
            <p className="text-gray-600 text-lg mb-8">
              Your leave request has been successfully submitted. Our admin team will review it and notify you soon.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
              <p className="text-green-800 font-medium">
                📧 You'll receive an email notification once your request is approved or rejected.
              </p>
            </div>
            <button
              onClick={() => navigate('/doctor')}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => navigate('/doctor')}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Go back to dashboard"
          >
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Request Leave</h1>
            <p className="text-gray-600 mt-2">Submit a leave request for any date. Your admin team will review and notify you.</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Date Input */}
            <div>
              <label className="form-label flex items-center gap-2 mb-3">
                <Calendar size={20} className="text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">Select Date</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 text-gray-900 font-medium"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              <p className="text-sm text-gray-500 mt-2">Select a future date for your leave</p>
            </div>

            {/* Session Selection */}
            <div>
              <label className="form-label flex items-center gap-2 mb-4">
                <Clock size={20} className="text-blue-600" />
                <span className="text-lg font-semibold text-gray-900">Select Session</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { value: 'morning', label: 'Morning Session', time: '6 AM - 12 PM' },
                  { value: 'afternoon', label: 'Afternoon Session', time: '12 PM - 6 PM' }
                ].map(session => (
                  <label
                    key={session.value}
                    className={`p-5 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.session === session.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="session"
                        value={session.value}
                        checked={formData.session === session.value}
                        onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{session.label}</div>
                        <div className="text-sm text-gray-500">{session.time}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Reason (Optional) */}
            <div>
              <label className="form-label flex items-center gap-2 mb-3">
                <span className="text-lg font-semibold text-gray-900">Reason</span>
                <span className="text-xs text-gray-400">(Optional)</span>
              </label>
              <textarea
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 text-gray-900 font-medium"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Enter reason for your leave request (e.g., Medical appointment, Personal matter, etc.)"
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-2">Help your admin team understand your leave request</p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Submit Leave Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* Information Boxes */}
        <div className="space-y-4">
          {/* What happens next */}
          <div className="bg-blue-50 border-l-4 border-blue-600 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-gray-900 mb-1">What happens next?</p>
                <p className="text-gray-700 text-sm">
                  Admin will review your request within 24 hours. If approved, all patients with appointments during your leave will be automatically notified to reschedule.
                </p>
              </div>
            </div>
          </div>

          {/* Important note */}
          <div className="bg-amber-50 border-l-4 border-amber-600 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-gray-900 mb-1">Important</p>
                <p className="text-gray-700 text-sm">
                  Only request leave for future dates. You can only request leave for one session at a time. To request the entire day, submit separate requests for both morning and afternoon.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
