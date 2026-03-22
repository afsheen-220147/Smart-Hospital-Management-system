import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { PhoneOff, Video, User, Stethoscope, Clock, Loader2, AlertCircle } from 'lucide-react'

export default function VideoRoom() {
  const { appointmentId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const containerRef = useRef(null)
  const jitsiApiRef = useRef(null)
  const scriptLoadedRef = useRef(false)

  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [callStatus, setCallStatus] = useState('loading') // loading | ready | active | ended | error
  const [endingCall, setEndingCall] = useState(false)

  const isDoctor = user?.role === 'doctor'
  const isDemoAppt = String(appointmentId).startsWith('d')

  // Deterministic room name — obscure enough to be private
  const roomName = `medicarepro${appointmentId}`

  // ── Fetch appointment details ──────────────────────────────────────────────
  useEffect(() => {
    if (isDemoAppt) {
      setAppointment({ timeSlot: 'Demo Appointment', patient: { name: 'Demo Patient' }, doctor: { user: { name: 'Demo Doctor' } } })
      setLoading(false)
      return
    }
    api.get(`/appointments/${appointmentId}`)
      .then(res => setAppointment(res.data.data))
      .catch(() => setCallStatus('error'))
      .finally(() => setLoading(false))
  }, [appointmentId, isDemoAppt])

  // ── End-call handler ───────────────────────────────────────────────────────
  const handleEndCall = useCallback(async () => {
    if (endingCall) return
    setEndingCall(true)

    // Dispose Jitsi instance
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose() } catch (_) {}
      jitsiApiRef.current = null
    }
    setCallStatus('ended')

    try {
      if (!isDemoAppt) {
        if (isDoctor) {
          // Mark in-progress so diagnosis can be added
          await api.put(`/appointments/${appointmentId}`, { status: 'in-progress' })
        }
      }
    } catch (e) {
      console.error('Status update failed:', e)
    }

    if (isDoctor) {
      navigate('/doctor/diagnosis', {
        state: { selectedAppointmentId: appointmentId, fromVideo: true }
      })
    } else {
      navigate('/patient/appointments')
    }
  }, [appointmentId, isDoctor, isDemoAppt, navigate, endingCall])

  // ── Load Jitsi Meet ────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || callStatus === 'error') return

    const initJitsi = () => {
      if (!containerRef.current || jitsiApiRef.current) return

      const displayName = isDoctor
        ? `Dr. ${user?.name || 'Doctor'}`
        : (user?.name || 'Patient')

      const options = {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName,
          email: user?.email || '',
        },
        configOverwrite: {
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          enableWelcomePage: false,
          disableInviteFunctions: true,
          subject: 'MediCare+ Telemedicine Consultation',
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          DEFAULT_REMOTE_DISPLAY_NAME: isDoctor ? 'Patient' : 'Doctor',
          TOOLBAR_BUTTONS: [
            'microphone', 'camera', 'desktop', 'fullscreen',
            'fodeviceselection', 'hangup', 'chat',
            'raisehand', 'videoquality', 'tileview',
          ],
        },
      }

      try {
        jitsiApiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', options)
        jitsiApiRef.current.addEventListener('readyToClose', handleEndCall)
        jitsiApiRef.current.addEventListener('videoConferenceJoined', () => setCallStatus('active'))
        jitsiApiRef.current.addEventListener('videoConferenceLeft', handleEndCall)
        setCallStatus('active')
      } catch (err) {
        console.error('Jitsi init error:', err)
        setCallStatus('error')
      }
    }

    // Load external API script once
    if (window.JitsiMeetExternalAPI) {
      initJitsi()
      return
    }

    if (scriptLoadedRef.current) return
    scriptLoadedRef.current = true

    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'
    script.async = true
    script.onload = () => {
      setCallStatus('ready')
      initJitsi()
    }
    script.onerror = () => {
      console.error('Failed to load Jitsi script')
      setCallStatus('error')
    }
    document.head.appendChild(script)

    return () => {
      if (jitsiApiRef.current) {
        try { jitsiApiRef.current.dispose() } catch (_) {}
        jitsiApiRef.current = null
      }
    }
  }, [loading, callStatus, roomName, user, isDoctor, handleEndCall])

  // ── Derived display values ─────────────────────────────────────────────────
  const doctorName = appointment?.doctor?.user?.name || 'Doctor'
  const patientName = appointment?.patient?.name || 'Patient'
  const timeSlot = appointment?.timeSlot || ''

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <Loader2 size={48} className="animate-spin mx-auto text-blue-400" />
          <p className="text-lg font-medium">Setting up your consultation room…</p>
          <p className="text-gray-400 text-sm">This may take a few seconds</p>
        </div>
      </div>
    )
  }

  if (callStatus === 'error') {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-6">
        <div className="text-center text-white space-y-4 max-w-md">
          <AlertCircle size={56} className="mx-auto text-red-400" />
          <h2 className="text-2xl font-bold">Unable to start video call</h2>
          <p className="text-gray-400">Could not load the video conferencing service. Please check your internet connection and try again.</p>
          <button
            onClick={() => navigate(isDoctor ? '/doctor/appointments' : '/patient/appointments')}
            className="bg-white text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col">

      {/* ── Top Header Bar ── */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 text-white px-5 py-3 flex items-center justify-between shrink-0 z-20 shadow-lg">

        {/* Left: Branding + Appointment Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-inner">
              <Video size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">MediCare+ Telemedicine</p>
              <p className="text-blue-300 text-xs leading-tight">Secure Video Consultation</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-8 bg-blue-600/50 mx-1" />

          {/* Participant Info */}
          <div className="hidden sm:flex items-center gap-2 text-sm">
            {isDoctor ? (
              <>
                <User size={14} className="text-blue-300" />
                <span className="text-blue-200">Patient:</span>
                <span className="font-semibold text-white">{patientName}</span>
              </>
            ) : (
              <>
                <Stethoscope size={14} className="text-blue-300" />
                <span className="text-blue-200">Doctor:</span>
                <span className="font-semibold text-white">Dr. {doctorName}</span>
              </>
            )}
            {timeSlot && (
              <>
                <span className="text-blue-600 mx-1">•</span>
                <Clock size={14} className="text-blue-300" />
                <span className="text-blue-200">{timeSlot}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Status + End Button */}
        <div className="flex items-center gap-3">
          {callStatus === 'active' && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs bg-green-500/20 text-green-300 px-3 py-1.5 rounded-full border border-green-500/30 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          )}
          {callStatus === 'loading' || callStatus === 'ready' ? (
            <span className="hidden sm:flex items-center gap-1.5 text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1.5 rounded-full border border-yellow-500/30 font-semibold">
              <Loader2 size={12} className="animate-spin" />
              Connecting…
            </span>
          ) : null}

          <button
            onClick={handleEndCall}
            disabled={endingCall}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg"
          >
            <PhoneOff size={15} />
            <span className="hidden sm:inline">
              {isDoctor ? 'End & Add Diagnosis' : 'Leave Call'}
            </span>
            <span className="sm:hidden">End</span>
          </button>
        </div>
      </div>

      {/* ── Jitsi Meet Container ── */}
      <div
        ref={containerRef}
        className="flex-1 w-full"
        style={{ minHeight: 0 }}
      />

      {/* ── Info Bar (Doctor only) ── */}
      {isDoctor && callStatus === 'active' && (
        <div className="bg-blue-950 text-blue-300 text-xs px-5 py-2 text-center shrink-0">
          Click <strong className="text-white">"End &amp; Add Diagnosis"</strong> above when the consultation is complete to record diagnosis &amp; prescription.
        </div>
      )}
    </div>
  )
}
