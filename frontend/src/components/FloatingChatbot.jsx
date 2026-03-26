import React, { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Bot, UserRound, MapPin, Navigation, Star, Building, Trash2, Stethoscope } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api' 

const HOSPITALS = [
  { id: 1, name: 'NeoTherapy Hospital Nuzvid', address: 'Nuzvid Bus Stand, Nuzvid, Eluru, Andhra Pradesh, India', lat: 16.7850, lng: 80.8488 },
  { id: 2, name: 'NeoTherapy Hospital Vijayawada', address: 'Vijayawada Bus Stand, Vijayawada, Andhra Pradesh, India', lat: 16.5151, lng: 80.6321 }
];

const DEFAULT_OPTIONS = [
  { id: 'about', label: '🏥 About Hospital' },
  { id: 'doctors', label: '👨‍⚕️ Doctors' },
  { id: 'branches', label: '🏢 Branches' },
  { id: 'locations', label: '📍 Hospital Locations' },
  { id: 'distance', label: '📏 Check Distance' }
];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return (R * c).toFixed(1);
}

const getBasicResponse = (msg) => {
    const m = msg.toLowerCase()
    if (m.includes('book') || m.includes('appointment')) return 'To book an appointment, go to Patient Dashboard → Book Appointment. Select your doctor, date, and slot!'
    if (m.includes('emergency') || m.includes('urgent')) return '⚠️ If this is a medical emergency, please call 102 or visit our emergency ward immediately!'
    if (m.includes('time') || m.includes('hours') || m.includes('timing')) return 'Hospital OPD hours: Mon–Fri 8 AM–8 PM, Sat 8 AM–2 PM. Emergency: 24/7.'
    if (m.includes('record') || m.includes('history')) return 'Your medical records can be accessed in Patient Dashboard → Medical Records. All records are secure and private.'
    if (m.includes('prescription') || m.includes('medicine')) return 'Your prescriptions are available in Visit History after each consultation. You can download them as PDF.'
    return"I'm NeoTherapy AI. I can help with booking appointments, finding doctors, hospital timings, and medical records. Please select an option above."
}

