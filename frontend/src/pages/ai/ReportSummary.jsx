import React, { useState } from 'react'
import { FileText, Bot, Upload, RefreshCw, AlertTriangle, CheckCircle, Activity, Stethoscope, ChevronRight, ShieldCheck, Calendar, AlertCircle } from 'lucide-react'
import Navbar from '../../components/Navbar'
import { showWarning, showError } from '../../utils/toast'
import { summarizeReport, summarizeReportText } from '../../services/ai'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ReportSummary() {
  const [file, setFile] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [inputMode, setInputMode] = useState('file')
  const navigate = useNavigate()
  const { user } = useAuth()

  // Only patients can book appointments
  const canBookAppointment = user?.role === 'patient'

  const handleUpload = async (e) => {
    e.preventDefault()
    
    if (inputMode === 'file' && !file) {
      return showWarning("Please select a file to upload.")
    }
    if (inputMode === 'text' && (!textInput || textInput.trim().length < 20)) {
      return showWarning("Please enter at least 20 characters of report text.")
    }

    setLoading(true)
    try {
      let response;
      
      if (inputMode === 'file') {
        const formData = new FormData()
        formData.append('file', file)
        response = await summarizeReport(formData)
      } else {
        response = await summarizeReportText(textInput)
      }

      if (response.success && response.data) {
        setReport(response.data)
      } else {
        throw new Error('Failed to analyze report')
      }
    } catch (error) {
      console.error('Report analysis error:', error)
      showError('Failed to analyze report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (risk) => {
    if (risk?.includes('Critical') || risk?.includes('High')) return 'bg-red-50 border-red-200 text-red-600'
    if (risk?.includes('Moderate') || risk?.includes('Medium')) return 'bg-orange-50 border-orange-200 text-orange-600'
    return 'bg-green-50 border-green-200 text-green-600'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn p-6">
        <div className="text-center relative z-10 pt-6 border-b border-gray-100 pb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 rotate-3 transition-transform hover:rotate-6">
            <FileText size={40} className="text-white drop-shadow-md" />
            <Bot size={20} className="text-white absolute bottom-1.5 right-1.5 bg-black/20 p-1 rounded-full backdrop-blur-sm" />
          </div>
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight">AI Report Summarizer</h1>
          <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto font-medium">Upload medical reports and get AI-powered analysis with actionable insights.</p>
        </div>

        {!report ? (
          <div className="card shadow-md border border-indigo-100 p-8 max-w-2xl mx-auto">
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setInputMode('file')}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${inputMode === 'file' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Upload File
              </button>
              <button 
                onClick={() => setInputMode('text')}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all ${inputMode === 'text' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Paste Text
              </button>
            </div>

            <form className="w-full flex flex-col items-center" onSubmit={handleUpload}>
              {inputMode === 'file' ? (
                <div className="w-full border-2 border-dashed border-indigo-200 rounded-2xl p-10 text-center hover:bg-indigo-50/50 hover:border-indigo-400 transition-colors cursor-pointer group mb-6 relative overflow-hidden bg-gray-50/30">
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" onChange={e => setFile(e.target.files[0])} accept=".pdf,.doc,.docx,.txt,.png,.jpg" />
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform relative z-10">
                    <Upload size={24} className="text-indigo-500 group-hover:text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 relative z-10">Drag & Drop Report Here</h3>
                  <p className="text-sm text-gray-500 mt-1 relative z-10">Supports PDF, DOCX, TXT, JPG, PNG (Max 5MB)</p>

                  {file && (
                    <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-200 inline-flex items-center gap-3 relative z-10">
                      <FileText size={18} className="text-indigo-600" />
                      <span className="text-sm font-bold text-indigo-900">{file.name}</span>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste your medical report text here...

Example:
Blood Pressure: 140/90 mmHg
Heart Rate: 85 bpm
Cholesterol: 220 mg/dL
Blood Sugar (Fasting): 126 mg/dL

Patient shows signs of..."
                  className="w-full h-64 p-4 border-2 border-indigo-200 rounded-2xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none mb-6 text-sm"
                />
              )}

              <button type="submit" disabled={loading || (inputMode === 'file' ? !file : textInput.length < 20)}
                className="btn-primary w-full max-w-xs py-4 text-base font-bold shadow-xl shadow-indigo-600/20 hover:shadow-2xl hover:shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 group disabled:opacity-50 disabled:cursor-not-allowed rounded-xl mb-4">
                {loading ? (
                  <><RefreshCw size={20} className="animate-spin" /> Analyzing with AI...</>
                ) : (
                  <><Bot size={20} className="group-hover:scale-110 transition-transform" /> Generate AI Summary</>
                )}
              </button>
              <p className="text-xs text-gray-400 flex items-center gap-1.5"><ShieldCheck size={14} /> 100% Secure & HIPAA Compliant Analysis</p>
            </form>
          </div>
        ) : (
          <div className="card shadow-xl border-2 border-indigo-100 p-0 relative overflow-hidden animate-fadeInUp">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

            <div className="p-8 md:p-10 border-b border-gray-100 relative">
              <div className="absolute top-8 right-8 text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Analysis Status</p>
                <div className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <CheckCircle size={14} /> Complete
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
                  <Bot size={32} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">AI Report Analysis</h2>
                  <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2"><FileText size={14} /> {file?.name || 'Text Input'}</p>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-10 bg-gray-50/50 space-y-6">
              {/* Risk Level & Summary */}
              <div className="grid md:grid-cols-3 gap-6">
                <div className={`p-6 rounded-2xl border-2 ${getRiskColor(report.riskLevel)}`}>
                  <h3 className="text-sm font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertTriangle size={18} /> Risk Assessment
                  </h3>
                  <p className="text-2xl font-black">{report.riskLevel || 'Moderate'}</p>
                </div>

                <div className="p-6 rounded-2xl border-2 bg-indigo-50 border-indigo-100 md:col-span-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600 mb-3 flex items-center gap-2">
                    <Stethoscope size={18} /> Suggested Specialist
                  </h3>
                  <p className="text-2xl font-black text-indigo-900">{report.suggestedSpecialist || 'General Physician'}</p>
                </div>
              </div>

              {/* Summary */}
              {report.summary && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <Activity size={18} className="text-blue-500" /> Summary
                  </h3>
                  <p className="text-gray-800 dark:text-gray-200 font-medium leading-relaxed">{report.summary}</p>
                </div>
              )}

              {/* Key Findings */}
              {report.keyFindings?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <CheckCircle size={18} className="text-emerald-500" /> Key Findings
                  </h3>
                  <div className="space-y-2">
                    {report.keyFindings.map((finding, i) => (
                      <div key={i} className="flex gap-3 items-start bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl">
                        <CheckCircle size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-gray-800 dark:text-gray-200 font-medium">{finding}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abnormal Values */}
              {report.abnormalValues?.length > 0 && (
                <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-red-700 mb-4 flex items-center gap-2 border-b border-red-200 pb-2">
                    <AlertCircle size={18} /> Abnormal Values
                  </h3>
                  <div className="space-y-3">
                    {report.abnormalValues.map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-white p-3 rounded-xl border border-red-100">
                        <div>
                          <p className="font-semibold text-gray-900">{item.parameter}</p>
                          <p className="text-sm text-gray-500">Normal: {item.normalRange}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">{item.value}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.severity === 'severe' ? 'bg-red-200 text-red-800' :
                            item.severity === 'moderate' ? 'bg-orange-200 text-orange-800' :
                            'bg-yellow-200 text-yellow-800'
                          }`}>
                            {item.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {report.recommendations?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                    <Activity size={18} className="text-blue-500" /> AI Recommendations
                  </h3>
                  <div className="space-y-3">
                    {report.recommendations.map((rec, i) => (
                      <div key={i} className="flex gap-3 items-start bg-blue-50/50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-50 dark:border-blue-800/40">
                        <CheckCircle size={18} className="text-blue-500 mt-0.5 shrink-0" />
                        <p className="text-gray-800 dark:text-gray-200 font-medium">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {report.nextSteps?.length > 0 && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-700 mb-4">
                    Next Steps
                  </h3>
                  <ul className="space-y-2">
                    {report.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-800">
                        <span className="w-6 h-6 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Book Appointment CTA - Only for patients */}
              {canBookAppointment && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-bold mb-1">Ready to consult a specialist?</h3>
                    <p className="text-indigo-100">Book an appointment with a {report.suggestedSpecialist || 'doctor'}</p>
                  </div>
                  <button 
                    onClick={() => navigate('/patient/book')}
                    className="bg-white text-indigo-600 py-3 px-8 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 whitespace-nowrap">
                    Book Appointment <ChevronRight size={18} />
                  </button>
                </div>
              )}

              {/* Non-patient message */}
              {!canBookAppointment && user && (
                <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 rounded-2xl text-white flex items-center justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-bold mb-1">Analysis Complete</h3>
                    <p className="text-gray-200">Share this report summary with your patient or for further reference.</p>
                  </div>
                </div>
              )}

              {/* Guest message */}
              {!user && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-lg font-bold mb-1">Want to book a consultation?</h3>
                    <p className="text-indigo-100">Login as a patient to book an appointment with a specialist.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/login')}
                    className="bg-white text-indigo-600 py-3 px-8 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 whitespace-nowrap">
                    Login <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 bg-white border-t border-gray-100 flex justify-center">
              <button onClick={() => { setReport(null); setFile(null); setTextInput('') }} className="text-gray-500 hover:text-indigo-600 font-semibold transition-colors py-2 px-6 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50">
                Analyze Another Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
