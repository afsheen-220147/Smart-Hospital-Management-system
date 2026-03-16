import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Stethoscope, FileText, Download, Activity, HeartPulse, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

export default function VisitHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Helper to extract doctor name from either populated structure
  const getDoctorName = (doctor) => {
    if (!doctor) return 'Staff'
    if (typeof doctor === 'string') return doctor
    // Populated with { user: { name: '...' } }
    if (doctor.user?.name) return doctor.user.name
    // Flat { name: '...' }
    if (doctor.name) return doctor.name
    return 'Staff'
  }

  useEffect(() => {
    const fetchHistory = async () => {
      // Demo Data for John Doe
      if (user?.email === 'john@example.com') {
        setHistory([
          { _id: 'h1', createdAt: '2026-02-15T10:30:00Z', doctor: { user: { name: 'Priya Sharma' } }, title: 'Migraine tracking', description: 'Migraine frequency has decreased. Blood pressure stable. Recommended to continue current medication.', recordType: 'Prescription' },
          { _id: 'h2', createdAt: '2026-01-02T11:00:00Z', doctor: { user: { name: 'Ravi Kumar' } }, title: 'Routine Checkup', description: 'Stable vitals, slightly elevated blood pressure. Advised dietary changes and follow-up in 3 months.', recordType: 'Prescription' },
          { _id: 'h3', createdAt: '2025-11-10T16:15:00Z', doctor: { user: { name: 'Sneha Patel' } }, title: 'Viral Fever', description: 'Recovered from mild seasonal fever. Temperature normal. Prescribed rest and fluids.', recordType: 'Prescription' },
          { _id: 'h4', createdAt: '2025-08-22T09:45:00Z', doctor: { user: { name: 'Arjun Mehta' } }, title: 'Knee Pain (Right)', description: 'Recommended physiotherapy 2x per week. X-ray shows no fracture. Anti-inflammatory medication prescribed.', recordType: 'Lab Report' },
        ])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const patId = user?._id || user?.id
        const res = await api.get(`/visits/patient/${patId}`)
        setHistory(res.data.data || [])
      } catch (err) {
        // Fallback to the general visits endpoint
        try {
          const res = await api.get('/visits')
          setHistory(res.data.data || [])
        } catch (err2) {
          console.error('Error fetching history:', err2)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  const filteredHistory = history.filter(v => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      v.title?.toLowerCase().includes(q) ||
      v.description?.toLowerCase().includes(q) ||
      getDoctorName(v.doctor).toLowerCase().includes(q)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Visit History</h1>
          <p className="section-subtitle">Chronological record of your hospital visits</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search visits..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
            />
          </div>
          <button className="btn-secondary flex items-center gap-2 whitespace-nowrap">
            <Download size={16} /> Download Full History
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{history.length}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Total Visits</p>
        </div>
        <div className="card p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-purple-600">{history.filter(v => v.recordType === 'Lab Report').length}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Lab Reports</p>
        </div>
        <div className="card p-4 border border-gray-100 shadow-sm text-center">
          <p className="text-2xl font-bold text-teal-600">{history.filter(v => v.recordType === 'Prescription' || !v.recordType).length}</p>
          <p className="text-xs text-gray-500 font-medium mt-1">Prescriptions</p>
        </div>
      </div>

      <div className="relative">
        {filteredHistory.length > 0 && <div className="absolute left-[39px] top-4 bottom-4 w-0.5 bg-blue-100 hidden md:block"></div>}
        <div className="space-y-6">
          {filteredHistory.length > 0 ? (
            filteredHistory.map((v, i) => (
              <div key={v._id || i} className="flex flex-col md:flex-row gap-4 relative">
                <div className="md:w-32 flex-shrink-0 pt-2 flex items-center md:items-start md:justify-end gap-3 z-10">
                  <div className="text-right hidden md:block">
                    <p className="font-bold text-gray-900 text-sm">{new Date(v.createdAt).getDate()}</p>
                    <p className="text-xs text-blue-600 font-medium">{new Date(v.createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center justify-end gap-1"><Clock size={10} /> {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center border-4 border-white shadow-sm flex-shrink-0">
                    <Activity size={12} />
                  </div>
                  <div className="md:hidden flex-1">
                    <p className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Calendar size={14} className="text-blue-500" /> {new Date(v.createdAt).toLocaleDateString()} <span className="text-xs text-gray-400 font-normal">at {new Date(v.createdAt).toLocaleTimeString()}</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 card p-5 hover:border-blue-200 transition-colors shadow-sm ml-10 md:ml-0 group border border-gray-100 relative">
                  <div className="absolute top-5 -left-2 w-4 h-4 bg-white border-l border-b border-gray-100 rotate-45 hidden md:block group-hover:border-blue-200 transition-colors"></div>
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b border-gray-50 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg shadow-inner">
                        {getDoctorName(v.doctor)?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">Dr. {getDoctorName(v.doctor)}</h3>
                        <p className="text-sm text-blue-600 font-medium flex items-center gap-1.5"><Stethoscope size={14} /> Consultation</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm border flex items-center gap-1 ${
                      v.recordType === 'Lab Report'
                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    }`}>
                      <HeartPulse size={12} /> {v.recordType || 'Prescription'}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><Activity size={14} className="text-orange-500" /> Diagnosis / Title</p>
                      <p className="text-sm font-medium text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-100">{v.title || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><FileText size={14} className="text-purple-500" /> Notes / Description</p>
                      <p className="text-sm font-medium text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-100">{v.description || 'Routine visit.'}</p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-50 flex flex-wrap gap-2">
                    {v.fileUrl && (
                      <a
                        href={v.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1.5"
                      >
                        <Download size={14} /> Download Record
                      </a>
                    )}
                    {v.recordType === 'Lab Report' && v.fileUrl && (
                      <a
                        href={v.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1.5"
                      >
                        <FileText size={14} /> View Lab Report
                      </a>
                    )}
                    {!v.fileUrl && (
                      <button disabled className="px-4 py-2 bg-gray-50 text-gray-400 text-xs font-bold rounded-lg cursor-not-allowed flex items-center gap-1.5">
                        <FileText size={14} /> No File
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-300">
              <Activity size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">No history found</h3>
              <p className="text-gray-500 text-sm">{searchQuery ? `No visits matching "${searchQuery}"` : "You haven't had any completed medical visits yet."}</p>
              {searchQuery && <button onClick={() => setSearchQuery('')} className="mt-3 text-blue-600 font-semibold text-sm hover:underline">Clear Search</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
