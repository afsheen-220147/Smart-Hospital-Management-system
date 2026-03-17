import React, { useState, useEffect, useRef } from 'react'
import { 
  MessageSquare, X, Bot, Send, Calendar, Clock, User, 
  Stethoscope, RefreshCw, ChevronDown, Activity, FileText
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { chatWithAssistant } from '../services/ai'

export default function DoctorChatbot() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [todayAppointments, setTodayAppointments] = useState([])
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(true)
  const messagesEndRef = useRef(null)

  const isDemoDoctor = user?.email === 'sneha@medicare.com' || user?.email === 'suresh@medicare.com'

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      fetchTodayAppointments()
      generateWelcomeMessage()
    }
  }, [isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchTodayAppointments = async () => {
    setLoadingAppointments(true)
    try {
      if (isDemoDoctor) {
        // Demo appointments for demo doctors
        setTodayAppointments([
          { _id: 'd1', patient: { name: 'Venkat R.' }, timeSlot: '10:30 AM', status: 'confirmed', reason: 'Chest Pain' },
          { _id: 'd2', patient: { name: 'Rahul K.' }, timeSlot: '11:00 AM', status: 'pending', reason: 'Migraine' },
          { _id: 'd3', patient: { name: 'Anitha S.' }, timeSlot: '11:30 AM', status: 'confirmed', reason: 'Knee Pain' },
          { _id: 'd4', patient: { name: 'Priya M.' }, timeSlot: '2:00 PM', status: 'confirmed', reason: 'Follow-up' },
          { _id: 'd5', patient: { name: 'Suresh K.' }, timeSlot: '3:30 PM', status: 'pending', reason: 'General Checkup' }
        ])
      } else {
        try {
          const profRes = await api.get('/doctors/me')
          const doctorId = profRes.data.data._id
          
          // Get today's appointments
          const today = new Date().toISOString().split('T')[0]
          const apptRes = await api.get(`/appointments/doctor/${doctorId}`)
          const todayAppts = (apptRes.data.data || []).filter(a => {
            const apptDate = new Date(a.date).toISOString().split('T')[0]
            return apptDate === today && ['pending', 'confirmed', 'in-progress'].includes(a.status?.toLowerCase())
          })
          setTodayAppointments(todayAppts)
        } catch (e) {
          console.error('Failed to fetch appointments:', e)
          setTodayAppointments([])
        }
      }
    } finally {
      setLoadingAppointments(false)
    }
  }

  const generateWelcomeMessage = () => {
    const hour = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const doctorName = user?.name?.split(' ')[0] || 'Doctor'
    
    const welcomeMsg = {
      from: 'bot',
      text: `${greeting}, Dr. ${doctorName}! 👋 I'm your AI assistant. I can help you with:\n\n• Today's appointments summary\n• Patient information lookup\n• Schedule management\n• Medical references\n\nWhat would you like to know?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    setMessages([welcomeMsg])
  }

  const handleQuickAction = async (action) => {
    setShowQuickActions(false)
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    switch (action) {
      case 'today':
        setMessages(prev => [...prev, { from: 'user', text: "Show me today's appointments", time }])
        setTyping(true)
        await new Promise(r => setTimeout(r, 800))
        setTyping(false)
        
        if (todayAppointments.length === 0) {
          setMessages(prev => [...prev, { 
            from: 'bot', 
            text: "📅 You have no appointments scheduled for today. Would you like me to check your upcoming schedule?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }])
        } else {
          const apptList = todayAppointments.map((a, i) => 
            `${i + 1}. ${a.patient?.name || 'Patient'} - ${a.timeSlot} (${a.reason || 'Consultation'})`
          ).join('\n')
          
          const confirmedCount = todayAppointments.filter(a => a.status === 'confirmed').length
          const pendingCount = todayAppointments.filter(a => a.status === 'pending').length
          
          setMessages(prev => [...prev, {
            from: 'bot',
            text: `📅 **Today's Appointments (${todayAppointments.length} total)**\n\n${apptList}\n\n✅ Confirmed: ${confirmedCount} | ⏳ Pending: ${pendingCount}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'appointments'
          }])
        }
        break
        
      case 'next':
        setMessages(prev => [...prev, { from: 'user', text: "Who's my next patient?", time }])
        setTyping(true)
        await new Promise(r => setTimeout(r, 600))
        setTyping(false)
        
        const nextAppt = todayAppointments.find(a => a.status === 'confirmed' || a.status === 'pending')
        if (nextAppt) {
          setMessages(prev => [...prev, {
            from: 'bot',
            text: `🔜 **Your next patient:**\n\n👤 ${nextAppt.patient?.name || 'Patient'}\n⏰ ${nextAppt.timeSlot}\n📝 Reason: ${nextAppt.reason || 'General Consultation'}\n\nWould you like to see their medical history?`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }])
        } else {
          setMessages(prev => [...prev, {
            from: 'bot',
            text: "No upcoming appointments for now. Your schedule is clear! 🎉",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }])
        }
        break
        
      case 'summary':
        setMessages(prev => [...prev, { from: 'user', text: "Give me a daily summary", time }])
        setTyping(true)
        await new Promise(r => setTimeout(r, 1000))
        setTyping(false)
        
        const total = todayAppointments.length
        const confirmed = todayAppointments.filter(a => a.status === 'confirmed').length
        const pending = todayAppointments.filter(a => a.status === 'pending').length
        
        setMessages(prev => [...prev, {
          from: 'bot',
          text: `📊 **Daily Summary for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}**\n\n📅 Total Appointments: ${total}\n✅ Confirmed: ${confirmed}\n⏳ Pending Confirmation: ${pending}\n\n${total > 5 ? '⚡ Busy day ahead! Stay hydrated.' : total > 0 ? '👍 Manageable schedule today.' : '🌟 Light day - great for catching up on records!'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }])
        break
        
      default:
        break
    }
  }

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    
    setShowQuickActions(false)
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { from: 'user', text: msg, time }])
    setInput('')
    setTyping(true)

    try {
      // Try AI-powered response
      const conversationHistory = messages.map(m => ({
        role: m.from === 'user' ? 'user' : 'assistant',
        content: m.text
      }))
      
      const aiResponse = await chatWithAssistant(msg, conversationHistory)
      
      setTyping(false)
      setMessages(prev => [...prev, {
        from: 'bot',
        text: aiResponse.data?.reply || getLocalResponse(msg),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    } catch (error) {
      console.error('AI chat error:', error)
      setTyping(false)
      setMessages(prev => [...prev, {
        from: 'bot',
        text: getLocalResponse(msg),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    }
  }

  const getLocalResponse = (msg) => {
    const m = msg.toLowerCase()
    
    if (m.includes('appointment') || m.includes('schedule') || m.includes('today')) {
      if (todayAppointments.length > 0) {
        return `You have ${todayAppointments.length} appointments today. Your next patient is ${todayAppointments[0]?.patient?.name} at ${todayAppointments[0]?.timeSlot}.`
      }
      return "You don't have any appointments scheduled for today."
    }
    
    if (m.includes('patient') && m.includes('next')) {
      const next = todayAppointments[0]
      return next 
        ? `Your next patient is ${next.patient?.name} at ${next.timeSlot} for ${next.reason || 'consultation'}.`
        : "No upcoming patients at the moment."
    }
    
    if (m.includes('help') || m.includes('what can you')) {
      return "I can help you with:\n• Viewing today's appointments\n• Finding your next patient\n• Getting a daily summary\n• Answering medical queries\n\nJust ask!"
    }
    
    if (m.includes('thank')) {
      return "You're welcome, Doctor! Let me know if you need anything else. 😊"
    }
    
    return "I'm here to help! You can ask me about your appointments, schedule, or any medical queries."
  }

  if (user?.role !== 'doctor') return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[380px] sm:w-[420px] h-[550px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-fadeInUp">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-emerald-600 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Stethoscope size={22} />
              </div>
              <div>
                <p className="font-bold">Doctor AI Assistant</p>
                <p className="text-xs text-teal-100">Your intelligent clinic helper</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={fetchTodayAppointments} 
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Refresh appointments"
              >
                <RefreshCw size={18} className={loadingAppointments ? 'animate-spin' : ''} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Appointment Banner */}
          {todayAppointments.length > 0 && (
            <div className="bg-teal-50 px-4 py-2 border-b border-teal-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={14} className="text-teal-600" />
                <span className="font-semibold text-teal-800">{todayAppointments.length} appointments today</span>
              </div>
              <button 
                onClick={() => handleQuickAction('today')}
                className="text-xs text-teal-600 font-semibold hover:underline"
              >
                View all
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.from === 'bot' && (
                  <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center mr-2 mt-1 shrink-0">
                    <Bot size={16} className="text-teal-600" />
                  </div>
                )}
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${m.from === 'user' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-gray-100 text-gray-800 shadow-sm'}`}>
                  <p className="whitespace-pre-line">{m.text}</p>
                  <p className={`text-[10px] mt-1 ${m.from === 'user' ? 'text-teal-200' : 'text-gray-400'}`}>{m.time}</p>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="w-8 h-8 bg-teal-100 rounded-xl flex items-center justify-center mr-2 shrink-0">
                  <Bot size={16} className="text-teal-600" />
                </div>
                <div className="bg-white border border-gray-100 p-3 rounded-2xl flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {showQuickActions && messages.length <= 1 && (
            <div className="px-4 py-3 bg-white border-t border-gray-100">
              <p className="text-xs text-gray-500 font-semibold mb-2 uppercase tracking-wider">Quick Actions</p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => handleQuickAction('today')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors"
                >
                  <Calendar size={14} /> Today's Schedule
                </button>
                <button 
                  onClick={() => handleQuickAction('next')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  <User size={14} /> Next Patient
                </button>
                <button 
                  onClick={() => handleQuickAction('summary')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 transition-colors"
                >
                  <Activity size={14} /> Daily Summary
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask about appointments, patients..."
                className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 transition-all"
              />
              <button 
                onClick={() => send()} 
                disabled={!input.trim()}
                className="w-11 h-11 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-all"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-gradient-to-br from-teal-500 to-emerald-600'}`}
      >
        {isOpen ? <X size={24} /> : <Stethoscope size={24} />}
        {!isOpen && todayAppointments.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 border-2 border-white rounded-full text-[10px] font-bold flex items-center justify-center px-1">
            {todayAppointments.length}
          </span>
        )}
      </button>
    </div>
  )
}
