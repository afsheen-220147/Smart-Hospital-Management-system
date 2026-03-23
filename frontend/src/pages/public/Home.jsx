import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart, Brain, Bone, Baby, Eye, Stethoscope,
  Star, ArrowRight, CheckCircle, Shield, Clock, Smartphone,
  CalendarCheck, ClipboardList, UserCheck, ChevronRight, MapPin,
  UserRound, Loader2, Hospital, ArrowDown, ArrowUp
} from 'lucide-react'
import api from '../../services/api'

const services = [
  { icon: Heart, title: 'Cardiology', desc: 'Heart conditions, ECG & cardiovascular care', color: 'bg-red-50 text-red-600', wiki: 'https://en.wikipedia.org/wiki/Cardiology' },
  { icon: Brain, title: 'Neurology', desc: 'Brain, spine & nervous system disorders', color: 'bg-purple-50 text-purple-600', wiki: 'https://en.wikipedia.org/wiki/Neurology' },
  { icon: Bone, title: 'Orthopedics', desc: 'Bone, joint treatments & surgical care', color: 'bg-orange-50 text-orange-600', wiki: 'https://en.wikipedia.org/wiki/Orthopedic_surgery' },
  { icon: Baby, title: 'Pediatrics', desc: 'Expert child healthcare from birth to teen', color: 'bg-pink-50 text-pink-600', wiki: 'https://en.wikipedia.org/wiki/Pediatrics' },
  { icon: Eye, title: 'Ophthalmology', desc: 'Eye care, vision tests and surgery', color: 'bg-cyan-50 text-cyan-600', wiki: 'https://en.wikipedia.org/wiki/Ophthalmology' },
  { icon: Stethoscope, title: 'General Medicine', desc: 'Complete primary healthcare & checkups', color: 'bg-blue-50 text-blue-600', wiki: 'https://en.wikipedia.org/wiki/Internal_medicine' },
]

const howItWorks = [
  { step: '01', icon: UserCheck, title: 'Create Account', desc: 'Register as a patient in under 2 minutes. Free forever.' },
  { step: '02', icon: Stethoscope, title: 'Find Your Doctor', desc: 'Search & filter 500+ specialists by department and availability.' },
  { step: '03', icon: CalendarCheck, title: 'Book Appointment', desc: 'Select a date & time slot that works for you.' },
  { step: '04', icon: ClipboardList, title: 'Get Your Consultation', desc: 'Visit in-person or online. Records are saved digitally.' },
]

const testimonials = [
  { name: 'Venkat R.', role: 'Patient', text: 'Booked my appointment in 2 minutes! The online system is brilliant and very easy to use.', rating: 5 },
  { name: 'Anitha K.', role: 'Patient', text: 'Dr. Priya was so thorough and caring. The digital records system saved so much paperwork.', rating: 5 },
  { name: 'Ramesh M.', role: 'Patient', text: 'Emergency care was top notch. The staff was quick to respond and very professional.', rating: 5 },
]

const features = [
  { icon: Smartphone, title: 'Online Booking', desc: 'Book appointments anytime in under 2 minutes.' },
  { icon: ClipboardList, title: 'Digital Records', desc: 'Prescriptions, reports — all digitally accessible.' },
  { icon: Shield, title: '100% Secure & Private', desc: 'Your health data is encrypted & HIPAA compliant.' },
  { icon: Clock, title: '24/7 Emergency Support', desc: 'Round-the-clock support for urgent care needs.' },
]

