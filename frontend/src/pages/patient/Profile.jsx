import React, { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Activity, Save, Key, UserCircle, Edit3, HeartPulse, CheckCircle, Calendar } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { showSuccess, showError, getErrorMessage } from '../../utils/toast'

export default function Profile() {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    dob: '',
    bloodGroup: '',
    weight: '',
    height: '',
    address: '',
    emergencyContact: ''
  })

  useEffect(() => {
    const fetchProfile = async () => {
      // Demo Data for John Doe
      if (user?.email === 'john@example.com') {
        setProfile({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+91 98765 43210',
          dob: '1995-08-15',
          bloodGroup: 'B+',
          weight: '72',
          height: '175',
          address: '123 Main St, Hyderabad, TG 500081',
          emergencyContact: '+91 99887 76655'
        })
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const res = await api.get('/patients/me')
        const data = res.data.data
        setProfile({
          name: data.user?.name || user?.name || '',
          email: data.user?.email || user?.email || '',
          phone: data.phone || '',
          dob: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
          bloodGroup: data.bloodGroup || '',
          weight: data.weight || '',
          height: data.height || '',
          address: data.address || '',
          emergencyContact: data.emergencyContact || ''
        })
      } catch (err) {
        showError('Failed to load profile data.')
      } finally {
        setLoading(false)
      }
    }

    if (user) fetchProfile()
  }, [user])

  const handleSave = async () => {
    if (user?.email === 'john@example.com') {
      alert('Demo profiles cannot be modified.')
      setEditing(false)
      return
    }

    try {
      setSaving(true)
      await api.post('/patients', {
        phone: profile.phone,
        address: profile.address,
        dateOfBirth: profile.dob,
        weight: profile.weight,
        height: profile.height,
        bloodGroup: profile.bloodGroup,
        emergencyContact: profile.emergencyContact
      })
      setEditing(false)
      showSuccess('Profile updated successfully!')
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to update profile'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title flex items-center gap-2"><UserCircle size={26} className="text-blue-600" /> Personal Profile</h1>
          <p className="section-subtitle">Manage your personal and medical information</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button className="btn-secondary px-6" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
            <button className="btn-primary flex items-center gap-2 px-6 shadow-md" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        ) : (
          <button className="btn-secondary flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => setEditing(true)}>
            <Edit3 size={16} /> Edit Profile
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Avatar Card */}
        <div className="card flex flex-col items-center justify-center p-8 text-center border-t-4 border-t-blue-600 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-5xl font-bold shadow-lg mb-4 relative z-10 border-4 border-white">
            {profile.name?.charAt(0) || 'P'}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 z-10">{profile.name}</h2>
          <p className="text-sm text-blue-600 font-semibold mt-1 mb-4 z-10 flex items-center justify-center gap-1.5"><HeartPulse size={14} /> {user?.role}</p>
          <span className="px-3 py-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold rounded-full flex items-center gap-1 shadow-sm">
            <CheckCircle size={14} /> Profile Verified
          </span>
        </div>

        {/* Info Card */}
        <div className="md:col-span-2 card p-6 shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6 flex items-center gap-2"><User size={18} className="text-blue-600" /> General Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className={`form-group ${editing ? 'animate-fadeIn' : ''}`}>
              <label className="form-label text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
              {editing ? (
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input type="text" className="form-input pl-10 pt-2 pb-2 bg-gray-50 focus:bg-white" value={profile.name} disabled={true} />
                </div>
              ) : (
                <p className="font-semibold text-gray-900 text-base mt-1 flex items-center gap-2"><User size={16} className="text-gray-400" /> {profile.name}</p>
              )}
            </div>

            <div className={`form-group ${editing ? 'animate-fadeIn' : ''}`}>
              <label className="form-label text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
              {editing ? (
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input type="email" className="form-input pl-10 pt-2 pb-2 bg-gray-50 focus:bg-white" value={profile.email} disabled={true} />
                </div>
              ) : (
                <p className="font-semibold text-gray-900 text-base mt-1 flex items-center gap-2"><Mail size={16} className="text-gray-400" /> {profile.email}</p>
              )}
            </div>

            <div className={`form-group ${editing ? 'animate-fadeIn' : ''}`}>
              <label className="form-label text-xs font-bold uppercase tracking-wider text-gray-500">Phone Number</label>
              {editing ? (
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input type="tel" className="form-input pl-10 pt-2 pb-2 bg-gray-50 focus:bg-white" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
                </div>
              ) : (
                <p className="font-semibold text-gray-900 text-base mt-1 flex items-center gap-2"><Phone size={16} className="text-gray-400" /> {profile.phone || 'Not provided'}</p>
              )}
            </div>

            <div className={`form-group ${editing ? 'animate-fadeIn' : ''}`}>
              <label className="form-label text-xs font-bold uppercase tracking-wider text-gray-500">Date of Birth</label>
              {editing ? (
                <input type="date" className="form-input py-2 bg-gray-50 focus:bg-white" value={profile.dob} onChange={e => setProfile({ ...profile, dob: e.target.value })} />
              ) : (
                <p className="font-semibold text-gray-900 text-base mt-1 flex items-center gap-2"><Calendar size={16} className="text-gray-400" /> {profile.dob ? new Date(profile.dob).toLocaleDateString('en-GB') : 'Not provided'}</p>
              )}
            </div>

            <div className={`form-group sm:col-span-2 ${editing ? 'animate-fadeIn' : ''}`}>
              <label className="form-label text-xs font-bold uppercase tracking-wider text-gray-500">Residential Address</label>
              {editing ? (
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <textarea rows={2} className="form-input pl-10 py-2 bg-gray-50 focus:bg-white resize-none" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} />
                </div>
              ) : (
                <p className="font-semibold text-gray-900 text-base mt-1 flex items-start gap-2"><MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0" /> {profile.address || 'Not provided'}</p>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4 mb-6 mt-8 flex items-center gap-2"><Activity size={18} className="text-red-500" /> Health Vitals</h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Blood Group */}
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 relative group overflow-hidden">
              <HeartPulse size={48} className="absolute -right-4 -bottom-4 text-red-100/50 group-hover:scale-110 transition-transform" />
              <label className="text-xs font-bold uppercase text-red-600 block mb-1">Blood</label>
              {editing ? (
                <select className="w-full bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block p-2" value={profile.bloodGroup} onChange={e => setProfile({ ...profile, bloodGroup: e.target.value })}>
                  <option value="">Select</option>
                  <option>A+</option><option>B+</option><option>O+</option><option>AB+</option><option>A-</option><option>B-</option><option>O-</option><option>AB-</option>
                </select>
              ) : (
                <p className="text-2xl font-extrabold text-red-700">{profile.bloodGroup || '??'}</p>
              )}
            </div>

            {/* Weight */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 relative group overflow-hidden">
              <Activity size={48} className="absolute -right-4 -bottom-4 text-blue-100/50 group-hover:scale-110 transition-transform" />
              <label className="text-xs font-bold uppercase text-blue-600 block mb-1 flex items-center gap-1">Weight <span className="text-[10px] font-normal lowercase opacity-70">(kg)</span></label>
              {editing ? (
                <input type="number" className="w-full bg-white dark:bg-gray-700 border border-blue-200 dark:border-blue-700 text-blue-900 dark:text-blue-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2" value={profile.weight} onChange={e => setProfile({ ...profile, weight: e.target.value })} />
              ) : (
                <p className="text-2xl font-extrabold text-blue-700">{profile.weight || '--'} <span className="text-sm font-semibold opacity-70">kg</span></p>
              )}
            </div>

            {/* Height */}
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 relative group overflow-hidden">
              <Activity size={48} className="absolute -right-4 -bottom-4 text-emerald-100/50 group-hover:scale-110 transition-transform" />
              <label className="text-xs font-bold uppercase text-emerald-600 block mb-1 flex items-center gap-1">Height <span className="text-[10px] font-normal lowercase opacity-70">(cm)</span></label>
              {editing ? (
                <input type="number" className="w-full bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2" value={profile.height} onChange={e => setProfile({ ...profile, height: e.target.value })} />
              ) : (
                <p className="text-2xl font-extrabold text-emerald-700">{profile.height || '--'} <span className="text-sm font-semibold opacity-70">cm</span></p>
              )}
            </div>

            {/* Emergency */}
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 relative group overflow-hidden sm:col-span-1 col-span-2">
              <Phone size={48} className="absolute -right-4 -bottom-4 text-orange-100/50 group-hover:scale-110 transition-transform" />
              <label className="text-xs font-bold uppercase text-orange-600 block mb-1 leading-tight">Emergency</label>
              {editing ? (
                <input type="tel" className="w-full bg-white dark:bg-gray-700 border border-orange-200 dark:border-orange-700 text-orange-900 dark:text-orange-200 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2" value={profile.emergencyContact} onChange={e => setProfile({ ...profile, emergencyContact: e.target.value })} />
              ) : (
                <p className="text-lg font-extrabold text-orange-700 tracking-tight truncate px-1">{profile.emergencyContact || 'None'}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


