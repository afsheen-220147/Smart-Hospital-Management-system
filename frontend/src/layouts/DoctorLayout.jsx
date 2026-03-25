import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import DoctorChatbot from '../components/DoctorChatbot'
import { Bell, Search, Menu, Activity, X, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const pageTitles = {
  '/doctor': 'Dashboard',
  '/doctor/appointments': 'Appointments',
  '/doctor/patients': 'My Patients',
  '/doctor/diagnosis': 'Add Diagnosis',
  '/doctor/schedule': 'My Schedule',
  '/doctor/profile': 'My Profile',
  '/doctor/off-duty': 'Request Leave',
}

export default function DoctorLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Doctor Portal'

  // NEW FEATURE: On Duty/Off Duty Toggle
  const [isOnDuty, setIsOnDuty] = useState(true)

  // NEW FEATURE: Notifications for upcoming appointments
  const [showNotifications, setShowNotifications] = useState(false)
  const [upcomingAppointments, setUpcomingAppointments] = useState([])
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  // NEW FEATURE: Fetch upcoming appointments for notifications
  const handleBellClick = async () => {
    if (showNotifications) {
      setShowNotifications(false)
      return
    }
    
    setShowNotifications(true)
    setLoadingNotifications(true)
    
    try {
      // First get doctor profile to get the correct doctor ID
      const profRes = await api.get('/doctors/me')
      const docProfile = profRes.data.data
      const docId = docProfile?._id
      
      if (docId) {
        const res = await api.get(`/appointments/doctor/${docId}`)
        const allAppts = res.data.data || res.data || []
        // Ensure allAppts is an array
        const apptsArray = Array.isArray(allAppts) ? allAppts : []
        // Filter for upcoming appointments
        const upcoming = apptsArray.filter(apt => {
          const aptStatus = (apt.status || '').toLowerCase()
          return aptStatus === 'pending' || aptStatus === 'confirmed'
        }).slice(0, 5) // Show only top 5 upcoming
        setUpcomingAppointments(upcoming)
      } else {
        setUpcomingAppointments([])
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
      setUpcomingAppointments([])
    } finally {
      setLoadingNotifications(false)
    }
  }

  // NEW FEATURE: Handle profile button click
  const handleProfileClick = () => {
    navigate('/doctor/profile')
  }

  // NEW FEATURE: Handle on duty toggle
  const handleOnDutyToggle = () => {
    setIsOnDuty(!isOnDuty)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* FIXED SIDEBAR */}
      <div className="hidden lg:block w-64 fixed left-0 top-0 h-screen border-r border-gray-200 bg-white">
        <Sidebar mobileOpen={false} onClose={null} />
      </div>

      {/* MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
          <div className="absolute left-0 top-0 w-64 h-full bg-white border-r border-gray-200">
            <Sidebar mobileOpen={true} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* PROFESSIONAL HEADER */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-6 py-4 flex items-center justify-between">
            {/* LEFT: Doctor Info */}
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={20} className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-500">NeoTherapy Doctor Portal</p>
              </div>
            </div>

            {/* RIGHT: Search & Actions */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 w-64">
                <Search size={16} className="text-gray-400 flex-shrink-0" />
                <input 
                  type="text"
                  placeholder="Search patients..." 
                  className="bg-transparent text-sm text-gray-700 placeholder-gray-400 w-full focus:outline-none"
                />
              </div>

              {/* On Duty Toggle */}
              <button
                onClick={handleOnDutyToggle}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isOnDuty
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <Activity size={16} />
                <span className="text-sm font-semibold">{isOnDuty ? 'On Duty' : 'Off Duty'}</span>
              </button>

              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={handleBellClick}
                  className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <Bell size={18} className="text-gray-600" />
                  {upcomingAppointments.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50">
                    <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Upcoming Appointments</h3>
                      <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-gray-200 rounded">
                        <X size={16} className="text-gray-600" />
                      </button>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {loadingNotifications ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : upcomingAppointments.length > 0 ? (
                        upcomingAppointments.map((apt) => (
                          <div key={apt._id} className="p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                {apt.patient?.name?.charAt(0) || 'P'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">{apt.patient?.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{apt.timeSlot}</p>
                              </div>
                              <span className={`px-2 py-1 rounded text-[11px] font-semibold whitespace-nowrap ${
                                apt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                apt.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                              }`}>
                                {apt.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <p className="text-sm">No upcoming appointments</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Avatar */}
              <button
                onClick={handleProfileClick}
                className="w-10 h-10 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                {user?.name?.charAt(0)?.toUpperCase()}
              </button>
            </div>
          </div>
        </header>

        {/* SCROLLABLE CONTENT */}
        <main className="flex-1 h-0 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Doctor AI Assistant */}
      <DoctorChatbot />
    </div>
  )
}
