import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Video, User, CheckCircle, XCircle, MapPin } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

export default function DoctorAppointments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [doctorProfile, setDoctorProfile] = useState(null)

  const isDemoDoctor = user?.email === 'sneha@medicare.com' || user?.email === 'suresh@medicare.com'

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        let realAppts = []
        if (user?._id || user?.id) {
          const profRes = await api.get('/doctors/me')
          const profile = profRes.data.data
          setDoctorProfile(profile)

          const apptRes = await api.get(`/appointments/doctor/${profile._id}`)
          realAppts = apptRes.data.data || []
        }

        if (isDemoDoctor) {
          const demoAppts = [
            { _id: 'd1', timeSlot: '10:30 AM', patient: { name: 'Venkat R.' }, reason: 'Consultation', status: 'Upcoming', type: 'In-person' },
            { _id: 'd2', timeSlot: '11:00 AM', name: 'Rahul K.', patient: { name: 'Rahul K.' }, reason: 'Follow-up', status: 'Upcoming', type: 'In-person' },
            { _id: 'd3', timeSlot: '11:30 AM', patient: { name: 'Anitha S.' }, reason: 'Consultation', status: 'Upcoming', type: 'Online Call' },
            { _id: 'd4', timeSlot: '12:00 PM', patient: { name: 'Karthik M.' }, reason: 'Review', status: 'Completed', type: 'In-person' },
            { _id: 'd5', timeSlot: '02:00 PM', patient: { name: 'Lakshmi V.' }, reason: 'Consultation', status: 'Cancelled', type: 'Online Call' },
          ]
          setAppointments([...demoAppts, ...realAppts])
        } else {
          setAppointments(realAppts)
        }
      } catch (err) {
        console.error("Error fetching doctor appointments:", err)
      } finally {
        setLoading(false)
      }
    }

    if (user) fetchData()
  }, [user, isDemoDoctor])

  const handleStatusUpdate = async (appt, newStatus) => {
    const id = appt._id
    const isDemoItem = String(id).startsWith('d')

    if (!isDemoItem) {
      try {
        await api.put(`/appointments/${id}`, { status: newStatus })
      } catch (err) {
        console.error("Error updating appointment status:", err)
      }
    }

    setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: newStatus } : a))

    if (newStatus === 'in-progress') {
      navigate('/doctor/diagnosis', {
        state: {
          selectedAppointmentId: id,
          patientName: appt.patient?.name
        }
      })
    }
  }

  // Determine if an appointment is an online video consultation
  const isOnline = (app) =>
    app.consultationType === 'online' || app.type === 'Online Call'

  const handleStartVideoCall = (app) => {
    navigate(`/video-room/${app._id}`)
  }

  const handleStartConsultation = async (app) => {
    await handleStatusUpdate(app, 'in-progress')
  }

  const filtered = appointments.filter(a => {
    if (filter === 'All') return true
    const s = a.status.toLowerCase()
    if (filter === 'Upcoming') return s === 'upcoming' || s === 'confirmed' || s === 'pending'
    return s === filter.toLowerCase()
  }).sort((a, b) => {
    // In-progress priority
    if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
    if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;

    // Status sorting
    const statusValues = {
      'pending': 1,
      'upcoming': 1,
      'confirmed': 1,
      'completed': 2,
      'cancelled': 3
    };
    const valA = statusValues[a.status.toLowerCase()] || 99;
    const valB = statusValues[b.status.toLowerCase()] || 99;
    if (valA !== valB) return valA - valB;

    if (!a.createdAt || !b.createdAt) return 0;
    return new Date(b.createdAt) - new Date(a.createdAt);
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Appointments</h1>
          <p className="section-subtitle">Manage today's schedule and upcoming patients</p>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-1.5 rounded-xl w-fit border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
        {['All', 'Upcoming', 'Completed', 'Cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${filter === f ? 'bg-teal-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(app => (
          <div key={app._id} className="card p-5 border border-gray-100 shadow-sm hover:border-teal-300 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner">
                  {app.patient?.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{app.patient?.name || 'Unknown'}</h3>
                  <p className="text-xs font-semibold text-teal-600">{app.reason}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                (app.status === 'Upcoming' || app.status === 'confirmed') ? 'bg-teal-100 text-teal-700' :
                (app.status === 'Completed' || app.status === 'completed') ? 'bg-emerald-100 text-emerald-700' :
                (app.status === 'pending') ? 'bg-blue-100 text-blue-700' :
                (app.status === 'in-progress' || app.status === 'In Progress') ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {app.status}
              </span>
            </div>

            <div className="space-y-2 mb-5 bg-gray-50 p-3 rounded-xl border border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-800 font-bold">
                <Clock size={16} className="text-teal-500" /> <span>{app.timeSlot}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                {isOnline(app) ? <Video size={16} className="text-blue-500" /> : <MapPin size={16} className="text-purple-500" />}
                <span className={`font-semibold ${isOnline(app) ? 'text-blue-600' : 'text-purple-600'}`}>
                  {isOnline(app) ? 'Online Video Call' : 'In-Person Visit'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 font-medium pt-2 mt-2 border-t border-gray-100">
                <span className="text-[11px] uppercase tracking-wider font-bold">Booked on:</span>
                <span className="text-gray-700 font-semibold">{app.createdAt ? new Date(app.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-2">
              {(app.status === 'Upcoming' || app.status === 'confirmed' || app.status.toLowerCase() === 'pending') && (
                <>
                  {isOnline(app) ? (
                    <button
                      onClick={() => handleStartVideoCall(app)}
                      className="flex-1 py-2 text-xs flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all">
                      <Video size={14} /> Start Video Call
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartConsultation(app)}
                      className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
                      <CheckCircle size={14} /> Start Consultation
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusUpdate(app, 'cancelled')}
                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                    <XCircle size={14} /> Cancel
                  </button>
                </>
              )}
              {(app.status === 'In Progress' || app.status === 'in-progress') && (
                <button
                  onClick={() => handleStatusUpdate(app, 'completed')}
                  className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                  <CheckCircle size={14} /> Mark Completed
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-gray-300">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No appointments found</h3>
            <p className="text-gray-500 text-sm">You have no {filter.toLowerCase()} appointments.</p>
          </div>
        )}
      </div>
    </div>
  )
}

