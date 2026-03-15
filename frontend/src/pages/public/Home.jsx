import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Heart, Brain, Bone, Baby, Eye, Stethoscope,
  Star, ArrowRight, CheckCircle, Shield, Clock, Smartphone,
  CalendarCheck, ClipboardList, UserCheck, ChevronRight, Phone, Mail, MapPin,
  UserRound, Loader2
} from 'lucide-react'
import api from '../../services/api'

const services = [
  { icon: Heart, title: 'Cardiology', desc: 'Heart conditions, ECG & cardiovascular care', color: 'bg-red-50 text-red-600' },
  { icon: Brain, title: 'Neurology', desc: 'Brain, spine & nervous system disorders', color: 'bg-purple-50 text-purple-600' },
  { icon: Bone, title: 'Orthopedics', desc: 'Bone, joint treatments & surgical care', color: 'bg-orange-50 text-orange-600' },
  { icon: Baby, title: 'Pediatrics', desc: 'Expert child healthcare from birth to teen', color: 'bg-pink-50 text-pink-600' },
  { icon: Eye, title: 'Ophthalmology', desc: 'Eye care, vision tests and surgery', color: 'bg-cyan-50 text-cyan-600' },
  { icon: Stethoscope, title: 'General Medicine', desc: 'Complete primary healthcare & checkups', color: 'bg-blue-50 text-blue-600' },
]

const howItWorks = [
  { step: '01', icon: UserCheck, title: 'Create Account', desc: 'Register as a patient in under 2 minutes. Free forever.' },
  { step: '02', icon: Stethoscope, title: 'Find Your Doctor', desc: 'Search & filter 500+ specialists by department and availability.' },
  { step: '03', icon: CalendarCheck, title: 'Book Appointment', desc: 'Select a date & time slot that works for you.' },
  { step: '04', icon: ClipboardList, title: 'Get Your Consultation', desc: 'Visit in-person or online. Records are saved digitally.' },
]

const stats = [
  { value: '500+', label: 'Expert Doctors' },
  { value: '50K+', label: 'Happy Patients' },
  { value: '30+', label: 'Departments' },
  { value: '24/7', label: 'Emergency Care' },
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

  useEffect(() => {
    api.get('/doctors')
      .then(res => setDoctors((res.data.data || []).slice(0, 4)))
      .catch(() => setDoctors([]))
      .finally(() => setDoctorsLoading(false))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-20 w-96 h-96 bg-blue-300 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-flex items-center gap-2 bg-white/20 text-sm font-medium px-4 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Hospital Open — 24/7 Emergency Available
            </span>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-5">
              Smart Healthcare<br />
              <span className="text-blue-200">At Your Fingertips</span>
            </h1>
            <p className="text-blue-100 text-lg leading-relaxed mb-8 max-w-md">
              Book appointments online, access your medical records instantly, and consult with 500+ expert doctors — all from home.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="flex items-center gap-2 px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg">
                <CalendarCheck size={18} />
                Book Appointment
              </Link>
              <Link to="/doctors" className="flex items-center gap-2 px-6 py-3 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition-all border border-white/30">
                View Doctors
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          {/* Hero Visual */}
          <div className="hidden md:block">
            <div className="relative bg-white/10 rounded-3xl p-8 border border-white/20 backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Appointments Today', value: '127', icon: CalendarCheck, color: 'text-blue-300' },
                  { label: 'Doctors Available', value: '48', icon: UserCheck, color: 'text-emerald-300' },
                  { label: 'Reports Processed', value: '354', icon: ClipboardList, color: 'text-yellow-300' },
                  { label: 'Patient Rating', value: '4.9★', icon: Star, color: 'text-pink-300' },
                ].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-2xl p-4 border border-white/10">
                    <s.icon size={20} className={s.color} />
                    <p className="text-2xl font-bold text-white mt-2">{s.value}</p>
                    <p className="text-xs text-blue-200 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-blue-600">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="max-w-7xl mx-auto px-6 py-16">
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
              <div className="flex items-center gap-1 mt-3 text-blue-600 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Learn more <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Top Doctors */}
      <section className="bg-gray-50 py-16">
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
            <p className="text-center text-gray-400 py-10">No doctors available at the moment.</p>
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
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Star size={13} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-bold text-gray-700">{(d.ratings || 4.5).toFixed(1)}</span>
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
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Simple Process</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2">How It Works</h2>
          <p className="text-gray-500 mt-2 text-sm">Get healthcare done in 4 easy steps</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative">
          {/* Connector line */}
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
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 py-16">
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
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">Patient Stories</span>
          <h2 className="text-3xl font-bold text-gray-900 mt-2">What Our Patients Say</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div key={t.name} className="bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={14} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs">
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
