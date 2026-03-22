import React, { useState, useEffect } from 'react'
import {
  Calendar, Clock, Video, User, Activity, AlertTriangle,
  UserRound, Filter, CheckCircle, XCircle, Loader2, RefreshCw, Search,
} from 'lucide-react'
import api from '../../services/api'
import { showSuccess, showError, getErrorMessage } from '../../utils/toast'

const FILTERS = ['All', 'pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show']

const STATUS_STYLES = {
  pending:      'bg-yellow-100 text-yellow-700',
  confirmed:    'bg-blue-100 text-blue-700',
  'in-progress': 'bg-indigo-100 text-indigo-700',
  completed:    'bg-emerald-100 text-emerald-700',
  cancelled:    'bg-red-100 text-red-700',
  'no-show':    'bg-gray-100 text-gray-700',
}

export default function AppointmentManagement() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [cancelId, setCancelId] = useState(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchAppointments = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/appointments')
      setAppointments(res.data.data || [])
    } catch (err) {
      setError('Failed to load appointments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAppointments() }, [])

  const handleCancel = async (id) => {
    setCancelLoading(true)
    try {
      await api.put(`/appointments/${id}`, { status: 'cancelled' })
      setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: 'cancelled' } : a))
      setCancelId(null)
      showSuccess('Appointment cancelled.')
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to cancel appointment'))
    } finally {
      setCancelLoading(false)
    }
  }

  // Counts
  const counts = {
    total:     appointments.length,
    upcoming:  appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  }

  // Filter + search
  const filtered = appointments
    .filter(a => filter === 'All' || a.status === filter)
    .filter(a => {
      if (!search) return true
      const q = search.toLowerCase()
      const patName  = a.patient?.name  || ''
      const docName  = a.doctor?.user?.name || ''
      return patName.toLowerCase().includes(q) || docName.toLowerCase().includes(q)
    })

  const getPatientName  = a => a.patient?.name || 'Unknown'
  const getDoctorName   = a => a.doctor?.user?.name ? `Dr. ${a.doctor.user.name}` : 'Unknown'
  const formatDate      = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const isUpcoming      = a => a.status === 'pending' || a.status === 'confirmed'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">All Appointments</h1>
          <p className="section-subtitle">Monitor and manage hospital-wide appointments</p>
        </div>
        <button onClick={fetchAppointments}
          className="btn-secondary flex items-center gap-2 bg-white text-sm py-2">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total',     value: counts.total,     icon: Calendar,       color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Upcoming',  value: counts.upcoming,  icon: Clock,          color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Completed', value: counts.completed, icon: CheckCircle,    color: 'text-emerald-600',bg: 'bg-emerald-50' },
          { label: 'Cancelled', value: counts.cancelled, icon: AlertTriangle,  color: 'text-rose-600',   bg: 'bg-rose-50' },
        ].map(s => (
          <div key={s.label} className="card p-4 border border-gray-100 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{loading ? '…' : s.value}</p>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex flex-wrap gap-1 bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f ? 'bg-violet-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search patient or doctor..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="card p-0 shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-100 uppercase text-xs font-bold text-gray-500 tracking-wider">
                <tr>
                  <th className="py-4 px-6 border-r border-gray-100 w-1/4">Patient</th>
                  <th className="py-4 px-6 border-r border-gray-100 w-1/4">Doctor</th>
                  <th className="py-4 px-6 border-r border-gray-100 w-1/4">Appointment Info</th>
                  <th className="py-4 px-6 w-1/4 text-center">Status & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(a => (
                  <tr key={a._id} className="hover:bg-violet-50/20 transition-colors group">
                    <td className="py-4 px-6 border-r border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-700 font-bold flex items-center justify-center shadow-inner">
                          {getPatientName(a).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors block leading-tight">{getPatientName(a)}</span>
                          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1"><UserRound size={10} /> Patient</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 border-r border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 font-bold flex items-center justify-center shadow-inner">
                          {getDoctorName(a).charAt(4) || 'D'}
                        </div>
                        <div>
                          <span className="font-bold text-gray-900 group-hover:text-teal-700 transition-colors block leading-tight">{getDoctorName(a)}</span>
                          <span className="text-xs font-semibold text-gray-400 flex items-center gap-1">
                            <Activity size={10} /> {a.doctor?.specialization || 'Doctor'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 border-r border-gray-50 space-y-1">
                      <p className="text-sm text-gray-800 font-bold flex items-center gap-1.5">
                        <Calendar size={14} className="text-violet-500" />
                        {formatDate(a.date)}
                        <span className="text-gray-400 font-semibold mx-1">|</span>
                        {a.timeSlot || '—'}
                      </p>
                      <p className="text-xs text-blue-600 font-bold flex items-center gap-1.5 mt-1 bg-blue-50 w-fit px-2 py-0.5 rounded-full border border-blue-100">
                        {a.visitType === 'Online Call' ? <Video size={10} /> : <User size={10} />}
                        {a.visitType || 'Consultation'}
                      </p>
                      {a.reason && <p className="text-xs text-gray-400 truncate max-w-[160px]">{a.reason}</p>}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest capitalize ${STATUS_STYLES[a.status] || 'bg-gray-100 text-gray-700'}`}>
                          {a.status}
                        </span>
                        {isUpcoming(a) && (
                          cancelId === a._id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleCancel(a._id)} disabled={cancelLoading}
                                className="text-xs bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700 disabled:opacity-50">
                                {cancelLoading ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                              </button>
                              <button onClick={() => setCancelId(null)}
                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md hover:bg-gray-200">
                                No
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => setCancelId(a._id)}
                              className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 transition-colors bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md">
                              <XCircle size={12} /> Cancel
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-gray-500 bg-gray-50/50">
                      <Calendar size={32} className="mx-auto text-gray-300 mb-2" />
                      <p className="font-bold">No appointments found.</p>
                      <p className="text-sm mt-1 text-gray-400">Try changing the filter or search term.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

