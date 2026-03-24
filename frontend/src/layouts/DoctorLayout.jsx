import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import DoctorChatbot from '../components/DoctorChatbot'
import { Bell, Search, Menu, Activity, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const pageTitles = {
  '/doctor': 'Dashboard',
  '/doctor/appointments': 'Appointments',
  '/doctor/patients': 'My Patients',
  '/doctor/diagnosis': 'Add Diagnosis',
  '/doctor/schedule': 'My Schedule',
  '/doctor/profile': 'My Profile',
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
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between sticky top-0 z-40" style={{ height: '70px' }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
              onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h1>
              <p className="text-xs text-gray-400">Doctor Portal · NeoTherapy</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 w-56">
              <Search size={15} className="text-gray-400 flex-shrink-0" />
              <input className="bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 w-full focus:outline-none" placeholder="Search patients..." />
            </div>
            {/* NEW FEATURE: On Duty Toggle Button */}
            <button
              onClick={handleOnDutyToggle}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                isOnDuty
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700'
                  : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
              }`}
            >
              <Activity size={14} className={isOnDuty ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} />
              <span className={`text-xs font-semibold ${isOnDuty ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}`}>
                {isOnDuty ? 'On Duty' : 'Off Duty'}
              </span>
            </button>
            {/* NEW FEATURE: Notifications with Dropdown */}
            <div className="relative">
              <button 
                onClick={handleBellClick}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all">
                <Bell size={17} />
                {upcomingAppointments.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* NEW FEATURE: Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fadeIn">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white p-4 flex items-center justify-between">
                    <h3 className="font-bold text-sm">Upcoming Appointments</h3>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                    {loadingNotifications ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
                      </div>
                    ) : upcomingAppointments.length > 0 ? (
                      upcomingAppointments.map((apt, idx) => (
                        <div key={apt._id || idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm">
                              {apt.patient?.name?.charAt(0) || 'P'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                {apt.patient?.name || 'Unknown Patient'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                {apt.timeSlot || 'Time TBD'}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                {apt.visitType || 'Consultation'}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${
                              apt.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                              apt.status === 'pending' ? 'bg-blue-100 text-blue-700' : 
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {apt.status || 'Pending'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <p className="text-sm font-medium">No upcoming appointments</p>
                        <p className="text-xs mt-1">All clear! Schedule is empty.</p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  {upcomingAppointments.length > 0 && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                      <button 
                        onClick={() => {
                          try {
                            setShowNotifications(false)
                            navigate('/doctor/appointments')
                          } catch (err) {
                            console.error('Navigation error:', err)
                          }
                        }}
                        className="w-full text-center text-sm font-semibold text-teal-600 hover:text-teal-700 transition-colors"
                      >
                        View All Appointments →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* NEW FEATURE: Profile Button - Avatar with click handler */}
            <div 
              onClick={handleProfileClick}
              className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:bg-teal-700 hover:shadow-lg transition-all"
              title="Go to profile"
            >
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-scroll">
          <Outlet />
        </main>
      </div>

      {/* Doctor AI Assistant Chatbot */}
      <DoctorChatbot />
    </div>
  )
}
