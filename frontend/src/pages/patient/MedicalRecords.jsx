import React, { useState, useEffect } from 'react'
import { FileText, Download, Activity, HeartPulse, ShieldCheck, Microscope, Layers, Thermometer, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'

const TABS = ['Overview', 'Lab Reports', 'Prescriptions']

// Helper to extract doctor name from the backend-populated structure
const getDoctorName = (doctor) => {
  if (!doctor) return 'Staff'
  if (typeof doctor === 'string') return doctor
  if (doctor.user?.name) return doctor.user.name
  if (doctor.name) return doctor.name
  return 'Staff'
}

export default function MedicalRecords() {
  const { user } = useAuth()
  const [tab, setTab] = useState('Overview')
  const [records, setRecords] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const isDemoUser = user?.email === 'john@example.com' || user?.email === 'jane@example.com'

  useEffect(() => {
    const fetchData = async () => {
      if (isDemoUser) {
        // John Doe Demo Data
        setRecords([
          { 
            _id: 'r1', 
            recordType: 'Lab Report', 
            title: 'Full Blood Count', 
            description: 'CBC normal. RBC: 5.1M, WBC: 7.2K, Platelets: 250K. No abnormalities detected.',
            createdAt: '2026-02-12', 
            doctor: { user: { name: 'Ravi Kumar' } },
            fileUrl: '#' 
          },
          { 
            _id: 'r2', 
            recordType: 'Prescription', 
            title: 'Sumatriptan 50mg', 
            description: '1. Sumatriptan 50mg - Take 1 tablet at onset of migraine (max 2/day)\n2. Ibuprofen 400mg - As needed for pain (max 3/day with food)',
            createdAt: '2026-02-15', 
            doctor: { user: { name: 'Priya Sharma' } },
            fileUrl: '#',
            status: 'Active'
          },
          { 
            _id: 'r3', 
            recordType: 'Lab Report', 
            title: 'Lipid Profile', 
            description: 'Total Cholesterol: 195 mg/dL (Normal). LDL: 110 mg/dL (Borderline), HDL: 55 mg/dL (Good). TG: 140 mg/dL.',
            createdAt: '2026-01-05', 
            doctor: { user: { name: 'Ravi Kumar' } },
            fileUrl: '#' 
          },
          {
            _id: 'r4',
            recordType: 'Prescription',
            title: 'Amlodipine 5mg + Aspirin 75mg',
            description: '1. Amlodipine 5mg - Once daily in the morning\n2. Aspirin 75mg - After breakfast\n3. Review in 4 weeks',
            createdAt: '2026-01-02',
            doctor: { user: { name: 'Ravi Kumar' } },
            status: 'Active'
          }
        ])
        setProfile({
          bloodGroup: 'O+',
          weight: 72,
          height: 175
        })
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const patId = user?._id || user?.id

        const [visitsRes, profileRes] = await Promise.all([
          api.get(`/visits/patient/${patId}`).catch(() => api.get('/visits')),
          api.get('/patients/me').catch(() => ({ data: { data: {} } }))
        ])

        setRecords(visitsRes.data.data || [])
        setProfile(profileRes.data.data || {})
      } catch (err) {
        console.error('Error fetching records:', err)
        setRecords([])
        setProfile({})
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, isDemoUser, refreshKey])

  const overview = [
    { label: 'Blood Group', value: profile?.bloodGroup || '--', icon: HeartPulse, color: 'text-red-500', bg: 'bg-red-50' },
    { label: 'Weight', value: profile?.weight ? `${profile.weight} kg` : '-- kg', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Height', value: profile?.height ? `${profile.height} cm` : '-- cm', icon: Thermometer, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Member Since', value: new Date(user?.createdAt || Date.now()).toLocaleDateString(), icon: ShieldCheck, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ]

  const labReports = records.filter(r => r.recordType === 'Lab Report' || r.type === 'Lab Report')
  const prescriptions = records.filter(r => r.recordType === 'Prescription' || r.type === 'Prescription')

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="section-title flex items-center gap-2"><Layers size={24} className="text-blue-600" /> Medical Records</h1>
          <p className="section-subtitle">Manage your health history and medical documents</p>
        </div>
        <button 
          onClick={() => setRefreshKey(k => k + 1)} 
          className="btn-secondary flex items-center gap-2 self-start whitespace-nowrap">
          <RefreshCw size={16} /> Refresh Records
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm flex overflow-x-auto no-scrollbar w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${tab === t ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}>
            {t === 'Overview' ? <Activity size={16} /> : t === 'Lab Reports' ? <Microscope size={16} /> : <FileText size={16} />}
            {t}
            {t === 'Lab Reports' && labReports.length > 0 && (
              <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{labReports.length}</span>
            )}
            {t === 'Prescriptions' && prescriptions.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{prescriptions.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'Overview' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {overview.map(o => (
              <div key={o.label} className="card p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${o.bg}`}>
                  <o.icon size={24} className={o.color} />
                </div>
                <p className="text-sm font-medium text-gray-500">{o.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{o.value}</p>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          {records.length > 0 && (
            <div className="card border border-gray-100 shadow-sm p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Activity size={16} className="text-blue-600" /> Recent Medical Activity
              </h3>
              <div className="space-y-3">
                {records.slice(0, 4).map((r, i) => (
                  <div key={r._id || i} className="flex items-center gap-3 pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      r.recordType === 'Lab Report' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {r.recordType === 'Lab Report' ? <Microscope size={16} /> : <FileText size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{r.title}</p>
                      <p className="text-xs text-gray-500">Dr. {getDoctorName(r.doctor)} • {new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase flex-shrink-0 ${
                      r.recordType === 'Lab Report' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>{r.recordType || 'Record'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="col-span-full card border-blue-100 bg-blue-50 mt-2 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-1"><FileText size={20} className="text-blue-600" /> Download Full Health Summary</h3>
              <p className="text-sm text-gray-600 max-w-xl">Compile all your medical history, vitals, prescriptions, and lab reports into a single PDF document for your next doctor's visit.</p>
            </div>
            <button className="btn-primary whitespace-nowrap px-6 py-3 flex items-center gap-2 shadow-md hover:shadow-lg transition-all">
              <Download size={18} /> Generate PDF
            </button>
          </div>
        </div>
      )}

      {tab === 'Lab Reports' && (
        <div className="card p-0 overflow-hidden border border-gray-100 shadow-sm animate-fadeIn">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider uppercase">Report Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider uppercase">Date</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider uppercase">Doctor</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider uppercase">Details</th>
                  <th className="py-4 px-6 text-xs font-bold text-gray-500 tracking-wider uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {labReports.length > 0 ? (
                  labReports.map((r, i) => (
                    <tr key={r._id || i} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center border border-purple-100 shadow-sm">
                            <Microscope size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{r.title}</p>
                            <p className="text-xs font-medium text-gray-500">Pathology</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 font-medium">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-sm text-gray-900 font-semibold">Dr. {getDoctorName(r.doctor)}</td>
                      <td className="py-4 px-6 text-xs text-gray-500 max-w-xs">
                        <p className="truncate">{r.description || '—'}</p>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {r.fileUrl ? (
                          <a 
                            href={r.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-lg transition-colors inline-flex"
                            title="Download or view report"
                          >
                            <Download size={18} />
                          </a>
                        ) : (
                          <span className="text-gray-300 p-2 inline-flex cursor-not-allowed" title="No file attached">
                            <Download size={18} />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-16">
                      <Microscope size={40} className="mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-semibold">No lab reports found</p>
                      <p className="text-gray-400 text-sm mt-1">Lab reports added by your doctor will appear here</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Prescriptions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
          {prescriptions.length > 0 ? (
            prescriptions.map((m, i) => (
              <div key={m._id || i} className="card p-5 border border-gray-100 shadow-sm hover:border-blue-200 transition-all group">
                <div className="flex gap-4 mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100 shadow-inner flex-shrink-0">
                    <span className="text-2xl font-bold text-blue-600">Rx</span>
                  </div>
                  <div className="space-y-1 mt-0.5 flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-base truncate">{m.title}</h3>
                    <p className="text-sm font-semibold text-blue-600">Issued by Dr. {getDoctorName(m.doctor)}</p>
                    <p className="text-xs text-gray-500 font-medium">Date: {new Date(m.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200 self-start flex-shrink-0">
                    Active
                  </span>
                </div>

                {m.description && (
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 mb-4">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Medication Details</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{m.description}</p>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-gray-50">
                  {m.fileUrl ? (
                    <a 
                      href={m.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 font-semibold text-xs rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download size={14} /> Download
                    </a>
                  ) : (
                    <button 
                      disabled 
                      className="flex-1 px-3 py-2 bg-gray-50 text-gray-400 font-semibold text-xs rounded-lg cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      <Download size={14} /> No File
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
              <FileText size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600 font-semibold">No prescriptions found</p>
              <p className="text-gray-400 text-sm mt-1">Prescriptions issued by your doctor will appear here</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
