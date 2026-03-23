import React, { useState, useEffect } from 'react'
import {
  Users, Activity, Mail, Edit3, Trash2, ShieldCheck, HeartPulse,
  Plus, X, Search, AlertCircle, CheckCircle2, Loader2
} from 'lucide-react'
import api from '../../services/api'
import { showSuccess, showError, getErrorMessage } from '../../utils/toast'

const DEPARTMENTS = [
  'General', 'Cardiologist', 'Neurologist', 'Orthopedic', 'Dermatologist',
  'Pediatrician', 'Psychiatrist', 'Ophthalmologist', 'ENT', 'Gynecologist',
  'Urologist', 'Oncologist', 'Pulmonologist', 'Gastroenterologist', 'Radiologist',
]

export default function ManageDoctors() {
  const [approvedDoctors, setApprovedDoctors] = useState([])
  const [registeredDoctors, setRegisteredDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('approved') // 'approved' | 'registered'

  // Add Doctor form state
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formDept, setFormDept] = useState('General')
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Delete confirm
  const [deleteId, setDeleteId] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Load data
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [approvedRes, registeredRes] = await Promise.all([
        api.get('/admin-doctors'),
        api.get('/doctors'),
      ])
      setApprovedDoctors(approvedRes.data.data || [])
      setRegisteredDoctors(registeredRes.data.data || [])
    } catch (err) {
      showError('Failed to load doctors. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }

  // Add doctor to approved list
  const handleAddDoctor = async (e) => {
    e.preventDefault()
    setFormError('')

    if (!formEmail.toLowerCase().endsWith('@rguktn.ac.in')) {
      setFormError('Email must end with @rguktn.ac.in')
      return
    }

    setFormLoading(true)
    try {
      await api.post('/admin-doctors', {
        name: formName,
        email: formEmail,
        department: formDept,
      })
      showSuccess('Doctor added to approved list successfully!')
      setFormName('')
      setFormEmail('')
      setFormDept('General')
      fetchData()
      setTimeout(() => { setShowModal(false) }, 800)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to add doctor'))
    } finally {
      setFormLoading(false)
    }
  }

  // Remove from approved list
  const handleDelete = async (id) => {
    setDeleteLoading(true)
    try {
      await api.delete(`/admin-doctors/${id}`)
      setApprovedDoctors(prev => prev.filter(d => d._id !== id))
      setDeleteId(null)
      showSuccess('Doctor removed from approved list.')
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to remove doctor'))
    } finally {
      setDeleteLoading(false)
    }
  }

  // Filter
  const filteredApproved = approvedDoctors.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    d.department.toLowerCase().includes(search.toLowerCase())
  )

  const filteredRegistered = registeredDoctors.filter(d =>
    (d.user?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.specialization || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Manage Doctors</h1>
          <p className="section-subtitle">Add, view, or remove approved doctor emails for registration</p>
        </div>
        <button onClick={() => { setShowModal(true); setFormError('') }}
          className="btn-primary flex items-center gap-2 bg-violet-600 hover:bg-violet-700 shadow-md">
          <Plus size={18} /> Add New Doctor
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'approved' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <ShieldCheck size={14} className="inline mr-1.5 -mt-0.5" />
            Approved List ({approvedDoctors.length})
          </button>
          <button onClick={() => setActiveTab('registered')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'registered' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <Users size={14} className="inline mr-1.5 -mt-0.5" />
            Registered Doctors ({registeredDoctors.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search doctors..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100" />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-violet-500" />
        </div>
      )}

      {/* ── APPROVED DOCTORS TAB ── */}
      {!loading && activeTab === 'approved' && (
        <div className="card p-0 shadow-sm border border-gray-100 overflow-hidden">
          {filteredApproved.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ShieldCheck size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No approved doctors yet</p>
              <p className="text-sm">Add doctor emails to allow them to register.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-xs font-bold text-gray-500 tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Doctor Name</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Department</th>
                    <th className="py-4 px-6">Added On</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredApproved.map(d => (
                    <tr key={d._id} className="hover:bg-violet-50/30 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center shadow-inner">
                            {d.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors">{d.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Mail size={13} className="text-gray-400" /> {d.email}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-violet-600 flex items-center gap-1.5">
                          <HeartPulse size={14} /> {d.department}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {deleteId === d._id ? (
                          <div className="flex justify-end items-center gap-2">
                            <span className="text-xs text-red-600 font-medium">Remove?</span>
                            <button onClick={() => handleDelete(d._id)} disabled={deleteLoading}
                              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
                              {deleteLoading ? <Loader2 size={12} className="animate-spin" /> : 'Yes'}
                            </button>
                            <button onClick={() => setDeleteId(null)}
                              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                              No
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteId(d._id)}
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

      {/* ── REGISTERED DOCTORS TAB ── */}
      {!loading && activeTab === 'registered' && (
        <div className="card p-0 shadow-sm border border-gray-100 overflow-hidden">
          {filteredRegistered.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users size={40} className="mx-auto mb-3 opacity-40" />
              <p className="font-medium">No registered doctors</p>
              <p className="text-sm">Doctors will appear here after they register.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 uppercase text-xs font-bold text-gray-500 tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Doctor Info</th>
                    <th className="py-4 px-6">Specialization</th>
                    <th className="py-4 px-6">Experience</th>
                    <th className="py-4 px-6">Fees</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRegistered.map(d => (
                    <tr key={d._id} className="hover:bg-violet-50/30 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 font-bold flex items-center justify-center shadow-inner">
                            {(d.user?.name || 'D').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 group-hover:text-violet-700 transition-colors block">{d.user?.name || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">{d.user?.email || ''}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-violet-600 flex items-center gap-1.5">
                          <HeartPulse size={14} /> {d.specialization}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600">{d.experience} yrs</td>
                      <td className="py-4 px-6 text-sm text-gray-600">₹{d.fees}</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 w-fit bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <Activity size={10} /> Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ADD DOCTOR MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-fadeIn">
            <button onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-1">Add Approved Doctor</h2>
            <p className="text-sm text-gray-500 mb-5">
              Add a doctor email to allow them to register on the platform.
            </p>

            {formError && (
              <div className="mb-4 flex items-start gap-2 bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
                <AlertCircle size={15} className="mt-0.5 flex-shrink-0" /> {formError}
              </div>
            )}

            <form onSubmit={handleAddDoctor} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Doctor Name</label>
                <input required type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  placeholder="Dr. John Doe"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email (@rguktn.ac.in)</label>
                <input required type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)}
                  placeholder="n220737@rguktn.ac.in"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Department / Specialization</label>
                <select value={formDept} onChange={e => setFormDept(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 bg-white">
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <button type="submit" disabled={formLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
                {formLoading ? <Loader2 size={18} className="animate-spin" /> : <><Plus size={18} /> Add Doctor</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
