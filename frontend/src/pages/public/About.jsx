import React from 'react'
import { Link } from 'react-router-dom'
import {
    HeartPulse, Award, Users, Building2, CheckCircle, ArrowRight,
    Phone, Mail, MapPin, Clock, Star, Stethoscope
} from 'lucide-react'

export default function About() {
    return (
        <div>
            {/* Hero */}
            <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-6">
                <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg border-2 border-white/30">
                <img src="/logo2.png" alt="NeoTherapy Logo" className="w-full h-full object-cover" />
              </div>
                    <span className="text-blue-200 text-xs font-bold uppercase tracking-widest">About Us</span>
                    <h1 className="text-4xl font-bold my-4">Next-Gen Healing, Available Today</h1>
                    <p className="text-blue-100 text-lg max-w-2xl mx-auto">
                        NeoTherapy has been a trusted name in healthcare for over 25 years, delivering world-class medical services with compassion, technology, and expertise.
                    </p>
                </div>
            </section>

            {/* Stats */}
            <section className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {[
                        { value: '25+', label: 'Years of Service', icon: Clock },
                        { value: '500+', label: 'Expert Doctors', icon: Stethoscope },
                        { value: '50K+', label: 'Patients Treated', icon: Users },
                        { value: '30+', label: 'Departments', icon: Building2 },
                    ].map(s => (
                        <div key={s.label} className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                <s.icon size={20} className="text-blue-600" />
                            </div>
                            <p className="text-3xl font-bold text-blue-600">{s.value}</p>
                            <p className="text-sm text-gray-500">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Mission & Vision */}
            <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10">
                <div className="bg-blue-50 rounded-2xl p-8 border-2 border-blue-200">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-5">
                        <HeartPulse size={22} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Mission</h2>
                    <p className="text-gray-600 leading-relaxed">
                        To provide accessible, affordable, and high-quality healthcare to every patient. We aim to combine modern technology with compassionate care to transform the healthcare experience.
                    </p>
                    <ul className="mt-5 space-y-2">
                        {['Patient-first approach', 'Cutting-edge medical technology', 'Compassionate & skilled staff', '24/7 emergency care'].map(m => (
                            <li key={m} className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckCircle size={15} className="text-blue-600 flex-shrink-0" />
                                {m}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-8 border-2 border-emerald-200">
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-5">
                        <Award size={22} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Our Vision</h2>
                    <p className="text-gray-600 leading-relaxed">
                        To be India's most trusted and innovative healthcare system — where every patient receives personalised care, powered by AI, delivered by expert professionals.
                    </p>
                    <ul className="mt-5 space-y-2">
                        {['AI-powered diagnostics', 'Fully digital health records', 'Zero paperwork experience', 'Nationwide accessible care'].map(m => (
                            <li key={m} className="flex items-center gap-2 text-sm text-gray-700">
                                <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                                {m}
                            </li>
                        ))}
                    </ul>
                </div>
            </section>

            {/* Facilities */}
            <section className="bg-gray-50 py-16">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-10">
                        <span className="text-blue-600 text-xs font-bold uppercase tracking-widest">World-Class</span>
                        <h2 className="text-3xl font-bold text-gray-900 mt-2">Our Facilities</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {[
                            { icon: Building2, title: '500-Bed Hospital', desc: 'Fully equipped multi-speciality hospital with ICU and NICU.', color: 'bg-blue-50 text-blue-600' },
                            { icon: HeartPulse, title: 'Advanced Operation Theatres', desc: '12 modular OTs with world-class surgical equipment.', color: 'bg-red-50 text-red-600' },
                            { icon: Star, title: 'Award-Winning ICU', desc: 'Level III ICU certified by NABH and NABL.', color: 'bg-yellow-50 text-yellow-600' },
                            { icon: Users, title: 'Specialist Outpatient', desc: '30+ specialist OPD departments open 6 days a week.', color: 'bg-teal-50 text-teal-600' },
                            { icon: Award, title: 'NABH Accredited', desc: 'Recognised by NABH for excellence in patient safety.', color: 'bg-purple-50 text-purple-600' },
                            { icon: Clock, title: '24/7 Pharmacy', desc: 'In-house pharmacy open round the clock with all medicines.', color: 'bg-green-50 text-green-600' },
                        ].map(f => (
                            <div key={f.title} className="bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
                                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                                    <f.icon size={20} />
                                </div>
                                <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
                                <p className="text-gray-500 text-sm">{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Info */}
            <section className="max-w-7xl mx-auto px-6 py-16">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900">Contact & Location</h2>
                </div>
                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        { icon: Phone, title: 'Call Us', value: '+91 40 4444 5555', sub: 'Emergency: 102', color: 'bg-blue-50 text-blue-600' },
                        { icon: Mail, title: 'Email', value: 'info@neotherapy.com', sub: '24hr response guaranteed', color: 'bg-teal-50 text-teal-600' },
                        { icon: MapPin, title: 'Location', value: 'Hyderabad, Telangana', sub: 'Near Kondapur Ring Road', color: 'bg-violet-50 text-violet-600' },
                    ].map(c => (
                        <div key={c.title} className="flex items-start gap-4 bg-white rounded-2xl p-6 border-2 border-blue-100 shadow-sm">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>
                                <c.icon size={22} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-semibold uppercase">{c.title}</p>
                                <p className="font-bold text-gray-900 mt-1">{c.value}</p>
                                <p className="text-gray-400 text-sm">{c.sub}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="text-center mt-10">
                    <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg transition-all">
                        Register Now — It's Free <ArrowRight size={18} />
                    </Link>
                </div>
            </section>
        </div>
    )
}
