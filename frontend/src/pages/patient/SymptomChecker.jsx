import React, { useState } from 'react'
import { Bot, Search, AlertCircle, ArrowRight, ShieldCheck, Activity, Stethoscope, AlertTriangle } from 'lucide-react'
import { showWarning, showError } from '../../utils/toast'
import { analyzeSymptoms, detectEmergency } from '../../services/ai'
import { useNavigate } from 'react-router-dom'

const symptomsData = [
  { id: 'fever', label: 'Fever' }, { id: 'cough', label: 'Cough' },
  { id: 'headache', label: 'Headache' }, { id: 'fatigue', label: 'Fatigue' },
  { id: 'nausea', label: 'Nausea' }, { id: 'chest_pain', label: 'Chest Pain' },
  { id: 'dizziness', label: 'Dizziness' }, { id: 'sore_throat', label: 'Sore Throat' },
  { id: 'shortness_of_breath', label: 'Shortness of Breath' },
  { id: 'body_aches', label: 'Body Aches' }, { id: 'chills', label: 'Chills' },
  { id: 'vomiting', label: 'Vomiting' }, { id: 'diarrhea', label: 'Diarrhea' },
  { id: 'abdominal_pain', label: 'Abdominal Pain' },
  { id: 'loss_of_appetite', label: 'Loss of Appetite' },
  { id: 'rash', label: 'Skin Rash' }
]

