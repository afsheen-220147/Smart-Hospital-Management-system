import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import DoctorChatbot from '../components/DoctorChatbot'
import { Bell, Search, Menu, Activity } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

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
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Doctor Portal'

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
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl">
              <Activity size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">On Duty</span>
            </div>
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-all">
              <Bell size={17} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white text-sm font-bold">
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
