import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, Users, Star, ArrowRight, Clock, Activity, HeartPulse } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

export default function DoctorDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  const handleStatusUpdate = async (appt, newStatus) => {
    const id = appt._id
    // Check if it's a demo item (starts with 'd' or 'demo')
    const isDemoItem = String(id).startsWith('d')
    
    if (!isDemoItem) {
      try {
        await api.put(`/appointments/${id}`, { status: newStatus })
      } catch (err) {
        console.error("Error updating status:", err)
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

  const isDemoDoctor = user?.email === 'sneha@medicare.com' || user?.email === 'suresh@medicare.com'

  useEffect(() => {
    const fetchDoctorData = async () => {
      try {
        setLoading(true)
        
        let realAppts = []
        let realProfile = null

        // Fetch real data from API
        if (user?._id || user?.id) {
          try {
            const profRes = await api.get('/doctors/me')
            realProfile = profRes.data.data
            
            const apptRes = await api.get(`/appointments/doctor/${realProfile._id}`)
            realAppts = apptRes.data.data || []
          } catch (e) {
            console.error("Fetch doctor data error:", e)
          }
        }

        if (isDemoDoctor) {
          // Combined Demo Data + Real Bookings
          setProfile(realProfile || { specialization: 'General Physician', experience: 12, rating: 4.8 })
          
          const demoAppts = [
            { timeSlot: '10:30 AM', patient: { name: 'Venkat R.' }, reason: 'Consultation', status: 'Waiting' },
            { timeSlot: '11:00 AM', patient: { name: 'Rahul K.' }, reason: 'Follow-up', status: 'In Progress' },
            { timeSlot: '11:30 AM', patient: { name: 'Anitha S.' }, reason: 'Online Call', status: 'Upcoming' },
          ]
          
          setAppointments([...demoAppts, ...realAppts])
        } else {
          setProfile(realProfile)
          setAppointments(realAppts)
        }
      } catch (err) {
        console.error("Doctor dashboard error:", err)
      } finally {
        setLoading(false)
      }
    }

    if (user) fetchDoctorData()
  }, [user, isDemoDoctor])

  const stats = [
    { label: 'Today\'s Patients', value: isDemoDoctor ? 18 : appointments.filter(a => new Date(a.date).toDateString() === new Date().toDateString()).length, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Total Appointments', value: isDemoDoctor ? 24 : appointments.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg Rating', value: isDemoDoctor ? 4.8 : (profile?.rating || 'N/A'), icon: Star, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card bg-gradient-to-r from-teal-600 to-teal-800 text-white border-none shadow-lg py-8 px-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">Good Morning, {user?.name}! <HeartPulse size={28} className="text-teal-200" /></h1>
        <p className="text-teal-100 max-w-xl">
          {appointments.length > 0 ? `You have ${appointments.length} patients scheduled. Your next appointment is ready.` : 'No patients scheduled for today yet.'}
        </p>
        <div className="flex gap-4 mt-6">
          <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold flex items-center gap-2 border border-white/30 text-white">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span> On Duty
          </span>
          <Link to="/doctor/appointments" className="px-4 py-2 bg-white dark:bg-gray-800 text-teal-700 dark:text-teal-300 font-bold rounded-xl shadow-sm text-sm hover:shadow-md transition-shadow">
            View Schedule
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map(s => (
          <div key={s.label} className="card p-6 flex flex-col gap-2 hover:shadow-md transition-shadow border-teal-100/50">
            <div className="flex items-center justify-between">
              <div className={`p-3 rounded-2xl ${s.bg} flex items-center justify-center`}>
                <s.icon size={26} className={s.color} />
              </div>
              {s.label === 'Avg Rating' && <span className="text-yellow-600 font-bold flex items-center gap-1 text-sm bg-yellow-50 px-2 py-1 rounded-lg">Top 5%</span>}
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{s.value}</p>
              <p className="text-sm text-gray-500 font-medium">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-0 shadow-sm border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-bold text-gray-900 flex items-center gap-2"><Clock size={18} className="text-teal-600" /> Today's Schedule</h2>
            <Link to="/doctor/appointments" className="text-sm font-semibold text-teal-600 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {appointments.slice(0, 5).map((a, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-500 w-16">{a.timeSlot}</span>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold shadow-inner">
                    {a.patient?.name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors">{a.patient?.name || 'Unknown Patient'}</p>
                    <p className="text-xs text-gray-500 font-medium flex items-center gap-1"><Activity size={12} /> {a.reason || 'Consultation'}</p>
                  </div>
                </div>
                <div>
                  {(a.status === 'Waiting' || a.status === 'confirmed' || a.status === 'pending') && (
                    <button 
                      onClick={() => handleStatusUpdate(a, 'in-progress')}
                      className="px-4 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      Start <ArrowRight size={12} />
                    </button>
                  )}
                  {(a.status === 'In Progress' || a.status === 'in-progress') && (
                    <div className="flex items-center gap-2">
                       <span className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1.5 animate-pulse">
                         <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Ongoing
                       </span>
                       <button 
                         onClick={() => handleStatusUpdate(a, 'completed')}
                         className="px-3 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                       >
                         Complete
                       </button>
                    </div>
                  )}
                  {(a.status === 'Upcoming') && <span className="text-xs font-semibold text-gray-400">Scheduled</span>}
                  {a.status === 'completed' && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">Done</span>}
                </div>
              </div>
            ))}
            {appointments.length === 0 && <div className="p-10 text-center text-gray-500 italic">No appointments for today.</div>}
          </div>
        </div>

        <div className="card p-5 bg-gray-50 border border-gray-100 flex flex-col justify-center items-center text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-teal-600 text-3xl font-bold">
            +
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 mb-4">Jump straight into patient diagnosis or manage your weekly schedule.</p>
          </div>
          <div className="w-full space-y-3 max-w-sm">
            <Link to="/doctor/diagnosis" className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-semibold py-3 px-4 rounded-xl shadow-sm hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 transition-all flex items-center justify-between group">
              <span className="flex items-center gap-2"><Activity size={18} className="text-teal-500" /> Add Diagnosis</span>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
            </Link>
            <Link to="/doctor/schedule" className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 font-semibold py-3 px-4 rounded-xl shadow-sm hover:border-teal-400 dark:hover:border-teal-500 hover:text-teal-700 dark:hover:text-teal-300 transition-all flex items-center justify-between group">
              <span className="flex items-center gap-2"><Calendar size={18} className="text-teal-500" /> Edit My Schedule</span>
              <ArrowRight size={16} className="text-gray-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

