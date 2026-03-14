import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { Bell, Search, Menu } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const pageTitles = {
  '/patient': 'Dashboard',
  '/patient/book': 'Book Appointment',
  '/patient/appointments': 'My Appointments',
  '/patient/history': 'Visit History',
  '/patient/records': 'Medical Records',
  '/patient/symptom-checker': 'AI Symptom Checker',
  '/patient/profile': 'My Profile',
}

export default function PatientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useAuth()
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Patient Portal'

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-40" style={{ height: '70px' }}>
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 border border-gray-200"
              onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{title}</h1>
              <p className="text-xs text-gray-400">Patient Portal · MediCare+</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-56">
              <Search size={15} className="text-gray-400 flex-shrink-0" />
              <input className="bg-transparent text-sm text-gray-700 placeholder-gray-400 w-full focus:outline-none" placeholder="Search..." />
            </div>
            {/* Notifications */}
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 transition-all">
              <Bell size={17} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-sm font-bold cursor-pointer">
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
