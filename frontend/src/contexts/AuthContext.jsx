import React, { createContext, useContext, useEffect, useState } from 'react'
import * as authService from '../services/auth'

const AuthContext = createContext(null)

// Helper to check if JWT token is expired
const isTokenExpired = (token) => {
  if (!token) return true
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    // Check if token expires in less than 5 minutes
    return payload.exp * 1000 < Date.now() + 5 * 60 * 1000
  } catch {
    return true
  }
}

// Helper to validate stored user data
const getValidUser = () => {
  try {
    const stored = localStorage.getItem('sh_user')
    if (!stored) return null
    
    const userData = JSON.parse(stored)
    if (!userData || !userData.token) {
      localStorage.removeItem('sh_user')
      return null
    }
    
    // Check if token is expired
    if (isTokenExpired(userData.token)) {
      localStorage.removeItem('sh_user')
      return null
    }
    
    return userData
  } catch {
    localStorage.removeItem('sh_user')
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Validate user on mount and periodically
  useEffect(() => {
    const validateUser = async () => {
      const storedUser = getValidUser()
      
      if (!storedUser) {
        setUser(null)
        setLoading(false)
        return
      }

      // Optionally verify with server (uncomment for strict validation)
      // try {
      //   await authService.getMe()
      //   setUser(storedUser)
      // } catch {
      //   localStorage.removeItem('sh_user')
      //   setUser(null)
      // }
      
      setUser(storedUser)
      setLoading(false)
    }

    validateUser()

    // Check token validity every minute
    const interval = setInterval(() => {
      const validUser = getValidUser()
      if (!validUser && user) {
        setUser(null)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const login = async (creds) => {
    const res = await authService.login(creds)
    setUser(res.data)
    return res
  }

  const googleLogin = async ({ idToken, role }) => {
    const res = await authService.googleLogin({ idToken, role })
    setUser(res.data)
    return res
  }

  // Auto-login: directly set user data (used after registration)
  const loginWithData = (userData) => {
    if (userData && userData.token) {
      localStorage.setItem('sh_user', JSON.stringify(userData))
    }
    setUser(userData)
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    localStorage.removeItem('sh_user')
    localStorage.removeItem('adminId')
  }

  // Show loading spinner while validating
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, login, googleLogin, loginWithData, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
