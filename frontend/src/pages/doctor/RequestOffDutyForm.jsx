import React, { useState } from 'react'
import { Calendar, Clock, Send, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import api from '../../services/api'
import { showSuccess, showError } from '../../utils/toast'

export default function RequestOffDutyForm() {
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
      showSuccess('Off-duty request submitted successfully')
      setSubmitted(true)
      setTimeout(() => {
        setFormData({ date: '', session: 'morning', reason: '' })
        setSubmitted(false)
      }, 3000)
    } catch (error) {
      showError(error.response?.data?.message || 'Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">Request Submitted</h2>
          <p className="text-green-700">Your off-duty request has been submitted. Admin will review and notify you soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card p-8">
        <h1 className="section-title mb-2">Request Off-Duty</h1>
        <p className="text-gray-600 mb-8">Submit a request for time off. Patients will be notified if approved.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date Input */}
          <div>
            <label className="form-label flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Select Date
            </label>
            <input
              type="date"
              className="form-input"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Select the date you want off</p>
          </div>

          {/* Session Selection */}
          <div>
            <label className="form-label flex items-center gap-2">
              <Clock size={18} className="text-blue-600" />
              Session
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'morning', label: 'Morning (6 AM - 12 PM)' },
                { value: 'afternoon', label: 'Afternoon (12 PM - 6 PM)' }
              ].map(session => (
                <label
                  key={session.value}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.session === session.value
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="session"
                    value={session.value}
                    checked={formData.session === session.value}
                    onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                    className="mr-2"
                  />
                  <span className="font-medium text-gray-900">{session.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason (Optional) */}
          <div>
            <label className="form-label">Reason (Optional)</label>
            <textarea
              className="form-input"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Enter reason for off-duty request..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Request
              </>
            )}
          </button>
        </form>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">What happens next?</p>
            <p>Admin will review your request. If approved, all patients with appointments that day will receive an email asking them to reschedule.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
