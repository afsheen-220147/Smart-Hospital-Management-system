import React, { useState } from 'react'
import { MessageSquare, X, Bot, Send, Calendar, Clock, ShieldCheck, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const RESPONSES = {
    book: 'To book an appointment, go to Patient Dashboard → Book Appointment. Select your doctor, date, and slot!',
    doctors: 'We have 500+ specialist doctors. You can view all doctors on the Doctors page and filter by specialization!',
    availability: 'Doctors are generally available Monday–Saturday, 9 AM to 5 PM. Emergency care is 24/7.',
    timing: 'Hospital OPD hours: Mon–Fri 8 AM–8 PM, Sat 8 AM–2 PM. Emergency: 24/7.',
    appointment: 'To book an appointment, please log in and visit the Book Appointment section. It only takes 2 minutes!',
    emergency: '⚠️ If this is a medical emergency, please call 102 or visit our emergency ward immediately!',
    records: 'Your medical records can be accessed in Patient Dashboard → Medical Records. All records are secure and private.',
    prescription: 'Your prescriptions are available in Visit History after each consultation. You can download them as PDF.',
    default: "I'm MediCare AI. I can help with booking appointments, finding doctors, hospital timings, and medical records. What would you like to know?",
}

const getResponse = (msg) => {
    const m = msg.toLowerCase()
    if (m.includes('book') || m.includes('appointment')) return RESPONSES.book
    if (m.includes('emergency') || m.includes('urgent')) return RESPONSES.emergency
    if (m.includes('doctor') || m.includes('specialist')) return RESPONSES.doctors
    if (m.includes('available') || m.includes('free')) return RESPONSES.availability
    if (m.includes('time') || m.includes('hours') || m.includes('timing')) return RESPONSES.timing
    if (m.includes('record') || m.includes('history')) return RESPONSES.records
    if (m.includes('prescription') || m.includes('medicine')) return RESPONSES.prescription
    return RESPONSES.default
}

export default function FloatingChatbot() {
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([
        { from: 'bot', text: "Hello! I'm MediCare AI. How can I help you today?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ])
    const [input, setInput] = useState('')
    const [typing, setTyping] = useState(false)

    const send = (text) => {
        const msg = text || input.trim()
        if (!msg) return
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setMessages(p => [...p, { from: 'user', text: msg, time }])
        setInput('')
        setTyping(true)
        setTimeout(() => {
            setTyping(false)
            setMessages(p => [...p, { from: 'bot', text: getResponse(msg), time }])
        }, 1000)
    }

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100 animate-fadeInUp">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                <Bot size={20} />
                            </div>
                            <p className="font-bold">MediCare AI Assistant</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {m.from === 'bot' && (
                                    <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center mr-2 mt-1 shrink-0">
                                        <Bot size={14} className="text-blue-600" />
                                    </div>
                                )}
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.from === 'user' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-gray-100 text-gray-800 shadow-sm'}`}>
                                    <p>{m.text}</p>
                                    <p className={`text-[10px] mt-1 ${m.from === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>{m.time}</p>
                                </div>
                            </div>
                        ))}
                        {typing && (
                            <div className="flex justify-start">
                                <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center mr-2 shrink-0">
                                    <Bot size={14} className="text-blue-600" />
                                </div>
                                <div className="bg-white border border-gray-100 p-3 rounded-2xl flex items-center gap-1 shadow-sm">
                                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                    <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && send()}
                                placeholder="Ask me something..."
                                className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                            <button onClick={() => send()} className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition-all">
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse" />
                )}
            </button>
        </div>
    )
}
