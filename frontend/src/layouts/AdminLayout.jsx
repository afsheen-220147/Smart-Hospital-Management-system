import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { Bell, Search, Menu, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const pageTitles = {
  '/admin': 'Dashboard',
  '/admin/doctors': 'Manage Doctors',
  '/admin/patients': 'Manage Patients',
  '/admin/appointments': 'Appointments',
  '/admin/reports': 'Analytics',
  '/admin/settings': 'Settings',
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Admin Panel'

  // NEW FEATURE: Admin Navbar Notification Panel
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'system', message: 'New doctor registration pending', timestamp: new Date(Date.now() - 5 * 60000) },
    { id: 2, type: 'appointment', message: '5 appointments cancelled today', timestamp: new Date(Date.now() - 15 * 60000) },
    { id: 3, type: 'patient', message: '12 new patient registrations', timestamp: new Date(Date.now() - 1 * 3600000) },
    { id: 4, type: 'system', message: 'System backup completed', timestamp: new Date(Date.now() - 2 * 3600000) },
  ])

  // NEW FEATURE: Admin Navbar Navigation - Profile handler
  const handleProfileClick = () => {
    navigate('/admin/settings')
  }

  // NEW FEATURE: Admin Navbar Notification - Show/hide panel
  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications)
  }

  // NEW FEATURE: Navigate to notification settings
  const handleNotificationSettings = () => {
    setShowNotifications(false)
    navigate('/admin/settings')
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
              <p className="text-xs text-gray-400">Admin Control Panel · NeoTherapy</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 w-56">
              <Search size={15} className="text-gray-400 flex-shrink-0" />
              <input className="bg-transparent text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 w-full focus:outline-none" placeholder="Search..." />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded-xl">
              <ShieldCheck size={14} className="text-violet-600 dark:text-violet-400" />
              <span className="text-xs text-violet-700 dark:text-violet-300 font-semibold">Super Admin</span>
            </div>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all" onClick={handleNotificationClick}>
              <Bell size={17} />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </button>

            {/* NEW FEATURE: Admin Notification Dropdown Panel */}
            {showNotifications && (
              <div className="absolute right-6 top-[70px] w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fadeIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-violet-700 text-white p-4 flex items-center justify-between">
                  <h3 className="font-bold text-sm">Notifications</h3>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-1 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Content */}
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div key={notif.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            notif.type === 'system' ? 'bg-blue-500' :
                            notif.type === 'appointment' ? 'bg-yellow-500' :
                            notif.type === 'patient' ? 'bg-green-500' :
                            'bg-gray-500'
                          }`}></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-white font-medium">
                              {notif.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {notif.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <p className="text-sm font-medium">No notifications</p>
                      <p className="text-xs mt-1">You're all caught up!</p>
                    </div>
                  )}
                </div>

                {/* Footer */}
                {notifications.length > 0 && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700">
                    <button 
                      onClick={handleNotificationSettings}
                      className="w-full text-center text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
                    >
                      Notification Settings →
                    </button>
                  </div>
                )}
              </div>
            )}

            <div 
              onClick={handleProfileClick}
              className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:bg-violet-700 hover:shadow-lg transition-all"
              title="Go to settings"
            >
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
