import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, User, CheckCircle, ChevronRight, Check, AlertCircle, Activity } from 'lucide-react'
import api from '../../services/api'
import { showSuccess, showError } from '../../utils/toast'

const timeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '04:00 PM', '04:30 PM', '05:00 PM']

export default function BookAppointment() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [doctors, setDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [medicalNotes, setMedicalNotes] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoadingDoctors(true)
        const res = await api.get('/doctors')
        setDoctors(res.data.data || [])
      } catch (err) {
        console.error('Error fetching doctors:', err)
        setError('Failed to load doctors. Please try again later.')
      } finally {
        setLoadingDoctors(false)
      }
    }
    fetchDoctors()
  }, [])

  const getLocalDateString = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
4:56:02 pm [vite] http proxy error: /api/v1/auth/google-login?_t=1774437962609
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1134:18)
    at afterConnectMultiple (node:net:1715:7)
4:56:17 pm [vite] http proxy error: /api/v1/auth/google-login?_t=1774437977000
AggregateError [ECONNREFUSED]:
    at internalConnectMultiple (node:net:1134:18)
    at afterConnectMultiple (node:net:1715:7)
  const handleBooking = async () => {
    try {
      setBookingLoading(true)
      setError(null)
      
      const payload = {
        doctor: selectedDoctor,
        date: selectedDate,
        timeSlot: selectedTime,
        reason: medicalNotes || 'General Consultation',
      }

      await api.post('/appointments', payload)
      
      showSuccess('Appointment booked successfully!')
      setStep(4) // Successful booking step
      
      setTimeout(() => {
        navigate('/patient/dashboard')
      }, 5000)
    } catch (err) {
      console.error('Booking failed:', err)
      const errorMsg = err.response?.data?.message || 'Booking failed. Please check your data.'
      setError(errorMsg)
      showError(errorMsg) // ✅ Show toast notification
    } finally {
      setBookingLoading(false)
    }
  }

  const selectedDocObj = doctors.find(d => d._id === selectedDoctor)

  if (loadingDoctors) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="section-title">Book Appointment</h1>
        <p className="section-subtitle">Schedule a consultation with our expert doctors</p>
      </div>

      {step < 4 && (
        <div className="flex items-center justify-between relative mb-8">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
          {[
            { num: 1, label: 'Select Doctor' },
            { num: 2, label: 'Choose Date & Slot' },
            { num: 3, label: 'Confirm Booking' }
          ].map((s, i) => (
            <div key={s.num} className="flex items-center gap-3 bg-gray-50 px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-300 ${step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                {step > s.num ? <Check size={16} /> : s.num}
              </div>
              <span className={`text-sm font-semibold hidden md:block ${step >= s.num ? 'text-blue-600' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl shadow-sm text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="card shadow-sm border border-gray-100 p-6 md:p-8">
        {step === 1 && (
          <div className="animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <User className="text-blue-600" /> Select a Specialist
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {doctors.length > 0 ? doctors.map(d => (
                <div key={d._id}
                  onClick={() => setSelectedDoctor(d._id)}
                  className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-200 flex items-center gap-4 ${selectedDoctor === d._id
                      ? 'border-blue-600 bg-blue-50/50 shadow-md transform scale-[1.02]'
                      : 'border-gray-100 hover:border-blue-300 hover:shadow-sm bg-white'
                    }`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-colors ${selectedDoctor === d._id ? 'bg-blue-600 text-white shadow-inner' : 'bg-blue-100 text-blue-600'
                    }`}>
                    {d.user?.name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Dr. {d.user?.name}</h3>
                    <p className="text-sm font-semibold text-blue-600">{d.specialization}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><Clock size={12} />{d.experience} Years Exp.</p>
                  </div>
                </div>
              )) : (
                <p className="col-span-2 text-center py-10 text-gray-400">No doctors available for booking.</p>
              )}
            </div>
            <div className="mt-8 flex justify-end">
              <button
                disabled={!selectedDoctor}
                onClick={() => setStep(2)}
                className="btn-primary flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed">
                Continue <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="text-blue-600" /> Choose Schedule
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="form-group mb-0">
                <label className="form-label text-base">Select Date</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-4 top-3.5 text-blue-600" />
                  <input type="date" className="form-input pl-12 py-3 text-base shadow-sm border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    min={getLocalDateString(new Date())} />
                </div>
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-base">Available Time Slots</label>
                <div className="grid grid-cols-3 gap-3">
                  {timeSlots.map(time => (
                    <button key={time} onClick={() => setSelectedTime(time)} disabled={!selectedDate}
                      className={`py-2 px-1 text-sm font-semibold rounded-xl border-2 transition-all duration-200 ${!selectedDate ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50 text-gray-400' :
                          selectedTime === time
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.05]'
                            : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 bg-white'
                        }`}>
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-10 flex justify-between pt-6 border-t border-gray-100">
              <button onClick={() => setStep(1)} className="btn-secondary px-6">Back</button>
              <button disabled={!selectedDate || !selectedTime} onClick={() => setStep(3)}
                className="btn-primary flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed">
                Next Step <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fadeIn max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Confirm Your Appointment</h2>
              <p className="text-gray-500 mt-2">Please review your booking details below.</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-1 rounded-2xl shadow-sm mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2"></div>
              <div className="bg-white rounded-xl p-6 relative z-10 border border-white">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-2xl font-bold shadow-inner">
                    {selectedDocObj?.user?.name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Dr. {selectedDocObj?.user?.name}</h3>
                    <p className="text-blue-600 font-medium">{selectedDocObj?.specialization}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                    <span className="text-gray-500 font-medium flex items-center gap-2"><Calendar size={16} className="text-blue-500" /> Date</span>
                    <span className="font-bold text-gray-900">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                    <span className="text-gray-500 font-medium flex items-center gap-2"><Clock size={16} className="text-blue-500" /> Time</span>
                    <span className="font-bold text-gray-900">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500 font-medium flex items-center gap-2"><User size={16} className="text-blue-500" /> Booking Type</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-sm">Consultation</span>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                    <Activity size={16} className="text-blue-500" /> Medical Notes / Symptoms
                  </label>
                  <textarea 
                    rows={3}
                    className="form-input bg-gray-50 border-gray-100 focus:bg-white resize-none"
                    placeholder="E.g., Chronic back pain, Penicillin allergy, or reason for visit..."
                    value={medicalNotes}
                    onChange={(e) => setMedicalNotes(e.target.value)}
                  />
                  <p className="text-[10px] text-gray-400 mt-2 italic">This information will be shared with your doctor for better diagnosis.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setStep(2)} className="btn-secondary px-6" disabled={bookingLoading}>Back</button>
              <button 
                onClick={handleBook} 
                disabled={bookingLoading}
                className="btn-primary flex items-center gap-2 px-8 py-3 text-base shadow-md hover:shadow-lg transition-all animate-pulse-slow disabled:opacity-50">
                {bookingLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <CheckCircle size={20} />
                )}
                {bookingLoading ? 'Processing...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="animate-fadeIn text-center p-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-emerald-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Booking Successful!</h2>
            <p className="text-gray-500 mb-8">Your appointment has been confirmed and stored. You are being redirected to your dashboard.</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => navigate('/patient/dashboard')} className="btn-primary px-8">Go to Dashboard Now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

