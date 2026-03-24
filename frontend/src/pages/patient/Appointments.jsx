import React, { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, Video, FileText, CheckCircle, XCircle, User, X, Activity, Stethoscope, Microscope, Download, AlertCircle, MapPin } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { showError } from '../../utils/toast'
import CancelAppointmentModal from '../../components/appointments/CancelAppointmentModal'

const POLLING_INTERVAL = 15000; // Poll every 15 seconds for sync

export default function Appointments() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false) // ✅ Track refresh separately
  const [filter, setFilter] = useState('All')
  const [reportModal, setReportModal] = useState(null) // holds appointment data for the modal
  const [reportRecords, setReportRecords] = useState([])
  const [reportLoading, setReportLoading] = useState(false)
  
  // Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [appointmentToCancel, setAppointmentToCancel] = useState(null)

  const handleSwitchType = async (app) => {
    if (String(app._id).startsWith('d')) return // demo data — skip
    const newType = (app.consultationType === 'online') ? 'in-person' : 'online'
    try {
      await api.put(`/appointments/${app._id}`, { consultationType: newType })
      setAppointments(prev => prev.map(a => a._id === app._id ? { ...a, consultationType: newType } : a))
    } catch (err) {
      console.error('Failed to switch consultation type:', err)
      showError('Could not change consultation type. Please try again.')
    }
  }

  // Open cancel modal for appointment
  const handleCancelClick = (appointment) => {
    setAppointmentToCancel(appointment)
    setCancelModalOpen(true)
  }

  // Close cancel modal
  const handleCloseCancelModal = () => {
    setCancelModalOpen(false)
    setAppointmentToCancel(null)
  }

  // Handle successful cancellation - ✅ NOW OPTIMISTIC
  const handleCancelSuccess = (updatedAppointment) => {
    // ✅ OPTIMISTIC UPDATE - Update UI immediately (no waiting for API)
    setAppointments(prev => prev.map(a => 
      a._id === updatedAppointment._id 
        ? { 
            ...a, 
            status: 'cancelled', 
            cancelReason: updatedAppointment.cancelReason, 
            cancelledBy: updatedAppointment.cancelledBy || 'patient' 
          } 
        : a
    ))
    handleCloseCancelModal()
  }

  const handleViewReport = async (appointment) => {
    setReportModal(appointment)
    setReportRecords([])
    setReportLoading(true)
    try {
      const patId = user?._id || user?.id
      const res = await api.get(`/visits/patient/${patId}`)
      const allVisits = res.data.data || []
      setReportRecords(allVisits)
    } catch (err) {
      console.error('Error loading records for report:', err)
      setReportRecords([])
    } finally {
      setReportLoading(false)
    }
  }

  // ✅ Memoized fetch with showRefreshing parameter
  const fetchAppointments = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      
      let realAppts = []
      if (user?._id || user?.id) {
        const res = await api.get(`/appointments/patient/${user._id || user.id}`)
        realAppts = res.data.data || []
      }

      // Combine with Demo Data for John Doe
      if (user?.email === 'john@example.com') {
        const demoAppts = [
          { 
            _id: 'd1',
            doctor: { user: { name: 'Ravi Kumar' }, specialization: 'Cardiologist' }, 
            date: '2026-03-12', 
            timeSlot: '10:30 AM', 
            status: 'confirmed', 
            type: 'Consultation',
            reason: 'Routine Checkup'
          },
          { 
            _id: 'd2',
            doctor: { user: { name: 'Priya Sharma' }, specialization: 'Neurologist' }, 
            date: '2026-03-15', 
            timeSlot: '02:00 PM', 
            status: 'pending', 
            type: 'Online Call',
            reason: 'Migraine tracking'
          },
          { 
            _id: 'd3',
            doctor: { user: { name: 'Arjun Mehta' }, specialization: 'Orthopedic' }, 
            date: '2026-02-28', 
            timeSlot: '11:00 AM', 
            status: 'completed', 
            type: 'Consultation',
            reason: 'Knee Pain'
          }
        ]
        setAppointments([...demoAppts, ...realAppts])
      } else {
        setAppointments(realAppts)
      }
    } catch (err) {
      console.error('Error fetching appointments:', err)
      showError('Failed to load appointments.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  // ✅ POLLING: Auto-sync appointments every 15 seconds + cleanup
  useEffect(() => {
    if (user) {
      // Initial fetch
      fetchAppointments()
      
      // Setup polling for sync
      const interval = setInterval(() => {
        fetchAppointments(true) // showRefreshing=true, doesn't block UI
      }, POLLING_INTERVAL)
      
      return () => clearInterval(interval)
    }
  }, [fetchAppointments, user])

  const filtered = appointments.filter(a => {
    if (filter === 'All') return true
    const backendStatus = a.status.toLowerCase()
    if (filter === 'Upcoming') return backendStatus === 'pending' || backendStatus === 'confirmed'
    return backendStatus === filter.toLowerCase()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">My Appointments</h1>
          <p className="section-subtitle">Manage your upcoming and past consultations</p>
        </div>
      </div>

      <div className="flex gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl w-fit border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto no-scrollbar">
        {['All', 'Upcoming', 'Completed', 'Cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${filter === f ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(app => (
          <div key={app._id} className="card p-5 border border-gray-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner">
                  {app.doctor?.user?.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">Dr. {app.doctor?.user?.name || 'Unknown'}</h3>
                  <p className="text-xs font-semibold text-blue-600">{app.doctor?.specialization || 'General'}</p>
                </div>
              </div>
              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                app.status === 'confirmed' || app.status === 'Upcoming' ? 'bg-emerald-100 text-emerald-700' :
                app.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                app.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                'bg-red-100 text-red-700'
              }`}>
                {app.status}
              </span>
            </div>

            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} className="text-gray-400" /> <span className="font-medium">{new Date(app.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={16} className="text-gray-400" /> <span className="font-medium">{app.timeSlot}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {(app.consultationType === 'online' || app.type === 'Online Call')
                  ? <><Video size={16} className="text-blue-500" /><span className="font-semibold text-blue-600">Online Video Call</span></>
                  : <><MapPin size={16} className="text-purple-500" /><span className="font-semibold text-purple-600">In-Person Visit</span></>
                }
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="font-medium text-gray-400">Reason:</span>
                <span className="font-medium">{app.reason}</span>
              </div>
            </div>

            {String(app.status).toLowerCase() === 'cancelled' && (
              <div className="mb-4 p-3 rounded-lg border border-red-100 bg-red-50">
                <p className="text-xs font-semibold text-red-700">
                  {app.cancelledBy === 'patient' ? 'Cancelled by you' : app.cancelledBy === 'doctor' ? 'Cancelled by doctor' : app.cancelledBy === 'admin' ? 'Cancelled by admin' : 'Cancelled by system'}
                </p>
                {(app.cancelReason || app.cancellationReason) && (
                  <p className="text-xs text-red-700 mt-1 italic">"{app.cancelReason || app.cancellationReason}"</p>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-gray-100 flex gap-2">
              {(app.status === 'pending' || app.status === 'confirmed') && (
                <>
                  {(app.consultationType === 'online' || app.type === 'Online Call') ? (
                    <button
                      onClick={() => navigate(`/video-room/${app._id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all">
                      <Video size={14} /> Join Video Call
                    </button>
                  ) : (
                    <button className="flex-1 btn-primary py-2 text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-default">
                      <CheckCircle size={14} /> Confirmed
                    </button>
                  )}
                  <button
                    onClick={() => handleCancelClick(app)}
                    className="flex-1 px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-xl text-xs hover:bg-red-100 transition-colors flex items-center justify-center gap-1">
                    <XCircle size={14} /> Cancel
                  </button>
                  {!String(app._id).startsWith('d') && (
                    <button
                      onClick={() => handleSwitchType(app)}
                      title={(app.consultationType === 'online') ? 'Switch to In-Person Visit' : 'Switch to Online Video Call'}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                      {(app.consultationType === 'online') ? <MapPin size={14} /> : <Video size={14} />}
                    </button>
                  )}
                </>
              )}
              {app.status === 'completed' && (
                <button
                  onClick={() => handleViewReport(app)}
                  className="flex-1 btn-secondary py-2 text-xs flex items-center justify-center gap-1.5 hover:bg-blue-600 hover:text-white transition-all">
                  <FileText size={14} /> View Report
                </button>
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">No appointments found</h3>
            <p className="text-gray-500 text-sm mb-4">You have no {filter.toLowerCase()} appointments.</p>
            {filter !== 'All' && <button onClick={() => setFilter('All')} className="text-blue-600 font-semibold text-sm hover:underline">View All Appointments</button>}
          </div>
        )}
      </div>

      {/* Cancel Appointment Modal */}
      <CancelAppointmentModal
        appointment={appointmentToCancel}
        isOpen={cancelModalOpen}
        onClose={handleCloseCancelModal}
        onCancelSuccess={handleCancelSuccess}
      />

      {/* View Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2"><FileText size={20} /> Appointment Report</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Dr. {reportModal.doctor?.user?.name || reportModal.doctor?.name || 'Unknown'} • {new Date(reportModal.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' })} • {reportModal.timeSlot}
                </p>
              </div>
              <button onClick={() => setReportModal(null)} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              {/* Appointment Summary */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Stethoscope size={16} className="text-blue-600" /> Appointment Summary
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 font-medium text-xs">Doctor</p>
                    <p className="font-bold text-gray-900">Dr. {reportModal.doctor?.user?.name || reportModal.doctor?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium text-xs">Specialization</p>
                    <p className="font-bold text-gray-900">{reportModal.doctor?.specialization || 'General'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium text-xs">Date</p>
                    <p className="font-bold text-gray-900">{new Date(reportModal.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 font-medium text-xs">Time</p>
                    <p className="font-bold text-gray-900">{reportModal.timeSlot}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500 font-medium text-xs">Reason</p>
                    <p className="font-bold text-gray-900">{reportModal.reason || 'General Consultation'}</p>
                  </div>
                </div>
              </div>

              {/* Medical Records */}
              <div>
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity size={16} className="text-teal-600" /> Medical Records & Prescriptions
                </h3>

                {reportLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : reportRecords.length > 0 ? (
                  <div className="space-y-3">
                    {reportRecords.map((record, i) => (
                      <div key={record._id || i} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:border-blue-200 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              record.recordType === 'Lab Report' ? 'bg-purple-50 text-purple-600' : 
                              record.recordType === 'Prescription' ? 'bg-blue-50 text-blue-600' : 
                              'bg-teal-50 text-teal-600'
                            }`}>
                              {record.recordType === 'Lab Report' ? <Microscope size={18} /> : <FileText size={18} />}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 text-sm">{record.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                By Dr. {record.doctor?.user?.name || record.doctor?.name || 'Staff'} • {new Date(record.createdAt).toLocaleDateString()}
                              </p>
                              {record.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 bg-white dark:bg-gray-700 p-2 rounded-lg border border-gray-100 dark:border-gray-600">{record.description}</p>
                              )}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${
                            record.recordType === 'Lab Report' ? 'bg-purple-100 text-purple-700' :
                            record.recordType === 'Prescription' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {record.recordType || 'Record'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <AlertCircle size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 font-medium text-sm">No medical records found for this appointment.</p>
                    <p className="text-gray-400 text-xs mt-1">Records will appear here once the doctor finalizes them.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
              <button 
                onClick={() => setReportModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-100 transition-colors">
                Close
              </button>
              {reportModal?.fileUrl ? (
                <a
                  href={reportModal.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2"
                >
                  <Download size={16} /> Download Report
                </a>
              ) : (
                <button 
                  disabled
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-400 font-semibold text-sm cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Download size={16} /> No File Available
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
