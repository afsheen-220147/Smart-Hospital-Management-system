import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, AlertCircle, Loader, Users, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { showError, showSuccess } from '../../utils/toast'
import {
  getCurrentSession,
  isToday,
  formatTimeIST,
  formatDateIST,
  parseTimeToMinutes,
} from '../../utils/timeHelper'

export default function DoctorDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  // STATE
  const [doctorProfile, setDoctorProfile] = useState(null)
  const [appointments, setAppointments] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [stats, setStats] = useState({ totalToday: 0, upcomingCount: 0, completedCount: 0 })
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSession, setFilterSession] = useState('all')
  const [currentSession, setCurrentSession] = useState(null)
  const [error, setError] = useState(null)

  // ========================================
  // EFFECT: Wait for auth to load
  // ========================================
  useEffect(() => {
    if (authLoading) {
      console.log('⏳ Waiting for authentication...')
      return
    }

    if (!user) {
      console.warn('❌ User not authenticated, redirecting to login')
      navigate('/login')
      return
    }

    console.log('✅ Auth ready, user:', user.email)
  }, [authLoading, user, navigate])

  // ========================================
  // EFFECT: Fetch doctor data (only after auth is ready)
  // ========================================
  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('⏳ Skipping fetch: Auth still loading')
      return
    }

    // Don't fetch if user not authenticated
    if (!user?.email) {
      console.warn('⏳ Skipping fetch: User not authenticated')
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('🔄 Fetching doctor dashboard data...')
        console.log('👤 User:', user.email)

        // Fetch doctor profile
        console.log('📌 Step 1: Fetching doctor profile...')
        let doctor = null
        try {
          const profRes = await api.get('/doctors/me')
          doctor = profRes.data.data
          console.log('✅ Doctor profile loaded:', doctor)
          setDoctorProfile(doctor)
        } catch (err) {
          console.error('❌ Error fetching doctor profile:', err.response?.data || err.message)
          // Create a fallback doctor profile
          doctor = {
            user: { name: user?.name || 'Doctor' },
            specialization: user?.specialization || 'Medical Professional',
            experience: 0
          }
          setDoctorProfile(doctor)
        }

        // Fetch appointments
        console.log('📌 Step 2: Fetching appointments...')
        let appts = []
        try {
          const apptRes = await api.get(`/appointments/doctor/${doctor?._id || ''}`)
          appts = apptRes.data.data || []
          console.log('✅ Appointments loaded:', appts.length, 'appointments')
          setAppointments(appts)
        } catch (err) {
          console.error('❌ Error fetching appointments:', err.response?.data || err.message)
          appts = []
          setAppointments([])
        }

        // Fetch leave requests
        console.log('📌 Step 3: Fetching leave requests...')
        try {
          const leaveRes = await api.get('/doctor/off-duty/my-requests')
          const leaves = leaveRes.data.data || []
          console.log('✅ Leave requests loaded:', leaves.length, 'requests')
          setLeaveRequests(leaves)
        } catch (err) {
          console.warn('⚠️  Leave requests not available:', err.message)
          setLeaveRequests([])
        }

        // Calculate stats
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const todayAppts = appts.filter(apt => {
          const aptDate = new Date(apt.date || apt.appointmentDate)
          aptDate.setHours(0, 0, 0, 0)
          return aptDate.getTime() === today.getTime()
        })

        const upcomingAppts = appts.filter(apt => {
          const status = (apt.status || '').toLowerCase()
          return status !== 'completed' && status !== 'cancelled'
        })

        const completedAppts = appts.filter(apt => (apt.status || '').toLowerCase() === 'completed')

        setStats({
          totalToday: todayAppts.length,
          upcomingCount: upcomingAppts.length,
          completedCount: completedAppts.length
        })

        // Set current session
        setCurrentSession(getCurrentSession())
        console.log('✅ Dashboard data loaded successfully')
      } catch (err) {
        console.error('❌ Critical error fetching data:', err)
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authLoading, user?.email])

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    let result = appointments

    // Filter by search term
    if (searchTerm) {
      result = result.filter(apt =>
        apt.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.visitType?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by session
    if (filterSession !== 'all') {
      result = result.filter(apt => {
        const time = apt.timeSlot || ''
        if (filterSession === 'morning') {
          return parseInt(time) < 12 || time.toLowerCase().includes('am')
        } else if (filterSession === 'afternoon') {
          return parseInt(time) >= 12 || time.toLowerCase().includes('pm')
        }
        return true
      })
    }

    // Filter today's appointments
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    result = result.filter(apt => {
      const aptDate = new Date(apt.date || apt.appointmentDate)
      aptDate.setHours(0, 0, 0, 0)
      return aptDate.getTime() === today.getTime()
    })

    // Sort by time
    return result.sort((a, b) => {
      const timeA = parseTimeToMinutes(a.timeSlot || '00:00')
      const timeB = parseTimeToMinutes(b.timeSlot || '00:00')
      return timeA - timeB
    })
  }, [appointments, searchTerm, filterSession])

  // Get status badge color
  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'confirmed' || s === 'approved') return 'bg-green-100 text-green-700'
    if (s === 'pending') return 'bg-blue-100 text-blue-700'
    if (s === 'rejected' || s === 'cancelled') return 'bg-red-100 text-red-700'
    if (s === 'completed') return 'bg-gray-100 text-gray-700'
    if (s === 'in-progress') return 'bg-purple-100 text-purple-700'
    return 'bg-gray-100 text-gray-700'
  }

  const getLeaveStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'approved') return 'bg-green-100 text-green-700'
    if (s === 'pending') return 'bg-blue-100 text-blue-700'
    if (s === 'rejected') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  // LOADING STATE
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your data</p>
        </div>
      </div>
    )
  }

  // ERROR STATE
  if (error && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle size={40} className="text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 font-bold">Authentication Error</p>
          <p className="text-gray-600 text-sm mt-2">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      {/* DOCTOR INFO CARD */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome, Dr. {doctorProfile?.user?.name || user?.name || 'Doctor'}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {doctorProfile?.specialization || 'Medical Professional'} • {doctorProfile?.experience || 0} years experience
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{currentSession} Session</p>
            <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today's Patients</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalToday}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Upcoming</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.upcomingCount}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calendar size={24} className="text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completedCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S APPOINTMENTS SECTION */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Today's Appointments</h3>
          <span className="text-sm text-gray-500">{filteredAppointments.length} scheduled</span>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-4 bg-white flex-wrap">
          <input
            type="text"
            placeholder="Search patient name or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-64 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
          />
          <select
            value={filterSession}
            onChange={(e) => setFilterSession(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm bg-white"
          >
            <option value="all">All Sessions</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
          </select>
        </div>

        {filteredAppointments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.slice(0, 10).map((apt) => (
                  <tr key={apt._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {apt.timeSlot}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {apt.patient?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {apt.visitType || 'Consultation'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(apt.status)}`}>
                        {apt.status || 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/doctor/appointments`)}
                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <AlertCircle size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No appointments scheduled for today</p>
          </div>
        )}
      </div>

      {/* LEAVE REQUESTS SECTION */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Leave Requests</h3>
          <button
            onClick={() => navigate('/doctor/off-duty')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm transition-colors"
          >
            Request Leave
          </button>
        </div>

        {leaveRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Session</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Requested</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.slice(0, 10).map((leave) => (
                  <tr key={leave._id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDateIST(leave.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 capitalize">
                      {leave.session}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">
                      {leave.reason || 'No reason provided'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getLeaveStatusColor(leave.status)}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateIST(leave.requestedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <Calendar size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No leave requests submitted</p>
            <button
              onClick={() => navigate('/doctor/off-duty')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm transition-colors"
            >
              Submit First Leave Request
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
