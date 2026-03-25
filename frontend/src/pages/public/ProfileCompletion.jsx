import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { User, Phone, MapPin, Heart, Ruler, Weight, AlertCircle, ArrowRight, CheckCircle } from 'lucide-react'
import { showSuccess, showError } from '../../utils/toast'

export default function ProfileCompletion() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    gender: '',
    bloodGroup: '',
    weight: '',
    height: '',
    dateOfBirth: '',
    emergencyContact: ''
  })

  const email = location.state?.email || ''

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Save profile details using public endpoint (no auth required)
      const res = await fetch('/api/v1/auth/register/complete-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          phone: formData.phone,
          address: formData.address,
          gender: formData.gender,
          bloodGroup: formData.bloodGroup,
          weight: formData.weight ? parseInt(formData.weight) : null,
          height: formData.height ? parseInt(formData.height) : null,
          dateOfBirth: formData.dateOfBirth,
          emergencyContact: formData.emergencyContact
        })
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.message || 'Failed to save profile')
      }

      showSuccess('Profile completed successfully!')
      
      // Redirect to login with email
      navigate('/login', { 
        state: { 
          registered: true, 
          email: email,
          profileCompleted: true 
        } 
      })
    } catch (err) {
      showError(err.message || 'Failed to save profile details')
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    navigate('/login', { 
      state: { 
        registered: true, 
        email: email 
      } 
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold">
              N
            </div>
            <div>
              <h1 className="font-bold text-gray-900">NeoTherapy</h1>
              <p className="text-xs text-gray-500">Complete Your Profile</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Profile Setup</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card p-0 overflow-hidden">
          {/* Intro */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 border border-white/30">
                <Heart size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Complete Your Health Profile</h2>
                <p className="text-blue-100">
                  Help us provide you with personalized healthcare. Share your basic health information to unlock all features.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider text-gray-600">Personal Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Gender *</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Residential Address</label>
                    <div className="relative">
                      <MapPin size={18} className="absolute left-3 top-3 text-gray-400" />
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter your full address"
                        rows="2"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Health Information */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider text-gray-600">Health Information</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Blood Group</label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="">Select Blood Group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <Weight size={16} /> Weight (kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder="e.g., 65"
                      step="0.1"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <Ruler size={16} /> Height (cm)
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      placeholder="e.g., 175"
                      step="0.1"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Emergency Contact</label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3 top-3 text-gray-400" />
                      <input
                        type="tel"
                        name="emergencyContact"
                        value={formData.emergencyContact}
                        onChange={handleChange}
                        placeholder="+91 99887 76655"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> You can update these details anytime from your profile. Only gender is required to proceed.
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  className="flex-1 px-6 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-lg transition-all"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.gender}
                  className="flex-1 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} /> Complete & Login
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            This information helps us provide better healthcare recommendations and personalized service.
          </p>
        </div>
      </div>
    </div>
  )
}
