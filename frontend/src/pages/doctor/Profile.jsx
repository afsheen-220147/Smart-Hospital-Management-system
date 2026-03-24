import React, { useState, useEffect, useRef } from 'react'
import { 
  User, Mail, Phone, Building, Award, Calendar, FileText, 
  Camera, Save, Edit3, Clock, Star, Briefcase, MapPin, 
  CheckCircle, Shield, Stethoscope, GraduationCap, X
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api, { uploadFile } from '../../services/api'
import { showSuccess, showError } from '../../utils/toast'

export default function DoctorProfile() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [profile, setProfile] = useState(null)
  const [formData, setFormData] = useState({
    specialization: '',
    experience: '',
    fees: '',
    about: '',
    phone: '',
    qualification: '',
    licenseNumber: '',
    department: '',
    clinicAddress: '',
    availabilityStatus: 'available'
  })

  const isDemoDoctor = user?.email === 'sneha@medicare.com' || user?.email === 'suresh@medicare.com'

  useEffect(() => {
    fetchProfile()
  }, [user])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      
      if (isDemoDoctor) {
        // Demo doctor profile
        const demoProfile = {
          _id: 'demo-doctor',
          user: { name: user?.name, email: user?.email },
          specialization: 'General Physician',
          experience: 12,
          fees: 500,
          about: 'Experienced general physician with over a decade of practice in internal medicine. Specializing in preventive care and chronic disease management.',
          image: null,
          phone: '+91 98765 43210',
          qualification: 'MBBS, MD (Internal Medicine)',
          licenseNumber: 'MCI-123456',
          department: 'Internal Medicine',
          clinicAddress: 'NeoTherapy Hospital, Hyderabad',
          availabilityStatus: 'available',
          ratings: 4.8,
          totalPatients: 1250
        }
        setProfile(demoProfile)
        setFormData({
          specialization: demoProfile.specialization,
          experience: demoProfile.experience,
          fees: demoProfile.fees,
          about: demoProfile.about,
          phone: demoProfile.phone || '',
          qualification: demoProfile.qualification || '',
          licenseNumber: demoProfile.licenseNumber || '',
          department: demoProfile.department || '',
          clinicAddress: demoProfile.clinicAddress || '',
          availabilityStatus: demoProfile.availabilityStatus || 'available'
        })
      } else {
        const res = await api.get('/doctors/me')
        const doctorData = res.data.data
        setProfile(doctorData)
        setFormData({
          specialization: doctorData.specialization || '',
          experience: doctorData.experience || '',
          fees: doctorData.fees || '',
          about: doctorData.about || '',
          phone: doctorData.phone || '',
          qualification: doctorData.qualification || '',
          licenseNumber: doctorData.licenseNumber || '',
          department: doctorData.department || '',
          clinicAddress: doctorData.clinicAddress || '',
          availabilityStatus: doctorData.availabilityStatus || 'available'
        })
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      showError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError('Please upload an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showError('Image size should be less than 5MB')
      return
    }

    try {
      setUploading(true)
      
      if (isDemoDoctor) {
        // Demo - just show preview
        const reader = new FileReader()
        reader.onloadend = () => {
          setProfile(prev => ({ ...prev, image: reader.result }))
        }
        reader.readAsDataURL(file)
        showSuccess('Profile photo updated!')
      } else {
        // Real upload to Cloudinary
        const uploadRes = await uploadFile(file, 'profile')
        const imageUrl = uploadRes.url

        // Update doctor profile with new image
        await api.put(`/doctors/${profile._id}`, { image: imageUrl })
        setProfile(prev => ({ ...prev, image: imageUrl }))
        showSuccess('Profile photo uploaded successfully!')
      }
    } catch (err) {
      console.error('Image upload error:', err)
      showError('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      if (isDemoDoctor) {
        // Demo - just simulate save
        await new Promise(resolve => setTimeout(resolve, 1000))
        setProfile(prev => ({ ...prev, ...formData }))
        showSuccess('Profile updated successfully!')
        setIsEditing(false)
      } else {
        await api.put(`/doctors/${profile._id}`, formData)
        setProfile(prev => ({ ...prev, ...formData }))
        showSuccess('Profile updated successfully!')
        setIsEditing(false)
      }
    } catch (err) {
      console.error('Save error:', err)
      showError('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'available': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'busy': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'on-leave': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">My Profile</h1>
          <p className="section-subtitle">Manage your professional information</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="btn-primary flex items-center gap-2 bg-teal-600 hover:bg-teal-700"
          >
            <Edit3 size={18} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(false)}
              className="btn-secondary flex items-center gap-2"
            >
              <X size={18} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 bg-teal-600 hover:bg-teal-700"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Save size={18} /> Save Changes</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="card shadow-lg border border-gray-100 overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNC0yIDQtMiA0LTItMi0yLTR6bS0xMiAwYzAtMiAyLTQgMi00czIgMiAyIDQtMiA0LTIgNC0yLTItMi00em0tMTIgMGMwLTIgMi00IDItNHMyIDIgMiA0LTIgNC0yIDQtMi0yLTItNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>
        </div>

        {/* Profile Info */}
        <div className="px-6 pb-6 relative">
          {/* Avatar */}
          <div className="relative -mt-16 mb-4">
            <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-teal-500 to-emerald-600 relative group">
              {profile?.image && profile.image.startsWith('http') ? (
                <img src={profile.image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                  {profile?.user?.name?.charAt(0)?.toUpperCase() || 'D'}
                </div>
              )}
              
              {/* Upload overlay */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
              >
                {uploading ? (
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera size={24} className="text-white" />
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            
            {/* Availability Badge */}
            <span className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold border ${getAvailabilityColor(formData.availabilityStatus)}`}>
              {formData.availabilityStatus === 'available' ? '● Available' : 
               formData.availabilityStatus === 'busy' ? '● Busy' : '● On Leave'}
            </span>
          </div>

          {/* Name & Basic Info */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{profile?.user?.name}</h2>
            <p className="text-teal-600 font-semibold">{profile?.specialization}</p>
            
            <div className="flex flex-wrap gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <Mail size={14} /> {profile?.user?.email}
              </span>
              {profile?.phone && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <Phone size={14} /> {profile.phone}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <Star size={18} className="text-yellow-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{profile?.ratings || 4.5}</p>
                  <p className="text-xs text-gray-500">Rating</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <User size={18} className="text-teal-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{profile?.totalPatients || 0}</p>
                  <p className="text-xs text-gray-500">Patients</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Briefcase size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{profile?.experience || 0}+</p>
                  <p className="text-xs text-gray-500">Years Exp.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Form */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Professional Information */}
        <div className="card shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-4">
            <Stethoscope size={18} className="text-teal-600" /> Professional Information
          </h3>
          
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label text-xs font-bold uppercase text-gray-500">Specialization</label>
              {isEditing ? (
                <input
                  type="text"
                  name="specialization"
                  value={formData.specialization}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., Cardiologist"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">{profile?.specialization || '-'}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-bold uppercase text-gray-500">Department</label>
              {isEditing ? (
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., Cardiology"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">{profile?.department || '-'}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-bold uppercase text-gray-500">Years of Experience</label>
              {isEditing ? (
                <input
                  type="number"
                  name="experience"
                  value={formData.experience}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., 10"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">{profile?.experience || 0} years</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-bold uppercase text-gray-500">Consultation Fee (₹)</label>
              {isEditing ? (
                <input
                  type="number"
                  name="fees"
                  value={formData.fees}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., 500"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">₹{profile?.fees || 0}</p>
              )}
            </div>
          </div>
        </div>

        {/* Credentials */}
        <div className="card shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-4">
            <GraduationCap size={18} className="text-teal-600" /> Credentials & Contact
          </h3>
          
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label text-xs font-bold uppercase text-gray-500">Qualification</label>
              {isEditing ? (
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., MBBS, MD"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">{profile?.qualification || '-'}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-bold uppercase text-gray-500">License Number</label>
              {isEditing ? (
                <input
                  type="text"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., MCI-123456"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2 flex items-center gap-2">
                  {profile?.licenseNumber || '-'}
                  {profile?.licenseNumber && <Shield size={14} className="text-emerald-500" />}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-bold uppercase text-gray-500">Phone Number</label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., +91 98765 43210"
                />
              ) : (
                <p className="text-gray-900 font-medium py-2">{profile?.phone || '-'}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label text-xs font-bold uppercase text-gray-500">Availability Status</label>
              {isEditing ? (
                <select
                  name="availabilityStatus"
                  value={formData.availabilityStatus}
                  onChange={handleInputChange}
                  className="form-input"
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="on-leave">On Leave</option>
                </select>
              ) : (
                <p className={`font-medium py-2 px-3 rounded-lg inline-block ${getAvailabilityColor(profile?.availabilityStatus || 'available')}`}>
                  {profile?.availabilityStatus === 'available' ? '● Available' : 
                   profile?.availabilityStatus === 'busy' ? '● Busy' : '● On Leave'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Clinic Address */}
        <div className="card shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-4">
            <MapPin size={18} className="text-teal-600" /> Clinic Address
          </h3>
          
          {isEditing ? (
            <textarea
              name="clinicAddress"
              value={formData.clinicAddress}
              onChange={handleInputChange}
              rows={3}
              className="form-input resize-none"
              placeholder="Enter your clinic address..."
            />
          ) : (
            <p className="text-gray-900 font-medium">{profile?.clinicAddress || 'Not specified'}</p>
          )}
        </div>

        {/* About / Bio */}
        <div className="card shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-4">
            <FileText size={18} className="text-teal-600" /> About Me
          </h3>
          
          {isEditing ? (
            <textarea
              name="about"
              value={formData.about}
              onChange={handleInputChange}
              rows={4}
              className="form-input resize-none"
              placeholder="Tell patients about yourself, your approach to care, and specialties..."
              maxLength={500}
            />
          ) : (
            <p className="text-gray-700 leading-relaxed">{profile?.about || 'No bio added yet.'}</p>
          )}
          {isEditing && (
            <p className="text-xs text-gray-400 mt-2">{formData.about?.length || 0}/500 characters</p>
          )}
        </div>
      </div>
    </div>
  )
}