export default function FloatingChatbot() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const timeoutRef = useRef(null);
    const messagesEndRef = useRef(null);
    const [userLoc, setUserLoc] = useState(null)
    const [typing, setTyping] = useState(false)

    const [messages, setMessages] = useState([
        { 
            from: 'bot', 
            type: 'text',
            text:"Hello! I'm NeoTherapy AI. How can I help you today?", 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showOptions: true 
        }
    ])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior:"smooth" })
    }

    useEffect(() => {
        if (isOpen) scrollToBottom()
    }, [messages, typing, isOpen])

    // Hover Interaction Handlers
    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsOpen(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 300); // Butter smooth 300ms grace period matching macOS interactions
    };

    const pushUserMessage = (text) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setMessages(p => {
          const newMsgs = p.map(m => m.from === 'bot' ? { ...m, showOptions: false, showHospitalOptions: false } : m)
          return [...newMsgs, { from: 'user', type: 'text', text, time }]
        })
    }

    const clearChat = () => {
        setMessages([
          { 
              from: 'bot', 
              type: 'text',
              text:"Chat cleared. Hello! I'm NeoTherapy AI. How can I help you today?", 
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              showOptions: true 
          }
        ])
    }

    const handleOptionSelect = async (optionId, customLabel) => {
        pushUserMessage(customLabel || DEFAULT_OPTIONS.find(o => o.id === optionId)?.label || optionId)
        setTyping(true)
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        let botResponse = { from: 'bot', type: 'text', time, showOptions: true }

        try {
            if (optionId === 'about') {
                botResponse.type = 'aboutHospital'
            } 
            else if (optionId === 'doctors') {
                const res = await api.get('/doctors');
                botResponse.type = 'doctorsList'
                botResponse.doctors = (res.data?.data || []).slice(0, 3)
                botResponse.text ="Here are some of our top specialists available:"
            }
            else if (optionId === 'branches' || optionId === 'locations') {
                botResponse.type = 'locationsList'
                botResponse.locations = HOSPITALS
                botResponse.text ="We currently operate in these prominent locations:"
            }
            else if (optionId === 'distance') {
                botResponse.showOptions = false; 
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            setUserLoc({ lat, lng })
                            
                            const hospitalsWithDist = HOSPITALS.map(h => ({
                                ...h, 
                                distance: calculateDistance(lat, lng, h.lat, h.lng)
                            })).sort((a,b) => parseFloat(a.distance) - parseFloat(b.distance));

                            setTyping(false)
                            setMessages(p => [...p, {
                                from: 'bot',
                                type: 'text',
                                text:"I've carefully calculated the distances from your current location using High Accuracy. Please select a hospital for directions:",
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                showOptions: false,
                                showHospitalOptions: true,
                                hospitalOptions: hospitalsWithDist
                            }])
                        },
                        (error) => {
                            setTyping(false)
                            setMessages(p => [...p, {
                                from: 'bot',
                                type: 'text',
                                text:"Location permission denied or timed out. Please enable location services in your browser to check distances natively.",
                                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                showOptions: true
                            }])
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                    );
                    return; 
                } else {
                    botResponse.text ="Geolocation is not supported natively by your browser."
                }
            }
            else {
                botResponse.text = getBasicResponse(optionId)
            }
        } catch (err) {
            botResponse.text ="An internal error occurred while fetching information. Please try again later."
            console.error(err)
        }

        setTyping(false)
        setMessages(p => [...p, botResponse])
    }

    // Modern professional Maps redirection format ensuring valid waypoints and driving instructions
    const startJourney = (hLat, hLng, name) => {
        pushUserMessage(`Start Journey to ${name}`)
        if(!userLoc) return;
        
        const url = `https://www.google.com/maps/dir/?api=1&origin=${userLoc.lat},${userLoc.lng}&destination=${hLat},${hLng}&travelmode=driving`;
        window.open(url, '_blank', 'noopener,noreferrer');
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setMessages(p => {
          const newMsgs = p.map(m => m.from === 'bot' ? { ...m, showHospitalOptions: false } : m)
          return [...newMsgs, {
            from: 'bot',
            type: 'text',
            text:"Opening Google Maps for native routing directions! Safe travels! Can I assist you with anything else?",
            time,
            showOptions: true
          }]
        })
    }

    return (
        <div 
            className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            
            {/* The Chat Window: Rendered but styled conditionally for seamless macOS-like animation */}
            <div className={`mb-5 w-[360px] sm:w-[420px] max-h-[80vh] h-[550px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100/80 transition-all duration-300 ease-out origin-bottom-right 
                ${isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-6 pointer-events-none absolute bottom-16'}`}>
                
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-4 flex items-center justify-between text-white shrink-0 shadow-sm relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-inner border border-white/20">
                            <Bot size={22} className="text-white drop-shadow-md" />
                        </div>
                        <div>
                            <p className="font-bold text-sm leading-tight tracking-wide drop-shadow-sm">NeoTherapy AI Assistant</p>
                            <p className="text-[11px] text-blue-100 flex items-center gap-1.5 font-medium tracking-wide">
                                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.6)]"></span>
                                Online
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={clearChat} title="Clear Chat" className="hover:bg-white/20 p-2 rounded-lg transition-colors group">
                            <Trash2 size={16} className="text-blue-100 group-hover:text-white" />
                        </button>
                        <button onClick={() => setIsOpen(false)} title="Close Chat" className="hover:bg-white/20 p-2 rounded-lg transition-colors group">
                            <X size={20} className="text-blue-100 group-hover:text-white" />
                        </button>
                    </div>
                </div>

                {/* Chat Area - Scroll Isolated `overscroll-contain` */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50 relative custom-scrollbar overscroll-contain">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex flex-col ${m.from === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'} w-full group relative`}>
                                {m.from === 'bot' && (
                                    <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-3 mt-1.5 shrink-0 shadow-sm border border-blue-200">
                                        <Bot size={16} className="text-blue-700" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed relative
                                    ${m.from === 'user' 
                                        ? 'bg-blue-600 text-white shadow-md rounded-tr-sm font-medium tracking-wide' 
                                        : 'bg-white border text-slate-700 shadow-sm rounded-tl-sm font-normal border-slate-200 hover:shadow-md transition-shadow'}`}>
                                    
                                    {/* Basic Text Message */}
                                    {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                                    
                                    {/* About Hospital Template */}
                                    {m.type === 'aboutHospital' && (
                                        <div className="space-y-3 mt-1">
                                            <p className="font-bold text-[14px] text-blue-800 border-b border-blue-100 pb-1.5">NeoTherapy Smart Hospital</p>
                                            <p>NeoTherapy is a state-of-the-art multi-specialty hospital providing 24/7 world-class healthcare, digital records, and expert consultations.</p>
                                            <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-xl shadow-inner mt-2">
                                                <p className="text-[13px] flex items-center justify-between">
                                                    <span>Owner:</span>
                                                    <span className="text-blue-800 font-extrabold text-[14px] bg-blue-100 px-2 py-0.5 rounded-md border border-blue-200 shadow-sm uppercase tracking-wider">VASU</span>
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Dynamic Doctors List */}
                                    {m.type === 'doctorsList' && m.doctors && (
                                        <div className="mt-3 space-y-2.5">
                                            {m.doctors.length === 0 ? (
                                                <p className="text-xs text-slate-500 italic">No doctors found directly tied to the database presently.</p>
                                            ) : m.doctors.map((d, didx) => (
                                                <div key={didx} className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                                                    <div className="w-9 h-9 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center">
                                                        <UserRound size={16} className="text-blue-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[13px] font-bold text-slate-900 leading-tight">
                                                            {d.user?.name ? (d.user.name.startsWith('Dr.') ? d.user.name : `Dr. ${d.user.name}`) : 'Doctor'}
                                                        </p>
                                                        <p className="text-[11px] text-blue-600 font-semibold tracking-wide mt-0.5">{d.specialization}</p>
                                                    </div>
                                                    <div className="bg-white px-2 py-1 rounded-lg flex items-center gap-1 border border-yellow-200 shadow-sm">
                                                        <Star size={12} className="text-yellow-500 fill-yellow-500 relative -top-[0.5px]" />
                                                        <span className="text-[11px] font-extrabold text-slate-800">4.9</span>
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => navigate('/doctors')}
                                                className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 text-[12px] font-bold rounded-xl border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm active:scale-[0.98]"
                                            >
                                                <Stethoscope size={14} /> View All Doctors
                                            </button>
                                        </div>
                                    )}

                                    {/* Hardcoded Locations List */}
                                    {m.type === 'locationsList' && m.locations && (
                                        <div className="mt-3 space-y-2.5">
                                            {m.locations.map((loc, lidx) => (
                                                <div key={lidx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-300 transition-colors">
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="bg-blue-100 p-1.5 rounded-lg shrink-0">
                                                            <Building size={14} className="text-blue-700" />
                                                        </div>
                                                        <div>
                                                            <p className="text-[13px] font-bold text-slate-900">{loc.name}</p>
                                                            <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{loc.address}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <p className={`text-[10px] mt-2 font-medium tracking-wide ${m.from === 'user' ? 'text-blue-200' : 'text-slate-400 absolute bottom-1 right-2.5'}`}>
                                        {m.from === 'bot' && <span className="opacity-0">padding-buffer</span> /* push container out slightly */}
                                        {m.time}
                                    </p>
                                </div>
                            </div>

                            {/* Continuous flow options */}
                            {m.showOptions && (
                                <div className="pl-11 mt-3 flex flex-wrap gap-2 w-full pr-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                    {DEFAULT_OPTIONS.map(opt => (
                                        <button 
                                            key={opt.id}
                                            onClick={() => handleOptionSelect(opt.id, opt.label)}
                                            className="bg-white border-[1.5px] border-slate-200 text-slate-700 text-[12px] font-semibold px-3.5 py-2 rounded-full hover:bg-slate-800 hover:border-slate-800 hover:text-white transition-all shadow-sm flex items-center justify-center active:scale-95 cursor-pointer"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Distance options with Start Journey button */}
                            {m.showHospitalOptions && m.hospitalOptions && (
                                <div className="pl-11 mt-3 flex flex-col gap-2.5 w-full pr-4 animate-in slide-in-from-top-2 fade-in duration-300">
                                    {m.hospitalOptions.map(h => (
                                        <div key={h.id} className="bg-white border-2 border-slate-200 rounded-xl p-3.5 shadow-sm hover:border-blue-300 hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="pr-2">
                                                    <p className="text-[13px] font-bold text-slate-900 mb-0.5 leading-tight">{h.name}</p>
                                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{h.address}</p>
                                                </div>
                                                <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap shadow-sm">
                                                    {h.distance} km
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => startJourney(h.lat, h.lng, h.name)}
                                                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 text-white text-[12px] font-bold rounded-lg hover:bg-slate-900 active:bg-black transition-colors shadow-md hover:shadow-lg focus:ring-2 focus:ring-slate-500 focus:outline-none"
                                            >
                                                <Navigation size={14} className="animate-pulse" />
                                                Start Journey
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {typing && (
                        <div className="flex justify-start">
                            <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center mr-3 shrink-0 shadow-sm border border-blue-200">
                                <Bot size={16} className="text-blue-700" />
                            </div>
                            <div className="bg-white border border-slate-200 py-3.5 px-4 rounded-2xl flex items-center gap-1.5 shadow-sm rounded-tl-sm h-[42px]">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-4" /> {/* Enhanced scroll buffer */}
                </div>
                {/* Notice the entire input block has been seamlessly removed per the requirements */}
            </div>

            {/* Premium Interactive Hover Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'bg-slate-300 scale-95 shadow-sm opacity-50' : 'bg-slate-900 hover:scale-110 active:scale-95 ring-4 ring-slate-400/20 shadow-slate-500/40'}`}
            >
                <Bot size={28} className="drop-shadow-sm" />
                {!isOpen && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 border-[2.5px] border-white rounded-full shadow-sm" />
                )}
            </button>
        </div>
    )
}
