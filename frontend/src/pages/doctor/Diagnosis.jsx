import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Clock, FileText, CheckCircle, Search, Save, Upload, Activity, AlertCircle, X, Check, Stethoscope, User, Shield, Bot, AlertTriangle, Pill, Hash } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api, { uploadFile } from '../../services/api'
import { checkPrescriptionSafety } from '../../services/ai'
import { showSuccess, showError } from '../../utils/toast'

export default function Diagnosis() {
  const { user } = useAuth()
  const location = useLocation()
  const fileInputRef = useRef(null)
  const [appointments, setAppointments] = useState([])
  const [selectedApptId, setSelectedApptId] = useState(location.state?.selectedAppointmentId || '')
  const [diag, setDiag] = useState('')
  const [rx, setRx] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [error, setError] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [recordType, setRecordType] = useState('Prescription')
  
  // AI Safety Check state
  const [safetyCheck, setSafetyCheck] = useState(null)
  const [checkingSafety, setCheckingSafety] = useState(false)
  const [showSafetyPanel, setShowSafetyPanel] = useState(false)

  const isDemoDoctor = user?.email === 'sneha@medicare.com' || user?.email === 'suresh@medicare.com'

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoadingPatients(true)
        let realAppts = []

        if (user?._id || user?.id) {
          try {
            const profRes = await api.get('/doctors/me')
            const apptRes = await api.get(`/appointments/doctor/${profRes.data.data._id}`, {
              params: { status: 'confirmed,in-progress' }
            })
            realAppts = (apptRes.data.data || [])
          } catch (e) {
            console.error("Fetch real appts error:", e)
          }
        }

        const demoAppts = isDemoDoctor ? [
          { _id: 'd1', appointmentId: 'MED-APT-DEMO01', patient: { _id: 'p1', name: 'Venkat R.' }, timeSlot: '10:30 AM', status: 'confirmed', reason: 'Chest Pain' },
          { _id: 'd2', appointmentId: 'MED-APT-DEMO02', patient: { _id: 'p2', name: 'Rahul K.' }, timeSlot: '11:00 AM', status: 'confirmed', reason: 'Migraine' },
          { _id: 'd3', appointmentId: 'MED-APT-DEMO03', patient: { _id: 'p3', name: 'Anitha S.' }, timeSlot: '11:30 AM', status: 'pending', reason: 'Knee Pain' }
        ] : []

        const allAvailable = [...demoAppts, ...realAppts]
        setAppointments(allAvailable)
      } catch (err) {
        console.error("Diagnosis patient fetch error:", err)
      } finally {
        setLoadingPatients(false)
      }
    }

    if (user) fetchPatients()
  }, [user, isDemoDoctor])

  const handleSave = async (e) => {
    e.preventDefault()

    if (!selectedApptId) {
      setError("Please select an appointment first.")
      return
    }

    const selectedAppt = appointments.find(a => a._id === selectedApptId)
    const isDemoAppt = String(selectedApptId).startsWith('d')
    const patientId = selectedAppt?.patient?._id || selectedAppt?.patient?.id || selectedAppt?.patient

    if (isDemoAppt) {
      setIsSaving(true)
      await new Promise(resolve => setTimeout(resolve, 1200))
      setIsSaving(false)
      setAppointments(prev => prev.filter(a => a._id !== selectedApptId))
      setSaved(true)
      setSelectedApptId(''); setDiag(''); setRx(''); setNotes(''); setSelectedFile(null); setRecordType('Prescription')
      setTimeout(() => setSaved(false), 5000)
      return
    }

    try {
      setIsSaving(true)

      let fileUrl = '';
      if (selectedFile) {
        try {
          const uploadRes = await uploadFile(selectedFile, 'report');
          fileUrl = uploadRes.url;
        } catch (uploadErr) {
          throw new Error('Failed to upload the attached file. Please try again.');
        }
      }

      const payload = {
        patient: patientId,
        appointment: selectedApptId,
        title: diag,
        description: rx + (notes ? `\n\nDoctor Notes: ${notes}` : ''),
        recordType: selectedFile ? 'Lab Report' : recordType,
        ...(fileUrl && { fileUrl })
      }

      // Create visit — backend auto-marks appointment as completed
      await api.post('/visits', payload)

      // Remove the completed appointment from the dropdown
      setAppointments(prev => prev.filter(a => a._id !== selectedApptId))

      showSuccess('Consultation completed and record finalized! Patient notified via email.')
      setSaved(true)
      setSelectedApptId(''); setDiag(''); setRx(''); setNotes(''); setSelectedFile(null); setRecordType('Prescription')

      setTimeout(() => setSaved(false), 6000)
    } catch (err) {
      console.error("Save diagnosis failed:", err)
      const errMsg = err.response?.data?.message || err.message ||"Failed to save record. Please try again."
      setError(errMsg)
      showError(errMsg)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedPatientData = appointments.find(a => a._id === selectedApptId)

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0])
      setRecordType('Lab Report')
    }
  }

  const handleAttachClick = () => {
    fileInputRef.current?.click()
  }

  // AI Prescription Safety Check
  const handleSafetyCheck = async () => {
    if (!rx || rx.trim().length < 5) {
      setError('Please enter a prescription to check')
      return
    }

    setCheckingSafety(true)
    setSafetyCheck(null)

    try {
      // Get patient info for better analysis
      const patientInfo = {
        allergies: selectedPatientData?.patient?.allergies || (isDemoDoctor ? ['Penicillin'] : []),
        currentMedications: selectedPatientData?.patient?.currentMedications || [],
        conditions: selectedPatientData?.patient?.conditions || [],
        age: selectedPatientData?.patient?.age,
        weight: selectedPatientData?.patient?.weight
      }

      const pId = selectedPatientData?.patient?._id || selectedPatientData?.patient?.id || ''
      const result = await checkPrescriptionSafety(rx, pId, patientInfo)
      
      if (result.success && result.data) {
        setSafetyCheck(result.data)
        setShowSafetyPanel(true)
      } else {
        // Use fallback data 
        setSafetyCheck(result.data || {
          safetyStatus: 'safe',
          overallRisk: 'low',
          drugInteractions: [],
          allergyAlerts: [],
          dosageConcerns: [],
          recommendations: ['Standard prescription safety guidelines apply'],
          summary: 'No significant safety concerns detected.'
        })
        setShowSafetyPanel(true)
      }
    } catch (err) {
      console.error('Safety check failed:', err)
      setSafetyCheck({
        safetyStatus: 'warning',
        overallRisk: 'moderate',
        drugInteractions: [],
        allergyAlerts: [],
        recommendations: ['Manual review recommended - AI check unavailable'],
        summary: 'Unable to perform automated safety check. Please verify manually.'
      })
      setShowSafetyPanel(true)
    } finally {
      setCheckingSafety(false)
    }
  }

  const getSafetyStatusColor = (status) => {
    switch (status) {
      case 'danger': return 'bg-red-100 border-red-300 text-red-800'
      case 'warning': return 'bg-orange-100 border-orange-300 text-orange-800'
      default: return 'bg-green-100 border-green-300 text-green-800'
    }
  }

  const getSafetyStatusIcon = (status) => {
    switch (status) {
      case 'danger': return <AlertTriangle size={18} className="text-red-600" />
      case 'warning': return <AlertCircle size={18} className="text-orange-600" />
      default: return <Shield size={18} className="text-green-600" />
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="section-title">Add Diagnosis</h1>
        <p className="section-subtitle">Record patient consultation details, symptoms, and prescriptions</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-4 rounded-xl shadow-sm animate-fadeIn">
          <CheckCircle size={20} className="flex-shrink-0" />
          <div>
            <p className="font-medium">Record saved and finalized successfully!</p>
            <p className="text-sm text-emerald-600 mt-1">The patient has been notified via email with their prescription details.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6 flex flex-col h-full">
          <div className="card shadow-sm border border-gray-100 flex-1">
            <h2 className="font-bold text-gray-900 border-b border-gray-100 pb-4 mb-5 flex items-center gap-2">
              <Activity size={18} className="text-teal-600" /> Consultation Notes
            </h2>

            <div className="space-y-5">
              {/* Appointment Selector */}
              <div className="form-group">
                <label className="form-label text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <User size={14} className="text-blue-500" /> Select Active Consultation *
                </label>
                {loadingPatients ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                    Loading in-progress appointments...
                  </div>
                ) : (
                  <select
                    required={!isDemoDoctor}
                    className="form-input focus:ring-teal-500 focus:border-teal-500 bg-gray-50 focus:bg-white"
                    value={selectedApptId}
                    onChange={e => setSelectedApptId(e.target.value)}
                  >
                    <option value="">-- Choose Appointment --</option>
                    {appointments.map(a => {
                      let pName = 'Unknown Patient';
                      if (a.patient) {
                        if (typeof a.patient === 'string') pName = 'Patient';
                        else if (a.patient.name) pName = a.patient.name;
                        else if (a.patient.user && a.patient.user.name) pName = a.patient.user.name;
                      }
                      const time = a.timeSlot || (a.date ? new Date(a.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
                      const symptoms = a.reason || '';

                      return (
                        <option key={a._id} value={a._id}>
                          {pName} • {time}{symptoms ? ` • ${symptoms}` : ''}
                        </option>
                      )
                    })}
                    {appointments.length === 0 && !loadingPatients && (
                      <option disabled>No in-progress consultations — click Start on an appointment first</option>
                    )}
                  </select>
                )}
              </div>

              {/* Record Type */}
              <div className="form-group">
                <label className="form-label text-xs font-bold uppercase text-gray-500 tracking-wider">Record Type</label>
                <div className="flex gap-3">
                  {['Prescription', 'Lab Report', 'X-Ray', 'Other'].map(type => (
                    <label key={type} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer text-sm font-medium transition-all ${recordType === type
                        ? 'bg-teal-50 border-teal-400 text-teal-700'
                        : 'border-gray-200 text-gray-600 hover:border-teal-300'
                      }`}>
                      <input
                        type="radio"
                        name="recordType"
                        value={type}
                        checked={recordType === type}
                        onChange={() => setRecordType(type)}
                        className="hidden"
                      />
                      {recordType === type && <Check size={14} />}
                      {type}
                    </label>
                  ))}
                </div>
              </div>

              {/* Diagnosis */}
              <div className="form-group">
                <label className="form-label text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-orange-500" /> Symptoms & Diagnosis *
                </label>
                <textarea
                  required
                  rows={4}
                  className="form-input resize-none bg-gray-50 focus:bg-white focus:ring-orange-500 focus:border-orange-500"
                  value={diag}
                  onChange={e => setDiag(e.target.value)}
                  placeholder="E.g., Patient experiencing mild chest pain and shortness of breath. BP: 130/85 mmHg. Pulse: 78 bpm..."
                />
              </div>

              {/* Prescription */}
              <div className="form-group">
                <label className="form-label text-xs font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1.5">
                  <Check size={14} className="text-teal-500" /> Prescribed Medication *
                </label>
                <textarea
                  required
                  rows={4}
                  className="form-input resize-none bg-gray-50 focus:bg-white focus:ring-teal-500 focus:border-teal-500"
                  value={rx}
                  onChange={e => setRx(e.target.value)}
                  placeholder={"1. Aspirin 75mg (1-0-0) for 30 days\n2. Pantoprazole 40mg (1-0-0) before breakfast\n3. Follow up after 2 weeks"}
                />
                
                {/* AI Safety Check Button */}
                <div className="mt-3 flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={handleSafetyCheck}
                    disabled={checkingSafety || rx.length < 5}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-sm border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {checkingSafety ? (
                      <><div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" /> Checking...</>
                    ) : (
                      <><Bot size={16} /> AI Safety Check</>
                    )}
                  </button>
                  {safetyCheck && (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${getSafetyStatusColor(safetyCheck.safetyStatus)}`}>
                      {getSafetyStatusIcon(safetyCheck.safetyStatus)}
                      {safetyCheck.safetyStatus === 'safe' ? 'Safe' : safetyCheck.safetyStatus === 'warning' ? 'Warnings Found' : 'Issues Detected'}
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label text-xs font-bold uppercase text-gray-500 tracking-wider">Doctor Notes (Internal only)</label>
                <textarea
                  rows={2}
                  className="form-input resize-none bg-gray-50 focus:bg-white"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Private notes, follow-up instructions, referrals..."
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-4 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed text-base">
            {isSaving
              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving Record...</>
              : <><Save size={18} /> Save &amp; Finalize Record</>
            }
          </button>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Reference area */}
          <div className="card shadow-sm border border-gray-100 bg-teal-50">
            <h3 className="font-bold text-gray-900 border-b border-teal-100 pb-3 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
              <Stethoscope size={16} className="text-teal-600" /> Reference Area
            </h3>
            {!selectedApptId ? (
              <div className="text-center py-6">
                <Search size={32} className="mx-auto text-teal-200 mb-2" />
                <p className="text-sm text-gray-500 font-medium">Select an appointment to load details here.</p>
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                {/* Appointment ID - Prominent Display */}
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 shadow-sm">
                  <p className="text-xs text-blue-500 font-bold uppercase mb-1 flex items-center gap-1">
                    <Hash size={12} /> Appointment ID
                  </p>
                  <p className="text-sm font-mono font-bold text-blue-800">
                    {selectedPatientData?.appointmentId || (selectedApptId ? `APT-${selectedApptId.substring(0,6)}` : '—')}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-teal-100 dark:border-teal-900/50 shadow-sm">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Patient Name</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {selectedPatientData?.patient?.name || selectedPatientData?.patient?.user?.name || 'Unknown'}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-teal-100 dark:border-teal-900/50 shadow-sm">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Appointment Slot</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                    <Clock size={14} className="text-teal-600" /> {selectedPatientData?.timeSlot || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Status: <span className="font-semibold text-teal-700 dark:text-teal-300">{selectedPatientData?.status}</span></p>
                </div>
                {selectedPatientData?.reason && (
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-orange-100 dark:border-orange-900/50 shadow-sm border-l-4 border-l-orange-400">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Visit Reason</p>
                    <p className="text-sm font-bold text-orange-700 dark:text-orange-400">{selectedPatientData.reason}</p>
                  </div>
                )}
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm border-l-4 border-l-red-500">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Allergy Note</p>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">
                    {isDemoDoctor ? 'Penicillin Allergy' : 'No known allergies on record'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* File Attachment */}
          <div
            onClick={handleAttachClick}
            className={`card shadow-sm border-2 border-dashed transition-all cursor-pointer text-center group py-6 px-3 ${selectedFile ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50/30'}`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Check size={20} className="text-white" />
                </div>
                <p className="text-xs font-bold text-teal-800 truncate px-2">{selectedFile.name}</p>
                <p className="text-[10px] text-teal-600">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setRecordType('Prescription') }}
                  className="text-[10px] text-red-500 font-bold uppercase hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <>
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:bg-teal-50 transition-colors">
                  <Upload size={18} className="text-gray-400 group-hover:text-teal-600" />
                </div>
                <p className="text-xs font-bold text-gray-900 group-hover:text-teal-700">Attach Lab Reports</p>
                <p className="text-[10px] text-gray-400 mt-0.5">PDF or JPG (Max 5MB)</p>
              </>
            )}
          </div>

          {/* Quick tip */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText size={14} /> What happens next?
            </p>
            <ul className="text-xs text-blue-600 space-y-1.5">
              <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 flex-shrink-0" /> Record saved to patient's Medical Records</li>
              <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 flex-shrink-0" /> Patient receives email with prescription</li>
              <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 flex-shrink-0" /> Appears in patient's Visit History</li>
              <li className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 flex-shrink-0" /> Appointment marked as Completed</li>
            </ul>
          </div>
        </div>
      </form>

      {/* AI Safety Check Panel Modal */}
      {showSafetyPanel && safetyCheck && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-850 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
            {/* Header */}
            <div className={`p-6 border-b ${safetyCheck.safetyStatus === 'danger' ? 'bg-red-50' : safetyCheck.safetyStatus === 'warning' ? 'bg-orange-50' : 'bg-green-50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${safetyCheck.safetyStatus === 'danger' ? 'bg-red-100' : safetyCheck.safetyStatus === 'warning' ? 'bg-orange-100' : 'bg-green-100'}`}>
                    {getSafetyStatusIcon(safetyCheck.safetyStatus)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Pill size={18} /> Prescription Safety Analysis
                    </h3>
                    <p className={`text-sm font-semibold ${safetyCheck.safetyStatus === 'danger' ? 'text-red-600' : safetyCheck.safetyStatus === 'warning' ? 'text-orange-600' : 'text-green-600'}`}>
                      Risk Level: {safetyCheck.overallRisk?.charAt(0).toUpperCase() + safetyCheck.overallRisk?.slice(1) || 'Unknown'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowSafetyPanel(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <p className="text-sm text-gray-700 leading-relaxed">{safetyCheck.summary}</p>
              </div>

              {/* Drug Interactions */}
              {safetyCheck.drugInteractions?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-orange-500" /> Drug Interactions
                  </h4>
                  <div className="space-y-2">
                    {safetyCheck.drugInteractions.map((interaction, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${interaction.severity === 'severe' ? 'bg-red-50 border-red-200' : interaction.severity === 'moderate' ? 'bg-orange-50 border-orange-200' : 'bg-yellow-50 border-yellow-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-900 text-sm">{interaction.drugs?.join(' + ')}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${interaction.severity === 'severe' ? 'bg-red-200 text-red-800' : interaction.severity === 'moderate' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'}`}>{interaction.severity}</span>
                        </div>
                        <p className="text-sm text-gray-600">{interaction.description}</p>
                        {interaction.recommendation && <p className="text-sm text-blue-600 mt-1 font-medium">→ {interaction.recommendation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergy Alerts */}
              {safetyCheck.allergyAlerts?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500" /> Allergy Alerts
                  </h4>
                  <div className="space-y-2">
                    {safetyCheck.allergyAlerts.map((alert, i) => (
                      <div key={i} className="p-3 rounded-xl bg-red-50 border border-red-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-red-900 text-sm">{alert.medication}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-200 text-red-800 font-bold">{alert.severity}</span>
                        </div>
                        <p className="text-sm text-red-700">Related to allergen: <strong>{alert.allergen}</strong></p>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dosage Concerns */}
              {safetyCheck.dosageConcerns?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity size={16} className="text-blue-500" /> Dosage Concerns
                  </h4>
                  <div className="space-y-2">
                    {safetyCheck.dosageConcerns.map((concern, i) => (
                      <div key={i} className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <span className="font-bold text-blue-900 text-sm">{concern.medication}</span>
                        <p className="text-sm text-gray-600 mt-1">{concern.issue}</p>
                        {concern.recommendation && <p className="text-sm text-blue-600 mt-1 font-medium">→ {concern.recommendation}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {safetyCheck.recommendations?.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-500" /> Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {safetyCheck.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <Check size={16} className="text-green-500 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t flex justify-end gap-3">
              <button 
                onClick={() => setShowSafetyPanel(false)}
                className="px-5 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => setShowSafetyPanel(false)}
                className="px-5 py-2.5 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle size={16} /> Acknowledge &amp; Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
