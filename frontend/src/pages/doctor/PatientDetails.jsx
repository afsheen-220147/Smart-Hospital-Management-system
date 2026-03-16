import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Calendar, Clock, Video, FileText, Activity, Users, CheckCircle, Phone, Mail, MapPin, HeartPulse, ExternalLink, Bot } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import ReportSummaryPanel from '../../components/ReportSummaryPanel'

export default function PatientDetails() {
  const { user } = useAuth()
  const { id: urlPatientId } = useParams()
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showReportPanel, setShowReportPanel] = useState(false)
  const historyRef = useRef(null)

  const isDemoDoctor = user?.email === 'sneha@medicare.com' || user?.email === 'suresh@medicare.com'

  useEffect(() => {
    const fetchMyPatients = async () => {
      let finalPatients = []
      
      try {
        setLoading(true)
        const profRes = await api.get('/doctors/me')
        const docId = profRes.data.data._id
        
        // Fetch all appointments for this doctor to find all patients
        const apptRes = await api.get(`/appointments/doctor/${docId}`)
        const appts = apptRes.data.data || []
        
        // Extract unique patients with basic details
        const patientMap = {}
        appts.forEach(a => {
           if (a.patient && !patientMap[a.patient._id]) {
             patientMap[a.patient._id] = {
               id: a.patient._id,
               name: a.patient.name,
               email: a.patient.email,
               age: 26, // Default or fetch from profile if stored
               gender: 'Not Specified',
               bloodGroup: 'Unknown',
               phone: 'Not provided',
               address: 'Not provided',
               visits: appts.filter(vis => vis.patient?._id === a.patient._id && vis.status === 'completed').map(v => ({
                 date: new Date(v.date).toLocaleDateString(),
                 diag: v.reason,
                 rx: 'See visit records'
               }))
             }
           }
        })
        finalPatients = Object.values(patientMap)
      } catch (err) {
        console.error("Error fetching patients:", err)
      }

      if (isDemoDoctor) {
        const demoPatients = [
          {
            id: 'demo1', name: 'Venkat R.', age: 28, gender: 'Male', bloodGroup: 'B+', phone: '+91 98765 43210', email: 'venkat@gmail.com', address: 'Hyderabad, TG', visits: [
              { date: '15 Feb 2026', diag: 'Routine Checkup', rx: 'Vitamin D3' },
              { date: '10 Jan 2026', diag: 'Mild Hypertension', rx: 'Rest, track BP' }
            ]
          },
          {
            id: 'demo2', name: 'Rahul K.', age: 34, gender: 'Male', bloodGroup: 'O+', phone: '+91 88888 77777', email: 'rahul@gmail.com', address: 'Secunderabad, TG', visits: [
              { date: '05 Mar 2026', diag: 'Chest Pain', rx: 'ECG done, normal. Suggested antacids.' }
            ]
          },
          { id: 'demo3', name: 'Anitha S.', age: 42, gender: 'Female', bloodGroup: 'A-', phone: '+91 77777 66666', email: 'anitha@gmail.com', address: 'Cyberabad, TG', visits: [] },
        ]
        const merged = [...demoPatients, ...finalPatients]
        setPatients(merged)
        
        // Use patient from URL if present
        if (urlPatientId) {
          const found = merged.find(p => p.id === urlPatientId)
          if (found) setSelected(found)
          else setSelected(merged[0])
        } else {
          setSelected(merged[0])
        }
      } else {
        setPatients(finalPatients)
        if (urlPatientId) {
          const found = finalPatients.find(p => p.id === urlPatientId)
          if (found) setSelected(found)
          else if (finalPatients.length > 0) setSelected(finalPatients[0])
        } else if (finalPatients.length > 0) {
          setSelected(finalPatients[0])
        }
      }
      setLoading(false)
    }

    if (user) fetchMyPatients()
  }, [user, isDemoDoctor, urlPatientId])

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const fetchedIds = useRef(new Set())

  useEffect(() => {
    const fetchPatientProfile = async () => {
      if (selected && !String(selected.id).startsWith('demo') && !fetchedIds.current.has(selected.id)) {
        try {
          const res = await api.get('/patients')
          const realPatient = res.data.data.find(p => p.user?._id === selected.id)
          if (realPatient) {
            fetchedIds.current.add(selected.id)
            setSelected(prev => ({
              ...prev,
              age: realPatient.dateOfBirth ? Math.floor((new Date() - new Date(realPatient.dateOfBirth)) / 31557600000) : 26,
              gender: realPatient.gender || 'Not Specified',
              bloodGroup: realPatient.bloodGroup || 'Unknown',
              phone: realPatient.phone || 'Not provided',
              address: realPatient.address || 'Not provided'
            }))
          }
        } catch (e) {
          console.error("Error fetching full patient profile:", e)
        }
      }
    }

    if (selected) fetchPatientProfile()
  }, [selected?.id])

  const handlePatientSelect = (p) => {
    setSelected(p)
    navigate(`/doctor/patients/${p.id}`)
  }

  const handleStartDiagnosis = () => {
    if (!selected) return
    navigate('/doctor/diagnosis', { 
      state: { 
        patientName: selected.name 
      } 
    })
  }

  const handleViewHistory = () => {
    historyRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-120px)] animate-fadeIn">
      {/* Left sidebar - Patient List */}
      <div className="md:w-80 flex-shrink-0 card p-0 flex flex-col border border-gray-100 shadow-sm overflow-hidden bg-white h-full">
        <div className="p-4 border-b border-gray-100 bg-gray-50/80 z-10 sticky top-0">
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wider"><Users size={16} className="text-teal-600" /> My Patients</h2>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search patients..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl focus:ring-teal-500 focus:border-teal-500 shadow-inner" 
            />
            <Activity size={14} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {filteredPatients.map(p => (
            <div key={p.id} onClick={() => handlePatientSelect(p)}
              className={`p-4 cursor-pointer transition-colors flex items-center gap-3 ${selected?.id === p.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : 'hover:bg-gray-50 border-l-4 border-l-transparent'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${selected?.id === p.id ? 'bg-teal-200 text-teal-800' : 'bg-gray-100 text-gray-600'}`}>
                {p.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${selected?.id === p.id ? 'text-teal-900' : 'text-gray-900'}`}>{p.name}</p>
                <p className="text-xs text-gray-500 truncate">{p.age} yrs · {p.gender}</p>
              </div>
            </div>
          ))}
          {filteredPatients.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm italic">
              No patients found.
            </div>
          )}
        </div>
      </div>

      {/* Right pane - Details */}
      {selected ? (
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 no-scrollbar pb-10">
          {/* Profile Card */}
          <div className="card p-6 border-t-4 border-t-teal-500 shadow-sm relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full mix-blend-multiply filter blur-2xl opacity-70"></div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
              <div className="w-24 h-24 rounded-3xl bg-teal-100 text-teal-700 font-extrabold text-4xl flex items-center justify-center shadow-inner border-2 border-white">
                {selected.name.charAt(0)}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-900">{selected.name}</h2>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-2">
                  <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5"><Calendar size={14} className="text-teal-500" /> {selected.age} Years</span>
                  <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5"><Activity size={14} className="text-teal-500" /> {selected.gender}</span>
                  <span className="text-sm font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-lg flex items-center gap-1"><HeartPulse size={12} /> {selected.bloodGroup}</span>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                  <button onClick={handleViewHistory} className="btn-primary py-2 px-5 text-sm flex items-center gap-2"><FileText size={16} /> View Full History</button>
                  <button onClick={handleStartDiagnosis} className="btn-secondary py-2 px-5 text-sm flex items-center gap-2"><Activity size={16} /> Start Diagnosis</button>
                  <button onClick={() => setShowReportPanel(true)} className="btn-secondary py-2 px-5 text-sm flex items-center gap-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"><Bot size={16} /> AI Report Analysis</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-100 pt-5 mt-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Phone size={14} className="text-gray-500" /></div>
                <div className="text-xs"><p className="text-gray-400 font-bold uppercase tracking-wider">Phone</p><p className="font-medium text-gray-900">{selected.phone}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><Mail size={14} className="text-gray-500" /></div>
                <div className="text-xs"><p className="text-gray-400 font-bold uppercase tracking-wider">Email</p><p className="font-medium text-gray-900">{selected.email}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center"><MapPin size={14} className="text-gray-500" /></div>
                <div className="text-xs"><p className="text-gray-400 font-bold uppercase tracking-wider">Address</p><p className="font-medium text-gray-900 truncate">{selected.address}</p></div>
              </div>
            </div>
          </div>

          {/* Visits History - Enhanced Professional UI */}
          <div ref={historyRef} className="card shadow-sm border border-gray-100 p-0 overflow-hidden shrink-0">
            <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-blue-50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                    <Clock size={18} className="text-teal-600" /> Medical History
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Complete record of past consultations and treatments</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-2xl font-black text-teal-600">{selected.visits.length}</p>
                    <p className="text-xs font-bold text-gray-400 uppercase">Total Visits</p>
                  </div>
                  {selected.visits.length > 0 && (
                    <div className="text-center px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                      <p className="text-sm font-bold text-gray-700">{selected.visits[0]?.date}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase">Last Visit</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-gray-50">
              {selected.visits.length > 0 ? selected.visits.map((v, i) => (
                <div key={i} className="p-6 hover:bg-gray-50/50 transition-all duration-200 relative group">
                  {/* Timeline indicator */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-teal-200 via-teal-100 to-transparent hidden sm:block" />
                  <div className="absolute left-[18px] top-6 w-4 h-4 rounded-full bg-teal-500 border-4 border-white shadow-sm hidden sm:block z-10" />
                  
                  <div className="sm:ml-8">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 text-teal-800 rounded-lg text-sm font-bold">
                        <Calendar size={14} /> {v.date}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs font-medium">
                        #{selected.visits.length - i}
                      </span>
                      {i === 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold uppercase">Most Recent</span>
                      )}
                    </div>
                    
                    {/* Content Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Diagnosis Card */}
                      <div className="bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-900/40 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                            <Activity size={16} className="text-orange-500" />
                          </div>
                          <p className="text-xs font-bold uppercase text-orange-600 tracking-wider">Diagnosis & Symptoms</p>
                        </div>
                        <p className="text-sm font-medium text-gray-800 leading-relaxed">{v.diag || 'Not recorded'}</p>
                      </div>
                      
                      {/* Prescription Card */}
                      <div className="bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <FileText size={16} className="text-blue-500" />
                          </div>
                          <p className="text-xs font-bold uppercase text-blue-600 tracking-wider">Prescription</p>
                        </div>
                        <p className="text-sm font-medium text-gray-800 leading-relaxed">{v.rx || 'No medications prescribed'}</p>
                      </div>
                    </div>
                    
                    {/* Additional info row if available */}
                    {(v.notes || v.followUp) && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        {v.notes && (
                          <div className="flex items-start gap-2 text-sm">
                            <span className="font-bold text-gray-500">Notes:</span>
                            <span className="text-gray-700">{v.notes}</span>
                          </div>
                        )}
                        {v.followUp && (
                          <div className="flex items-center gap-2 text-sm mt-2">
                            <span className="font-bold text-gray-500">Follow-up:</span>
                            <span className="text-teal-700 font-medium">{v.followUp}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} className="text-gray-300" />
                  </div>
                  <p className="font-bold text-gray-700 text-lg">No Medical History</p>
                  <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                    This patient has no recorded visits yet. Start a diagnosis session to create their first medical record.
                  </p>
                  <button 
                    onClick={handleStartDiagnosis} 
                    className="mt-4 btn-primary py-2 px-5 text-sm inline-flex items-center gap-2"
                  >
                    <Activity size={16} /> Start First Diagnosis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 card flex flex-col items-center justify-center text-gray-400 border border-gray-200 border-dashed bg-gray-50/50">
          <Users size={48} className="mb-4 opacity-50 text-teal-200" />
          <p className="font-medium">Select a patient to view details</p>
        </div>
      )}

      {/* AI Report Summary Panel */}
      <ReportSummaryPanel 
        isOpen={showReportPanel} 
        onClose={() => setShowReportPanel(false)}
        patientName={selected?.name}
      />
    </div>
  )
}