export default function SymptomChecker() {
  const [selected, setSelected] = useState([])
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const toggle = (id) => {
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])
  }

  const analyze = async () => {
    if (selected.length === 0) return showWarning("Please select at least one symptom")
    
    setLoading(true)
    try {
      const symptoms = selected.map(id => symptomsData.find(s => s.id === id)?.label).filter(Boolean)
      
      const response = await analyzeSymptoms(symptoms)
      
      if (response.success) {
        const data = response.data
        
        if (data.isEmergency) {
          setResult({
            isEmergency: true,
            severity: data.severity,
            immediateActions: data.immediateActions,
            priorityLevel: data.priorityLevel,
            department: data.departmentToContact
          })
        } else {
          const analysis = data.analysis
          setResult({
            isEmergency: false,
            conditions: analysis.possibleConditions || [],
            urgency: analysis.urgencyLevel || 'Medium',
            dept: analysis.recommendedSpecialist || 'General Physician',
            explanation: analysis.explanation,
            immediateActions: analysis.immediateActions || [],
            warningSignsToWatch: analysis.warningSignsToWatch || []
          })
        }
      }
    } catch (error) {
      console.error('Analysis error:', error)
      showError('Failed to analyze symptoms. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyColor = (urgency) => {
    if (urgency?.includes('Critical') || urgency?.includes('High')) return 'text-red-600 bg-red-50 border-red-200'
    if (urgency?.includes('Medium')) return 'text-orange-600 bg-orange-50 border-orange-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-10 mt-6 relative z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20 rotate-3 transition-transform hover:rotate-6">
          <Bot size={40} className="text-white drop-shadow-md" />
        </div>
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-700 tracking-tight">AI Symptom Checker</h1>
        <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto font-medium">Select your symptoms and get an instant, AI-powered preliminary assessment.</p>
      </div>

      {!result ? (
        <div className="card shadow-lg border border-indigo-100 p-8 relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-50 rounded-full mix-blend-multiply filter blur-3xl opacity-50 translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

          <h3 className="font-bold text-gray-900 mb-6 text-xl flex items-center gap-2 relative z-10"><Activity className="text-indigo-600" /> What are you experiencing?</h3>
          <div className="flex flex-wrap gap-3 mb-10 relative z-10">
            {symptomsData.map(s => {
              const isActive = selected.includes(s.id)
              return (
                <button key={s.id} onClick={() => toggle(s.id)}
                  className={`px-5 py-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200 shadow-sm ${isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 transform scale-105 shadow-md shadow-indigo-600/20'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50'
                    }`}>
                  {s.label}
                </button>
              )
            })}
          </div>

          <div className="relative z-10 flex flex-col items-center border-t border-gray-100 pt-8 mt-4">
            <button onClick={analyze} disabled={selected.length === 0 || loading}
              className="btn-primary w-full md:w-auto md:px-12 py-4 text-lg font-bold shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 group disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Analyzing with AI...</>
              ) : (
                <><Search className="group-hover:scale-110 transition-transform" /> Analyze Symptoms</>
              )}
            </button>
            <p className="text-xs text-center text-gray-400 mt-4 flex items-center gap-1.5 justify-center font-medium max-w-sm">
              <ShieldCheck size={14} /> Powered by AI. Not a substitute for professional medical advice.
            </p>
          </div>
        </div>
      ) : (
        <div className="card shadow-xl border-2 border-indigo-100 p-8 md:p-10 relative overflow-hidden animate-fadeInUp">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

          {result.isEmergency ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-4 bg-red-100 rounded-2xl mb-4">
                <AlertTriangle size={48} className="text-red-600" />
              </div>
              <h2 className="text-3xl font-extrabold text-red-600 mb-2">⚠️ EMERGENCY DETECTED</h2>
              <p className="text-gray-600 font-medium mb-6">Severity: {result.severity}</p>
              
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-left mb-6">
                <h3 className="font-bold text-red-700 mb-3">Immediate Actions:</h3>
                <ul className="space-y-2">
                  {result.immediateActions?.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-red-800">
                      <span className="text-red-500 mt-1">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
              
              <p className="text-lg font-semibold text-gray-800 mb-4">
                Contact: <span className="text-red-600">{result.department}</span>
              </p>
              
              <a href="tel:102" className="btn-primary py-4 px-8 bg-red-600 hover:bg-red-700 text-lg inline-flex items-center gap-2">
                📞 Call Emergency (102)
              </a>
            </div>
          ) : (
            <>
              <div className="text-center mb-10 pt-4">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-50 rounded-2xl mb-4">
                  <Bot size={32} className="text-indigo-600" />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-2">AI Analysis Complete</h2>
                <p className="text-gray-500 font-medium">Based on {selected.length} symptom{selected.length > 1 ? 's' : ''} reported</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className={`p-6 rounded-2xl border-2 ${getUrgencyColor(result.urgency)}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={20} />
                    <p className="text-xs font-bold uppercase tracking-widest">Urgency Level</p>
                  </div>
                  <p className="text-2xl font-black">{result.urgency}</p>
                </div>

                <div className="p-6 rounded-2xl border-2 bg-indigo-50 border-indigo-100 md:col-span-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Stethoscope size={20} className="text-indigo-500" />
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">Recommended Specialist</p>
                  </div>
                  <p className="text-2xl font-black text-indigo-900">{result.dept}</p>
                </div>
              </div>

              {result.conditions?.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity size={18} className="text-blue-500" /> Possible Conditions
                  </h3>
                  <div className="space-y-3">
                    {result.conditions.map((condition, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900">{condition.name}</p>
                          <p className="text-sm text-gray-500">{condition.description}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          condition.probability === 'high' ? 'bg-red-100 text-red-700' :
                          condition.probability === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {condition.probability}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.explanation && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-blue-900 mb-2">AI Explanation</h3>
                  <p className="text-blue-800">{result.explanation}</p>
                </div>
              )}

              {result.immediateActions?.length > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-6 mb-6">
                  <h3 className="font-bold text-green-900 mb-3">Recommended Actions</h3>
                  <ul className="space-y-2">
                    {result.immediateActions.map((action, i) => (
                      <li key={i} className="flex items-center gap-2 text-green-800">
                        <span className="w-5 h-5 bg-green-200 rounded-full flex items-center justify-center text-xs">✓</span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center border-t border-gray-100 pt-6">
                <button 
                  onClick={() => navigate('/patient/book')}
                  className="btn-primary py-3 px-6 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 border-none">
                  Find {result.dept} <ArrowRight size={16} />
                </button>
                <button onClick={() => { setResult(null); setSelected([]) }} 
                  className="text-gray-500 hover:text-indigo-600 font-semibold text-sm transition-colors py-2 px-4 rounded-lg hover:bg-indigo-50">
                  Check New Symptoms
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
