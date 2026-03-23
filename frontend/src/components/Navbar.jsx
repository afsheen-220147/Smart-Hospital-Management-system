import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { HeartPulse, Menu, X, Bell, LogOut, ChevronDown } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => { logout(); navigate('/') }

  const navLinks = [['/', 'Home'], ['/doctors', 'Doctors'], ['/about', 'About']]

  // Returns Tailwind classes for active vs. inactive nav items
  const navClass = (to) =>
    `px-3 py-2 text-sm font-medium rounded-[10px] transition-all duration-200 ${
      pathname === to
        ? 'bg-[#EAE4DD] text-[#2B2B2B]'
        : 'text-gray-600 hover:bg-[#F0EBE5] hover:text-[#2B2B2B]'
    }`

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50" style={{ height: '70px' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <HeartPulse size={18} className="text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-gray-900">MediCare<span className="text-blue-600">+</span></span>
            <p className="text-[10px] text-gray-400 leading-none">Smart Hospital</p>
          </div>
        </Link>

        {/* Desktop Nav — public */}
        {!user && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(([to, label]) => (
              <Link key={to} to={to} className={navClass(to)}>
                {label}
              </Link>
            ))}
            <div className="h-5 w-px bg-gray-200 mx-2" />
            <Link to="/login" className="px-4 py-2 text-sm text-blue-600 font-semibold rounded-xl border-2 border-blue-200 hover:border-blue-600 transition-all">
              Login
            </Link>
            <Link to="/register" className="px-4 py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-sm transition-all ml-1">
              Register
            </Link>
          </nav>
        )}

        {/* Logged-in user controls */}
        {user && (
          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-all border border-gray-200">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-none">{user.name}</p>
                <p className="text-xs text-gray-400 capitalize mt-0.5">{user.role}</p>
              </div>
              <ChevronDown size={14} className="text-gray-400" />
            </div>
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 font-medium rounded-xl border border-red-100 hover:bg-red-50 transition-all">
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        {!user && (
          <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {menuOpen && !user && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-1 shadow-lg">
          {navLinks.map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)} className={`block ${navClass(to)}`}>
              {label}
            </Link>
          ))}
          <div className="pt-2 flex gap-2">
            <Link to="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 text-sm text-blue-600 font-semibold border-2 border-blue-200 rounded-xl">Login</Link>
            <Link to="/register" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 text-sm bg-blue-600 text-white font-semibold rounded-xl">Register</Link>
          </div>
        </div>
      )}
    </header>
  )
}
