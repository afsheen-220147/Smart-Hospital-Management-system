import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Star, UserRound, ArrowRight, Video, Loader2 } from 'lucide-react'
import api from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'

export default function Doctors() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [allDoctors, setAllDoctors] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [spec, setSpec] = useState('All')
    const [sortBy, setSortBy] = useState('rating')

    const handleBook = (doctorId, type = 'in-person') => {
        const bookUrl = `/patient/book?doctorId=${doctorId}&type=${type}`
        if (user?.role === 'patient') {
            navigate(bookUrl)
        } else {
            navigate(`/login?redirect=${encodeURIComponent(bookUrl)}`)
        }
    }

    useEffect(() => {
        api.get('/doctors')
            .then(res => setAllDoctors(res.data.data || []))
            .catch(() => setAllDoctors([]))
            .finally(() => setLoading(false))
    }, [])

    const specs = ['All', ...new Set(allDoctors.map(d => d.specialization).filter(Boolean))]

    const filtered = allDoctors
        .filter(d => {
            const name = d.user?.name || ''
            return name.toLowerCase().includes(search.toLowerCase()) || (d.specialization || '').toLowerCase().includes(search.toLowerCase())
        })
        .filter(d => spec === 'All' || d.specialization === spec)
        .sort((a, b) => sortBy === 'rating' ? (b.ratings || 0) - (a.ratings || 0) : (b.experience || 0) - (a.experience || 0))

    return (
        <div className="animate-fadeIn">
            {/* Hero */}
            <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-14 px-6">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Find Your Doctor</h1>
                    <p className="text-blue-200 mb-8">500+ specialist doctors, ready to help you</p>
                    <div className="max-w-xl mx-auto">
                        <div className="relative">
                            <Search size={20} className="text-gray-400 absolute left-4 top-3.5" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Search doctor name or specialization..."
                                className="w-full pl-12 pr-4 py-3 rounded-2xl text-gray-900 text-sm focus:outline-none focus:ring-4 focus:ring-blue-300 shadow-lg" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="max-w-7xl mx-auto px-6 py-10">
                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 size={40} className="animate-spin text-blue-500" />
                    </div>
                ) : (
                    <>
                        {/* Filters */}
                        <div className="flex flex-col md:flex-row gap-4 mb-8">
                            <div className="flex flex-wrap gap-2">
                                {specs.map(s => (
                                    <button key={s} onClick={() => setSpec(s)}
                                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${spec === s ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 md:ml-auto">
                                <span className="text-sm text-gray-500">Sort by:</span>
                                <select className="form-input py-2 w-auto text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                                    <option value="rating">Rating</option>
                                    <option value="experience">Experience</option>
                                </select>
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 mb-5">{filtered.length} doctors found</p>

                        {/* Doctor Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {filtered.map(d => {
                                const name = d.user?.name || 'Doctor'
                                const displayName = name.startsWith('Dr.') ? name : `Dr. ${name}`
                                const isAvail = d.availabilityStatus === 'available'
                                return (
                                    <div key={d._id} className="bg-white rounded-2xl border-2 border-blue-100 shadow-sm hover:shadow-md hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 text-center">
                                            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue-600 mx-auto shadow-sm">
                                                <UserRound size={32} />
                                            </div>
                                            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${isAvail ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-green-500' : 'bg-red-500'}`} />
                                                {isAvail ? 'Available Today' : 'Busy'}
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-gray-900 text-sm">{displayName}</h3>
                                            <p className="text-blue-600 text-xs font-medium">{d.specialization}</p>
                                            <p className="text-gray-400 text-xs mt-0.5">{d.qualification || '—'}</p>
                                            <div className="flex items-center justify-between mt-3">
                                                <div className="flex items-center gap-1 text-sm">
                                                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                                    <span className="font-bold text-gray-800">{(d.ratings || 4.5).toFixed(1)}</span>
                                                </div>
                                                <span className="text-xs text-gray-400">{d.experience} Yrs</span>
                                            </div>
                                            <div className="flex items-center justify-between mt-1 mb-3">
                                                <span className="text-xs text-gray-400 flex items-center gap-1"><UserRound size={12} />{d.totalPatients || 0} patients</span>
                                                <span className="text-sm font-bold text-blue-600">₹{d.fees}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-4">
                                                <button
                                                    onClick={() => handleBook(d._id, 'in-person')}
                                                    className="text-center py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-1">
                                                    Book <ArrowRight size={12} />
                                                </button>
                                                <button
                                                    onClick={() => handleBook(d._id, 'online')}
                                                    className="text-center py-2 text-blue-600 text-xs font-semibold rounded-xl border border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-1">
                                                    <Video size={12} /> Online
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {filtered.length === 0 && !loading && (
                            <div className="text-center py-16">
                                <Search size={48} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500">No doctors found matching your search.</p>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}
