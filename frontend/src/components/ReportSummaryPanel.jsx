import React, { useState } from 'react'
import { 
  FileText, Bot, Upload, RefreshCw, AlertTriangle, CheckCircle, 
  Activity, Stethoscope, ShieldCheck, AlertCircle, X 
} from 'lucide-react'
import { showWarning, showError } from '../utils/toast'
import { summarizeReport, summarizeReportText } from '../services/ai'

export default function ReportSummaryPanel({ isOpen, onClose, patientName }) {
  const [file, setFile] = useState(null)
  const [textInput, setTextInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [inputMode, setInputMode] = useState('file')

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
      let response
      
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

  const handleReset = () => {
    setReport(null)
    setFile(null)
    setTextInput('')
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const getRiskColor = (risk) => {
    if (risk?.includes('Critical') || risk?.includes('High')) return 'bg-red-50 border-red-200 text-red-600'
    if (risk?.includes('Moderate') || risk?.includes('Medium')) return 'bg-orange-50 border-orange-200 text-orange-600'
    return 'bg-green-50 border-green-200 text-green-600'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden" style={{ top: '70px' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Slide-over Panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-2xl flex animate-slideInRight">
        <div className="relative w-full bg-white shadow-2xl overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={20} />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <FileText size={28} />
                <Bot size={14} className="absolute ml-6 mt-6 bg-black/30 p-0.5 rounded-full" />
              </div>
              <div>
                <h2 className="text-xl font-bold">AI Report Analyzer</h2>
                {patientName && (
                  <p className="text-indigo-100 text-sm">Analyzing report for {patientName}</p>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {!report ? (
              <div className="space-y-6">
                {/* Mode Toggle */}
                <div className="flex gap-3">
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

                <form onSubmit={handleUpload} className="space-y-4">
                  {inputMode === 'file' ? (
                    <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 text-center hover:bg-indigo-50/50 hover:border-indigo-400 transition-colors cursor-pointer group relative overflow-hidden bg-gray-50/30">
                      <input 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                        onChange={e => setFile(e.target.files[0])} 
                        accept=".pdf,.doc,.docx,.txt,.png,.jpg" 
                      />
                      <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform">
                        <Upload size={22} className="text-indigo-500 group-hover:text-indigo-600" />
                      </div>
                      <h3 className="font-bold text-gray-900">Drop Report Here</h3>
                      <p className="text-sm text-gray-500 mt-1">PDF, DOCX, TXT, JPG, PNG</p>

                      {file && (
                        <div className="mt-4 p-3 bg-indigo-50 rounded-xl border border-indigo-200 inline-flex items-center gap-3">
                          <FileText size={18} className="text-indigo-600" />
                          <span className="text-sm font-bold text-indigo-900">{file.name}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Paste medical report text here...

Example:
Blood Pressure: 140/90 mmHg
Heart Rate: 85 bpm
Cholesterol: 220 mg/dL..."
                      className="w-full h-48 p-4 border-2 border-indigo-200 rounded-2xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-none text-sm"
                    />
                  )}

                  <button 
                    type="submit" 
                    disabled={loading || (inputMode === 'file' ? !file : textInput.length < 20)}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-all"
                  >
                    {loading ? (
                      <><RefreshCw size={20} className="animate-spin" /> Analyzing with AI...</>
                    ) : (
                      <><Bot size={20} /> Generate AI Summary</>
                    )}
                  </button>
                  
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                    <ShieldCheck size={14} /> HIPAA Compliant Analysis
                  </p>
                </form>
              </div>
            ) : (
              <div className="space-y-5 animate-fadeIn">
                {/* Success Badge */}
                <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-full border border-emerald-200 w-fit">
                  <CheckCircle size={16} /> Analysis Complete
                </div>

                {/* Risk & Specialist */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl border-2 ${getRiskColor(report.riskLevel)}`}>
                    <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Risk Level
                    </h3>
                    <p className="text-xl font-black">{report.riskLevel || 'Moderate'}</p>
                  </div>

                  <div className="p-4 rounded-xl border-2 bg-indigo-50 border-indigo-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-2 flex items-center gap-1.5">
                      <Stethoscope size={14} /> Specialist
                    </h3>
                    <p className="text-xl font-black text-indigo-900">{report.suggestedSpecialist || 'General'}</p>
                  </div>
                </div>

                {/* Summary */}
                {report.summary && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                      <Activity size={14} className="text-blue-500" /> Summary
                    </h3>
                    <p className="text-gray-800 font-medium text-sm leading-relaxed">{report.summary}</p>
                  </div>
                )}

                {/* Key Findings */}
                {report.keyFindings?.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-emerald-500" /> Key Findings
                    </h3>
                    <div className="space-y-2">
                      {report.keyFindings.map((finding, i) => (
                        <div key={i} className="flex gap-2 items-start bg-gray-50 p-2.5 rounded-lg text-sm">
                          <CheckCircle size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                          <p className="text-gray-800">{finding}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Abnormal Values */}
                {report.abnormalValues?.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-3 flex items-center gap-1.5">
                      <AlertCircle size={14} /> Abnormal Values
                    </h3>
                    <div className="space-y-2">
                      {report.abnormalValues.map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-red-100 text-sm">
                          <div>
                            <p className="font-semibold text-gray-900">{item.parameter}</p>
                            <p className="text-xs text-gray-500">Normal: {item.normalRange}</p>
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
                  <div className="bg-white p-4 rounded-xl border border-gray-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                      <Activity size={14} className="text-blue-500" /> Recommendations
                    </h3>
                    <div className="space-y-2">
                      {report.recommendations.map((rec, i) => (
                        <div key={i} className="flex gap-2 items-start bg-blue-50/50 p-2.5 rounded-lg border border-blue-50 text-sm">
                          <CheckCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
                          <p className="text-gray-800">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {report.nextSteps?.length > 0 && (
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-3">Next Steps</h3>
                    <ul className="space-y-2">
                      {report.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-center gap-2 text-gray-800 text-sm">
                          <span className="w-5 h-5 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleReset} 
                    className="flex-1 py-3 text-gray-600 font-semibold border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Analyze Another
                  </button>
                  <button 
                    onClick={handleClose} 
                    className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
