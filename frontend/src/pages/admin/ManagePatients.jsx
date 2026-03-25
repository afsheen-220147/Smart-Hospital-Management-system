import React, { useState, useEffect } from 'react'
import { User, Activity, Trash2, Calendar, FileText, Search, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import api from '../../services/api'
import { showSuccess, showError, getErrorMessage } from '../../utils/toast'

export default function ManagePatients() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchPatients = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/patients')
      setPatients(res.data.data || [])
    } catch (err) {
      setError('Failed to load patients. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPatients() }, [])

  const handleDelete = async (id) => {
    setDeleteLoading(true)
    try {
      // Get admin ID from localStorage (set during admin login)
      const adminId = localStorage.getItem('adminId') || 'admin_001'
      
      // Delete now returns actionId and requires 3 approvals
      const response = await api.delete(`/patients/${id}`, {
        data: {
          adminId: adminId,
          reason: 'Admin requested patient removal'
        }
      })
      
      // Show approval pending message instead of immediate removal
      showSuccess(`Deletion initiated. Action ID: ${response.data.actionId}. Requires 3 admin approvals.`)
      setDeleteId(null)
      
      // Refresh to show latest state
      setTimeout(() => fetchPatients(), 1000)
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to initiate patient removal'))
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtered = patients.filter(p => {
    const name  = p.user?.name  || ''
    const email = p.user?.email || ''
    const q = search.toLowerCase()
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q)
  })

  const calcAge = (dob) => {
    if (!dob) return '—'
    const diff = Date.now() - new Date(dob).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Patient Profiles</h1>
          <p className="section-subtitle">View and manage registered patients ({patients.length} total)</p>
        </div>
        <button onClick={fetchPatients}
          className="btn-secondary flex items-center gap-2 text-sm py-2 px-4">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-72">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-sm p-3 rounded-xl border border-red-100">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-violet-500" />
        </div>
      ) : (
        <div className="card p-0 shadow-sm border border-gray-100 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <User size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">
                {search ? 'No patients match your search' : 'No patients registered yet'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-xs font-bold text-gray-500 tracking-wider">
                  <tr>
                    <th className="py-4 px-6 border-r border-gray-100">Patient Info</th>
                    <th className="py-4 px-6 border-r border-gray-100">Health Details</th>
                    <th className="py-4 px-6 border-r border-gray-100">Visit History</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(p => (
                    <tr key={p._id} className="hover:bg-violet-50/30 transition-colors group">
                      <td className="py-4 px-6 border-r border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center shadow-inner">
                            {(p.user?.name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors block leading-tight">
                              {p.user?.name || 'Unknown'}
                            </span>
                            <span className="text-xs text-gray-400">{p.user?.email || ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 border-r border-gray-50">
                        <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-600">
                          <span className="bg-gray-100 px-2 py-1 rounded-md">{calcAge(p.dateOfBirth)} yrs</span>
                          {p.gender && <span className="bg-gray-100 px-2 py-1 rounded-md">{p.gender.charAt(0)}</span>}
                          {p.bloodGroup && (
                            <span className="bg-red-50 text-red-700 border border-red-100 px-2 py-1 rounded-md flex items-center gap-1">
                              <Activity size={10} /> {p.bloodGroup}
                            </span>
                          )}
                          {!p.gender && !p.bloodGroup && <span className="text-gray-400 font-normal">Profile incomplete</span>}
                        </div>
                      </td>
                      <td className="py-4 px-6 border-r border-gray-50 space-y-1">
                        <p className="text-xs text-gray-800 font-bold flex items-center gap-1.5">
                          <FileText size={12} className="text-violet-500" />
                          Total: {p.attendanceHistory?.totalAppointments ?? '—'}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Calendar size={12} className="text-gray-400" />
                          Last: {p.attendanceHistory?.lastAppointmentDate
                            ? new Date(p.attendanceHistory.lastAppointmentDate).toLocaleDateString()
                            : '—'}
                        </p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {deleteId === p._id ? (
                          <div className="flex justify-end items-center gap-2">
                            <span className="text-xs text-red-600 font-medium">Remove?</span>
                            <button onClick={() => handleDelete(p._id)} disabled={deleteLoading}
                              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                              {deleteLoading ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
                            </button>
                            <button onClick={() => setDeleteId(null)}
                              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                              No
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteId(p._id)}
                            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors flex items-center justify-center ml-auto">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