export default function Home() {
  const [doctors, setDoctors] = useState([])
  const [doctorsLoading, setDoctorsLoading] = useState(true)
  const [stats, setStats] = useState({
      doctors: 45,
      patients: 1250,
      departments: 12,
      appointments: 350
  })

  // Presentation Scroll Lock Navigation
  const [isAtTop, setIsAtTop] = useState(true);
  const [isScrollUnlocked, setIsScrollUnlocked] = useState(false);
  const isScrolling = useRef(false); // Guard: prevents multiple triggers during animation

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    // Only update state AFTER any in-flight programmatic scroll finishes
    const handleScroll = () => {
      if (isScrolling.current) return; // Ignore scroll events during our own animation
      const atTop = window.scrollY < 50;
      setIsAtTop(atTop);
      if (atTop) {
        setIsScrollUnlocked(false);
        document.body.style.overflow = 'hidden';
      } else {
        setIsScrollUnlocked(true);
        // overflow is already 'auto' at this point (set by handleScrollDown after delay)
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Global cleanup: FORCE UNLOCK scroll when navigating away (Navbar/Chatbot exceptions)
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.body.style.overflow = 'auto';
    };
  }, []);

  const handleScrollDown = () => {
    if (isScrolling.current) return; // Prevent double-click shake
    const target = document.getElementById('services'); // "Our Specialties" section
    if (!target) return;

    isScrolling.current = true;
    // Scroll first — overflow is still 'hidden' so no layout reflow
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Unlock overflow ONLY after scroll animation has had time to complete
    setTimeout(() => {
      document.body.style.overflow = 'auto';
      setIsScrollUnlocked(true);
      setIsAtTop(false);
      isScrolling.current = false;
    }, 600);
  };

  const handleScrollUp = () => {
    if (isScrolling.current) return;

    isScrolling.current = true;
    // Use scrollTo top:0 for a guaranteed pixel-perfect reset (no element offset ambiguity)
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-lock overflow ONLY after the scroll animation completes
    setTimeout(() => {
      document.body.style.overflow = 'hidden';
      setIsScrollUnlocked(false);
      setIsAtTop(true);
      isScrolling.current = false;
    }, 600);
  };

  useEffect(() => {
    // Fetch real doctors dynamic
    api.get('/doctors')
      .then(res => setDoctors((res.data.data || []).slice(0, 4)))
      .catch(() => setDoctors([]))
      .finally(() => setDoctorsLoading(false))

    // Fetch dynamic live metrics from MongoDB securely
    api.get('/public/stats')
      .then(res => {
          if (res.data?.success) {
              setStats({
                  doctors: res.data.data.doctors || 45,
                  patients: res.data.data.patients || 1250,
                  departments: res.data.data.departments || 12,
                  appointments: res.data.data.appointments || 350
              })
          }
      })
      .catch((err) => console.log('Stats DB fetch failed gently, applying sensible defaults.', err))
  }, [])

  const dynamicStatsDisplay = [
      { value: `${stats.doctors}+`, label: 'Expert Doctors' },
      { value: `${stats.patients}+`, label: 'Real Patients' },
      { value: `${stats.departments}+`, label: 'Active Departments' },
      { value: `${stats.appointments}+`, label: 'Total Appointments' },
  ]

  return (
    <div>
      {/* Hero */}
      <section id="hero" className="relative overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center" style={{ minHeight: 'calc(100vh - 70px)' }}>
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Main soft shapes */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[70%] bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-accent)] rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob" />
          <div className="absolute top-[20%] right-[-10%] w-[45%] h-[60%] bg-gradient-to-tr from-[#E6DCC3] to-[#F1E9D8] rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-gradient-to-t from-[var(--bg-secondary)] to-transparent rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-4000" />
          {/* Soft highlight overlay */}
          <div className="absolute inset-0 bg-white/30 backdrop-blur-[100px]" /> 
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-12 md:py-16 grid md:grid-cols-2 gap-12 items-center">
          <div>
            {/* Branding - Minimal Logo Style */}
            <div className="mb-8">
               <div className="inline-block relative">
                 <h2 className="text-xl font-light tracking-[0.2em] text-[var(--text-primary)] uppercase">MediCare<span className="font-semibold">+</span></h2>
                 <div className="absolute bottom-[-4px] left-0 w-full h-[1px] bg-gradient-to-r from-[var(--text-secondary)] to-transparent opacity-30" />
               </div>
            </div>
            
            <span className="inline-flex items-center gap-2 bg-[var(--glass)] border border-white/40 text-[var(--text-secondary)] text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-md shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Hospital Open — 24/7 Emergency Available
            </span>
            <h1 className="text-5xl md:text-[4rem] font-semibold leading-[1.1] mb-6 tracking-tight text-[var(--text-primary)] font-sans">
              Smart Healthcare<br />
              <span className="text-[var(--text-secondary)] font-normal">At Your Fingertips</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-lg leading-relaxed mb-8 max-w-md">
              Book appointments online, access your medical records instantly, and consult with {stats.doctors}+ expert doctors — all from home.
            </p>
            <div className="flex flex-wrap gap-5">
              <Link to="/register" className="flex items-center gap-2 px-7 py-3.5 bg-[var(--text-primary)] text-white font-medium rounded-2xl hover:bg-black transition-all shadow-[0_10px_30px_rgba(0,0,0,0.1)]">
                <CalendarCheck size={18} />
                Book Appointment
              </Link>
              <Link to="/doctors" className="flex items-center gap-2 px-7 py-3.5 bg-[var(--glass)] text-[var(--text-primary)] font-medium rounded-2xl hover:bg-white/60 transition-all border border-white/50 backdrop-blur-md shadow-sm">
                View Doctors
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Hero Visual Live Data Sync */}
          <div className="hidden md:block">
            <div className="relative bg-[var(--glass)] rounded-[2rem] p-8 border border-white/50 backdrop-blur-xl shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
              {/* Highlight layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent rounded-[2rem] pointer-events-none" />
              
              <div className="relative z-10 grid grid-cols-2 gap-5">
                {[
                  { label: 'Total Appointments', value: `${stats.appointments}`, icon: CalendarCheck, color: 'text-gray-700' },
                  { label: 'Doctors Available', value: `${stats.doctors}`, icon: UserCheck, color: 'text-gray-700' },
                  { label: 'Real Patients', value: `${stats.patients}`, icon: ClipboardList, color: 'text-gray-700' },
                  { label: 'Patient Rating', value: '4.9★', icon: Star, color: 'text-gray-700' },
                ].map(s => (
                  <div key={s.label} className="bg-white/50 rounded-2xl p-5 border border-white/60 backdrop-blur-md hover:-translate-y-1 transition-transform duration-300 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center mb-3 shadow-sm border border-white/50">
                      <s.icon size={20} className={s.color} />
                    </div>
                    <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{s.value}</p>
                    <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Down Control at Hero */}
        <div 
          onClick={handleScrollDown} 
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce cursor-pointer z-20 group transition-opacity duration-500 ${!isScrollUnlocked ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">Click here to see below</span>
          <div className="w-10 h-10 rounded-full bg-[var(--glass)] border border-[var(--border-soft)] flex items-center justify-center shadow-[var(--shadow-soft)] backdrop-blur-md transition-all group-hover:bg-white/60">
            <ArrowDown size={18} className="text-[var(--text-primary)]" />
          </div>
        </div>
      </section>

      {/* Scroll Up Control at Top Center */}
      <div 
        onClick={handleScrollUp}
        className={`fixed top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce cursor-pointer z-50 group transition-all duration-500 ${isScrollUnlocked ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}
      >
        <div className="w-10 h-10 rounded-full bg-[var(--glass)] border border-[var(--border-soft)] flex items-center justify-center shadow-[var(--shadow-soft)] backdrop-blur-md transition-all group-hover:bg-white/60">
          <ArrowUp size={18} className="text-[var(--text-primary)]" />
        </div>
        <span className="text-[10px] font-bold tracking-[0.2em] text-[var(--text-secondary)] uppercase">Click here to go up</span>
      </div>

      {/* Stats Bar (Dynamic!) */}
      <section id="stats" className="bg-white border-b border-[var(--border-soft)]">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {dynamicStatsDisplay.map(s => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-blue-600">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Our Specialties</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2">World-Class Medical Services</h2>
          <p className="text-gray-500 mt-2 max-w-lg mx-auto text-sm">Comprehensive healthcare across all major departments with world-class specialists.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {services.map(s => (
            <div key={s.title} className="bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${s.color}`}>
                <s.icon size={22} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">{s.title}</h3>
              <p className="text-gray-500 text-sm">{s.desc}</p>
              <a href={s.wiki} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 mt-3 text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:underline">
                Learn more <ChevronRight size={14} />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Top Doctors */}
      <section id="doctors" className="bg-[var(--bg-secondary)] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Our Experts</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">Meet Our Top Doctors</h2>
          </div>

          {doctorsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
          ) : doctors.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No doctors available directly in DB at the moment.</p>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
            {doctors.map(d => {
              const name = d.user?.name || 'Doctor'
              const isAvail = d.availabilityStatus === 'available'
              return (
              <div key={d._id} className="bg-white rounded-2xl p-5 border-2 border-blue-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-center group">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UserRound size={28} className="text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{name.startsWith('Dr.') ? name : `Dr. ${name}`}</h3>
                <p className="text-blue-600 text-xs font-medium mt-0.5">{d.specialization}</p>
                <p className="text-gray-400 text-xs mt-0.5">{d.experience} Yrs Experience</p>
                
                {/* Visual static rating lock to 4.9 requested by UI/UX spec */}
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Star size={13} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-gray-700">4.9</span>
                </div>

                <span className={`inline-flex items-center gap-1 mt-3 text-xs px-2.5 py-1 rounded-full font-medium ${isAvail ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-green-500' : 'bg-red-500'}`} />
                  {isAvail ? 'Available Today' : 'Busy'}
                </span>
                <Link to="/register" className="mt-4 block w-full py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all">
                  Book Appointment
                </Link>
              </div>
              )
            })}
          </div>
          )}
          <div className="text-center mt-8">
            <Link to="/doctors" className="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-all">
              View All Doctors <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="howItWorks" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Simple Process</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2">How It Works</h2>
          <p className="text-gray-500 mt-2 text-sm">Get healthcare done in 4 easy steps</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-0.5 bg-blue-100 z-0" />
          {howItWorks.map((s, i) => (
            <div key={s.step} className="relative text-center z-10">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
                <s.icon size={24} className="text-white" />
              </div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Step {s.step}</span>
              <h3 className="font-bold text-gray-900 mt-1 mb-2">{s.title}</h3>
              <p className="text-gray-500 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="features" className="bg-gradient-to-br from-[#1F1F1F] to-[#0A0A0A] py-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">Why MediCare+</span>
            <h2 className="text-3xl font-bold mt-2 mb-8">Modern Healthcare Built for You</h2>
            <div className="space-y-4">
              {features.map(f => (
                <div key={f.title} className="flex gap-4 p-4 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <f.icon size={20} className="text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{f.title}</h4>
                    <p className="text-blue-200 text-sm mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your Journey</h3>
            <p className="text-gray-500 text-sm mb-6">Create a free patient account and book your first appointment in minutes.</p>
            <div className="space-y-3 mb-6">
              {['No registration fee', 'Instant confirmation', 'Digital prescription', '24/7 support'].map(p => (
                <div key={p} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                  {p}
                </div>
              ))}
            </div>
            <Link to="/register" className="block w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-center hover:bg-blue-700 transition-all">
              Create Free Account
            </Link>
            <p className="text-center text-gray-400 text-sm mt-3">
              Already registered? <Link to="/login" className="text-blue-600 font-semibold">Sign In</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Patient Stories</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2">What Our Patients Say</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div key={t.name} className="bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 text-[13px] leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-[13px]">{t.name}</p>
                  <p className="text-[11px] text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
