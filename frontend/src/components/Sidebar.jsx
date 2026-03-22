import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Calendar, CalendarCheck, ClipboardList, FolderOpen,
  Bot, User, Users, Stethoscope, FileText, BarChart3, Settings,
  LogOut, X, ChevronRight, Clock, UserCog, HeartPulse
} from 'lucide-react'

const patientLinks = [
  { to: '/patient', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/patient/book', label: 'Book Appointment', icon: Calendar },
  { to: '/patient/appointments', label: 'My Appointments', icon: CalendarCheck },
  { to: '/patient/history', label: 'Visit History', icon: ClipboardList },
  { to: '/patient/records', label: 'Medical Records', icon: FolderOpen },
  { to: '/patient/symptom-checker', label: 'AI Symptom Checker', icon: Bot },
  { to: '/patient/profile', label: 'My Profile', icon: User },
]

const doctorLinks = [
  { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/doctor/appointments', label: 'Appointments', icon: CalendarCheck },
  { to: '/doctor/patients', label: 'My Patients', icon: Users },
  { to: '/doctor/diagnosis', label: 'Add Diagnosis', icon: Stethoscope },
  { to: '/doctor/schedule', label: 'My Schedule', icon: Clock },
  { to: '/doctor/profile', label: 'My Profile', icon: User },
]

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/doctors', label: 'Manage Doctors', icon: UserCog },
  { to: '/admin/patients', label: 'Manage Patients', icon: Users },
  { to: '/admin/appointments', label: 'Appointments', icon: CalendarCheck },
  { to: '/admin/reports', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const roleConfig = {
  patient: { links: patientLinks, label: 'Patient Portal', accent: 'text-blue-600', activeBg: 'bg-blue-50', headerBg: 'border-b border-gray-100' },
  doctor: { links: doctorLinks, label: 'Doctor Portal', accent: 'text-teal-600', activeBg: 'bg-teal-50', headerBg: 'border-b border-gray-100' },
  admin: { links: adminLinks, label: 'Admin Panel', accent: 'text-violet-600', activeBg: 'bg-violet-50', headerBg: 'border-b border-gray-100' },
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role || 'patient'
  const config = roleConfig[role] || roleConfig.patient

  const handleLogout = () => { logout(); navigate('/') }

  const accentColors = {
    patient: { icon: 'text-blue-600', active: 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-300', hover: 'hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white', dot: 'bg-blue-600' },
    doctor:  { icon: 'text-teal-600', active: 'bg-teal-50 text-teal-700 font-semibold dark:bg-teal-900/30 dark:text-teal-300',  hover: 'hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white', dot: 'bg-teal-600' },
    admin:   { icon: 'text-violet-600', active: 'bg-violet-50 text-violet-700 font-semibold dark:bg-violet-900/30 dark:text-violet-300', hover: 'hover:bg-gray-50 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white', dot: 'bg-violet-600' },
  }
  const ac = accentColors[role]

  const sidebarContent = (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700" style={{ width: '260px' }}>

      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${role === 'admin' ? 'bg-violet-600' : role === 'doctor' ? 'bg-teal-600' : 'bg-blue-600'}`}>
            <HeartPulse size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">MediCare+</p>
            <p className="text-[10px] text-gray-400 leading-none">{config.label}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">
            <X size={18} />
          </button>
        )}
      </div>

      {/* User Card */}
      {user && (
        <div className="mx-4 mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${role === 'admin' ? 'bg-violet-600' : role === 'doctor' ? 'bg-teal-600' : 'bg-blue-600'}`}>
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user.name}</p>
              <div className="flex items-center gap-1">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${ac.dot}`} />
                <p className="text-xs text-gray-400 capitalize">{role}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 mt-4 space-y-0.5 overflow-y-scroll overflow-x-hidden">
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-3 mb-2">Navigation</p>
        {config.links.map(link => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${isActive
                  ? ac.active
                  : `text-gray-600 dark:text-gray-400 ${ac.hover}`
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? ac.icon.replace('text-', 'text-') : 'text-gray-400'} />
                  <span>{link.label}</span>
                  {isActive && <ChevronRight size={14} className={`ml-auto ${ac.icon}`} />}
                </>
              )}
            </NavLink>
          )
        })}

        {/* AI Tools section - hidden for doctors who have in-dashboard AI features */}
        {role !== 'doctor' && (
          <>
            <div className="my-3 border-t border-gray-100 dark:border-gray-700" />
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider px-3 mb-2">AI Tools</p>
            <NavLink to="/ai/report-summary" onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive ? ac.active : `text-gray-600 dark:text-gray-400 ${ac.hover}`}`}>
              {({ isActive }) => (<><FileText size={17} className={isActive ? ac.icon : 'text-gray-400'} /><span>AI Report Summary</span></>)}
            </NavLink>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 font-medium rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block flex-shrink-0 sticky top-0 h-screen" style={{ width: '260px' }}>
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={onClose} />
          <div className="relative z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
