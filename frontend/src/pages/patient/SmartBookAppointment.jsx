import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Calendar, Clock, User, CheckCircle, ChevronRight, Check, AlertCircle, 
  Activity, Star, MessageSquare, Users, Bell, Loader2, RefreshCw, Video, MapPin
} from 'lucide-react'
import api from '../../services/api'
import { showSuccess, showError, showInfo } from '../../utils/toast'

// Visit types with their descriptions
const VISIT_TYPES = [
  { key: 'First Consultation', label: 'First Consultation', duration: 30, description: 'Initial visit for new patients' },
  { key: 'Follow-up', label: 'Follow-up Visit', duration: 15, description: 'Follow-up for existing condition' },
  { key: 'Routine Checkup', label: 'Routine Checkup', duration: 20, description: 'Regular health checkup' },
  { key: 'Emergency', label: 'Emergency', duration: 20, description: 'Urgent consultation' },
]

export default function SmartBookAppointment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState(1)
  
  // Doctor selection
  const [doctors, setDoctors] = useState([])
  const [loadingDoctors, setLoadingDoctors] = useState(true)
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  
  // Visit type
  const [selectedVisitType, setSelectedVisitType] = useState('First Consultation')
  const [consultationTypes, setConsultationTypes] = useState([])
  
  // Date & Time
  const [selectedDate, setSelectedDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTime, setSelectedTime] = useState('')
  
  // Booking details
  const [medicalNotes, setMedicalNotes] = useState('')
  const [consultationType, setConsultationType] = useState('in-person')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [noShowPrediction, setNoShowPrediction] = useState(null)
  
  // Waitlist
  const [showWaitlistModal, setShowWaitlistModal] = useState(false)
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  
  // Natural language
  const [nlInput, setNlInput] = useState('')
  const [showNlInput, setShowNlInput] = useState(false)
  
  const [error, setError] = useState(null)

  // Fetch doctors
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

  // Pre-fill consultation type from URL param on mount
  useEffect(() => {
    const typeParam = searchParams.get('type')
    if (typeParam === 'online' || typeParam === 'in-person') {
      setConsultationType(typeParam)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Pre-select doctor from URL param once doctors list has loaded
  useEffect(() => {
    if (loadingDoctors || doctors.length === 0) return
    const doctorId = searchParams.get('doctorId')
    const typeParam = searchParams.get('type')
    if (!doctorId) return
    const found = doctors.find(d => d._id === doctorId)
    if (found) {
      setSelectedDoctor(doctorId)
      // Both doctor AND consultation type were provided → skip Step 1 entirely
      if (typeParam) setStep(2)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctors, loadingDoctors])

  // Fetch consultation types when doctor is selected
  useEffect(() => {
    if (selectedDoctor) {
      const fetchConsultationTypes = async () => {
        try {
          const res = await api.get(`/scheduling/consultation-types/${selectedDoctor}`)
          if (res.data.data?.length > 0) {
            setConsultationTypes(res.data.data)
          }
        } catch (err) {
          console.error('Error fetching consultation types:', err)
          // Use default types if fetch fails
        }
      }
      fetchConsultationTypes()
    }
  }, [selectedDoctor])

  // Fetch available slots when date or visit type changes
  const fetchSlots = useCallback(async () => {
    if (!selectedDoctor || !selectedDate) return
    
    try {
      setLoadingSlots(true)
      setAvailableSlots([])
      setSelectedTime('')
      
      const res = await api.get(`/scheduling/slots/${selectedDoctor}`, {
        params: { date: selectedDate, visitType: selectedVisitType }
      })
      
      setAvailableSlots(res.data.data || [])
    } catch (err) {
      console.error('Error fetching slots:', err)
      showError('Failed to load available slots')
    } finally {
      setLoadingSlots(false)
    }
  }, [selectedDoctor, selectedDate, selectedVisitType])

  useEffect(() => {
    if (selectedDate) {
      fetchSlots()
    }
  }, [selectedDate, selectedVisitType, fetchSlots])

  // Handle smart booking
  const handleBook = async () => {
    try {
      setBookingLoading(true)
      setError(null)
      
      const payload = {
        doctorId: selectedDoctor,
        date: selectedDate,
        timeSlot: selectedTime,
        visitType: selectedVisitType,
        reason: medicalNotes || 'General Consultation',
        consultationType,
      }

      const res = await api.post('/scheduling/book', payload)
      
      // Store no-show prediction for display
      if (res.data.noShowPrediction) {
        setNoShowPrediction(res.data.noShowPrediction)
      }
      
      showSuccess('Appointment booked successfully!')
      setStep(4) // Success step
      
      setTimeout(() => {
        navigate('/patient/appointments')
      }, 5000)
    } catch (err) {
      console.error('Booking failed:', err)
      const message = err.response?.data?.message || 'Booking failed. Please try again.'
      setError(message)
      showError(message)
    } finally {
      setBookingLoading(false)
    }
  }

  // Handle joining waitlist
  const handleJoinWaitlist = async () => {
    try {
      setWaitlistLoading(true)
      
      await api.post('/scheduling/waitlist/join', {
        doctorId: selectedDoctor,
        requestedDate: selectedDate,
        visitType: selectedVisitType,
        reason: medicalNotes || 'General Consultation',
      })
      
      showSuccess('You have been added to the waitlist! We\'ll notify you when a slot opens.')
      setShowWaitlistModal(false)
      navigate('/patient/appointments')
    } catch (err) {
      console.error('Waitlist join failed:', err)
      showError(err.response?.data?.message || 'Failed to join waitlist')
    } finally {
      setWaitlistLoading(false)
    }
  }

  // Handle natural language parsing
  const handleNlParse = async () => {
    if (!nlInput.trim()) return
    
    try {
      const res = await api.post('/scheduling/parse-request', {
        text: nlInput,
        doctorId: selectedDoctor
      })
      
      const parsed = res.data.parsedRequest
      
      if (parsed.date) {
        setSelectedDate(parsed.date.split('T')[0])
      }
      if (parsed.visitType) {
        setSelectedVisitType(parsed.visitType)
      }
      
      showInfo('Request parsed! You can modify the options below.')
      setShowNlInput(false)
    } catch (err) {
      showError('Could not understand your request. Please try again.')
    }
  }

  const selectedDocObj = doctors.find(d => d._id === selectedDoctor)
  const selectedVisitTypeObj = consultationTypes.find(ct => ct.name === selectedVisitType) || 
    VISIT_TYPES.find(vt => vt.key === selectedVisitType)

  // Generate next 14 days for date selection
  const getDateOptions = () => {
    const dates = []
    const today = new Date()
    for (let i = 0; i < 14; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      
      // Format date as YYYY-MM-DD in LOCAL time (IST), not UTC
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const localDateString = `${year}-${month}-${day}`
      
      dates.push({
        value: localDateString,
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        isToday: i === 0,
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' })
      })
    }
    return dates
  }

  if (loadingDoctors) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="section-title flex items-center gap-2">
            <Star className="text-yellow-500" size={28} />
            Smart Appointment Booking
          </h1>
          <p className="section-subtitle">AI-powered scheduling optimized for your convenience</p>
        </div>
        {step === 2 && (
          <button
            onClick={() => setShowNlInput(!showNlInput)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <MessageSquare size={16} />
            {showNlInput ? 'Hide' : 'Use Natural Language'}
          </button>
        )}
      </div>

      {/* Progress Steps */}
      {step < 4 && (
        <div className="flex items-center justify-between relative mb-8">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
          {[
            { num: 1, label: 'Select Doctor' },
            { num: 2, label: 'Choose Schedule' },
            { num: 3, label: 'Confirm Booking' }
          ].map((s) => (
            <div key={s.num} className="flex items-center gap-3 bg-gray-50 px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm transition-all duration-300 ${
                step >= s.num ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
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

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl shadow-sm text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Natural Language Input */}
      {showNlInput && step === 2 && (
        <div className="card p-4 border-2 border-blue-200 bg-blue-50/50 animate-fadeIn">
          <label className="text-sm font-semibold text-blue-700 mb-2 block">
            Describe your preferred appointment time:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={nlInput}
              onChange={(e) => setNlInput(e.target.value)}
              placeholder='e.g.,"I want to see the doctor tomorrow morning"'
              className="form-input flex-1 bg-white"
            />
            <button onClick={handleNlParse} className="btn-primary px-4">
              Parse
            </button>
          </div>
        </div>
      )}

      <div className="card shadow-sm border border-gray-100 p-6 md:p-8">

        {/* Active consultation type reminder badge (shown in steps 2 & 3) */}
        {step >= 2 && step < 4 && (
          <div className={`flex items-center gap-2 mb-6 px-4 py-2.5 rounded-xl text-sm font-semibold w-fit ${
            consultationType === 'online'
              ? 'bg-blue-600 text-white'
              : 'bg-purple-600 text-white'
          }`}>
            {consultationType === 'online' ? <Video size={15} /> : <MapPin size={15} />}
            {consultationType === 'online' ? 'Online Video Call' : 'In-Person Visit'}
            <button
              onClick={() => setStep(1)}
              className="ml-2 text-white/70 hover:text-white text-xs underline underline-offset-2 font-normal"
            >
              (change)
            </button>
          </div>
        )}

        {/* Step 1: Select Doctor & Visit Type */}
        {step === 1 && (
          <div className="animate-fadeIn space-y-8">

            {/* ── Consultation Mode Selection (FIRST — most important choice) ── */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Video className="text-blue-600" /> How would you like to consult?
                <span className="ml-auto text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Required</span>
              </h2>
              <p className="text-sm text-gray-400 mb-4">Select consultation mode before picking a doctor.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setConsultationType('in-person')}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all shadow-sm ${
                    consultationType === 'in-person'
                      ? 'border-purple-600 bg-purple-50 shadow-md ring-2 ring-purple-200'
                      : 'border-gray-200 hover:border-purple-300 bg-white'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    consultationType === 'in-person' ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-500'
                  }`}>
                    <MapPin size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-base">In-Person Visit</p>
                    <p className="text-sm text-gray-500 mt-0.5">Visit the hospital. Best for physical exams.</p>
                  </div>
                  {consultationType === 'in-person' && <CheckCircle size={22} className="text-purple-600 flex-shrink-0" />}
                </button>

                <button
                  type="button"
                  onClick={() => setConsultationType('online')}
                  className={`flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all shadow-sm ${
                    consultationType === 'online'
                      ? 'border-blue-600 bg-blue-50 shadow-md ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    consultationType === 'online' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-500'
                  }`}>
                    <Video size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-base">Online Video Call</p>
                    <p className="text-sm text-gray-500 mt-0.5">Consult from home via secure video. No travel needed.</p>
                  </div>
                  {consultationType === 'online' && <CheckCircle size={22} className="text-blue-600 flex-shrink-0" />}
                </button>
              </div>
            </div>

            {/* Visit Type Selection */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="text-blue-600" /> What type of visit?
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {VISIT_TYPES.map((vt) => (
                  <button
                    key={vt.key}
                    onClick={() => setSelectedVisitType(vt.key)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedVisitType === vt.key
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{vt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{vt.duration} min</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Doctor Selection */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <User className="text-blue-600" /> Select a Specialist
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {doctors.length > 0 ? doctors.map(d => (
                  <div 
                    key={d._id}
                    onClick={() => setSelectedDoctor(d._id)}
                    className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-200 flex items-center gap-4 ${
                      selectedDoctor === d._id
                        ? 'border-blue-600 bg-blue-50/50 shadow-md transform scale-[1.02]'
                        : 'border-gray-100 hover:border-blue-300 hover:shadow-sm bg-white'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-colors ${
                      selectedDoctor === d._id ? 'bg-blue-600 text-white shadow-inner' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {d.user?.name?.charAt(0) || 'D'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">Dr. {d.user?.name}</h3>
                      <p className="text-sm font-semibold text-blue-600">{d.specialization}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock size={12} />{d.experience} Years
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Star size={12} className="text-yellow-500" />{d.ratings || 4.5}
                        </span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="col-span-2 text-center py-10 text-gray-400">No doctors available.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <button
                disabled={!selectedDoctor}
                onClick={() => setStep(2)}
                className="btn-primary flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Date & Time Selection */}
        {step === 2 && (
          <div className="animate-fadeIn space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="text-blue-600" /> Choose Your Schedule
            </h2>

            {/* Date Selection - Horizontal Scroll */}
            <div>
              <label className="form-label text-base mb-3">Select Date</label>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2">
                {getDateOptions().map((date) => (
                  <button
                    key={date.value}
                    onClick={() => setSelectedDate(date.value)}
                    className={`flex-shrink-0 p-3 rounded-xl border-2 text-center min-w-[80px] transition-all ${
                      selectedDate === date.value
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className={`text-xs font-medium ${
                      selectedDate === date.value ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {date.isToday ? 'Today' : date.label.split(',')[0]}
                    </div>
                    <div className="text-lg font-bold">{date.label.split(' ')[1]}</div>
                    <div className={`text-xs ${
                      selectedDate === date.value ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {date.label.split(' ')[2]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="form-label text-base mb-0">Available Time Slots</label>
                {loadingSlots && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
              </div>
              
              {!selectedDate ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                  Please select a date first
                </div>
              ) : loadingSlots ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl">
                  <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-2" />
                  Loading available slots...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8 bg-yellow-50 rounded-xl border border-yellow-200">
                  <AlertCircle className="w-10 h-10 mx-auto text-yellow-500 mb-2" />
                  <p className="text-gray-700 font-medium">No slots available on this date</p>
                  <p className="text-sm text-gray-500 mt-1">Would you like to join the waitlist?</p>
                  <button
                    onClick={() => setShowWaitlistModal(true)}
                    className="mt-4 btn-primary flex items-center gap-2 mx-auto"
                  >
                    <Users size={16} /> Join Waitlist
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {availableSlots.map((slot, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedTime(slot.startTime)}
                      className={`py-3 px-2 text-sm font-semibold rounded-xl border-2 transition-all ${
                        selectedTime === slot.startTime
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.05]'
                          : slot.isOverbooking
                          ? 'border-yellow-300 text-yellow-700 bg-yellow-50 hover:border-yellow-400'
                          : 'border-gray-200 text-gray-700 hover:border-blue-400 hover:bg-blue-50 bg-white'
                      }`}
                    >
                      <div>{slot.startTime}</div>
                      {slot.isOverbooking && (
                        <div className="text-[10px] mt-1 text-yellow-600">Limited</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected slot info */}
            {selectedTime && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <CheckCircle className="text-green-600" />
                <div>
                  <p className="font-medium text-green-800">
                    Selected: {selectedDate} at {selectedTime}
                  </p>
                  <p className="text-sm text-green-600">
                    Duration: {selectedVisitTypeObj?.duration || 30} min &nbsp;•&nbsp;
                    {consultationType === 'online' ? '🎥 Online Video Call' : '🏥 In-Person Visit'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-6 border-t border-gray-100">
              <button onClick={() => setStep(1)} className="btn-secondary px-6">Back</button>
              <button 
                disabled={!selectedDate || !selectedTime}
                onClick={() => setStep(3)}
                className="btn-primary flex items-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="animate-fadeIn max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Confirm Your Appointment</h2>
              <p className="text-gray-500 mt-2">Please review your booking details below.</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 p-1 rounded-2xl shadow-sm mb-8">
              <div className="bg-white rounded-xl p-6 border border-white">
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
                    <span className="text-gray-500 font-medium flex items-center gap-2">
                      <Activity size={16} className="text-blue-500" /> Visit Type
                    </span>
                    <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md text-sm">
                      {selectedVisitType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                    <span className="text-gray-500 font-medium flex items-center gap-2">
                      {consultationType === 'online' ? <Video size={16} className="text-blue-500" /> : <MapPin size={16} className="text-blue-500" />} Consultation
                    </span>
                    <span className={`font-bold px-2 py-0.5 rounded-md text-sm flex items-center gap-1 ${
                      consultationType === 'online' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'
                    }`}>
                      {consultationType === 'online' ? <><Video size={12} /> Online Video Call</> : <><MapPin size={12} /> In-Person Visit</>}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                    <span className="text-gray-500 font-medium flex items-center gap-2">
                      <Calendar size={16} className="text-blue-500" /> Date
                    </span>
                    <span className="font-bold text-gray-900">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dashed border-gray-200">
                    <span className="text-gray-500 font-medium flex items-center gap-2">
                      <Clock size={16} className="text-blue-500" /> Time
                    </span>
                    <span className="font-bold text-gray-900">{selectedTime}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500 font-medium flex items-center gap-2">
                      <Clock size={16} className="text-blue-500" /> Duration
                    </span>
                    <span className="font-bold text-gray-900">
                      {selectedVisitTypeObj?.duration || 30} minutes
                    </span>
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
                </div>

                {/* Reminder notice */}
                <div className="mt-4 bg-blue-50 rounded-lg p-3 flex items-start gap-2">
                  <Bell size={16} className="text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-700">
                    You'll receive a reminder 24 hours before your appointment.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button onClick={() => setStep(2)} className="btn-secondary px-6" disabled={bookingLoading}>
                Back
              </button>
              <button 
                onClick={handleBook} 
                disabled={bookingLoading}
                className="btn-primary flex items-center gap-2 px-8 py-3 text-base shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {bookingLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle size={20} />
                )}
                {bookingLoading ? 'Processing...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="animate-fadeIn text-center p-12">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={48} className="text-emerald-600" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Booking Successful!</h2>
            <p className="text-gray-500 mb-6">
              Your appointment has been confirmed. You'll receive a confirmation email shortly.
            </p>
            
            {noShowPrediction && noShowPrediction.recommendations?.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
                <p className="font-medium text-yellow-800 mb-2">📋 Tips for your appointment:</p>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {noShowPrediction.recommendations.map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-center gap-4">
              <button onClick={() => navigate('/patient/appointments')} className="btn-primary px-8">
                View My Appointments
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Waitlist Modal */}
      {showWaitlistModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fadeIn">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Join the Waitlist</h3>
              <p className="text-gray-500 mt-2">
                We'll notify you immediately when a slot opens up on {selectedDate}.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600">
                <strong>How it works:</strong>
                <br />• You'll be added to the queue
                <br />• When someone cancels, you'll get an email
                <br />• First come, first served
              </p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setShowWaitlistModal(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleJoinWaitlist}
                disabled={waitlistLoading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {waitlistLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Bell size={18} />
                )}
                {waitlistLoading ? 'Joining...' : 'Join Waitlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
