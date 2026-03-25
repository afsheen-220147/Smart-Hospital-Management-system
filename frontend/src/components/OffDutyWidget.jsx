/**
 * Off-Duty Request Widget
 * Professional UI component for doctor dashboard showing off-duty status and management
 */

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, CheckCircle, AlertCircle, Plus, Loader } from 'lucide-react'
import api from '../services/api'
import { showError } from '../utils/toast'

export default function OffDutyWidget() {
  const [offDutyRequests, setOffDutyRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOffDutyStatus()
  }, [])

  const fetchOffDutyStatus = async () => {
    setLoading(true)
    try {
      // Get doctor's pending/approved off-duty requests
      const response = await api.get('/doctor/off-duty/my-requests')
      setOffDutyRequests(response.data.data || [])
      setError('')
    } catch (err) {
      console.error('Error fetching off-duty status:', err)
      // Silently fail - widget is optional
      setOffDutyRequests([])
    } finally {
      setLoading(false)
    }
  }

  // Get upcoming off-duty dates
  const upcomingOffDuty = offDutyRequests.filter(req => {
    const reqDate = new Date(req.date)
    return req.status === 'approved' && reqDate >= new Date()
  }).sort((a, b) => new Date(a.date) - new Date(b.date))

  // Get pending requests
  const pendingRequests = offDutyRequests.filter(req => req.status === 'pending')

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', icon: 'text-yellow-600' },
      approved: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-600' },
      rejected: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600' }
    }
    const config = statusConfig[status] || statusConfig.pending
    return config
  }

  return (
    <div className="card p-6 border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Off-Duty Management</h3>
            <p className="text-xs text-gray-500">Request and manage your time off</p>
          </div>
        </div>
        <Link
          to="/doctor/request-off-duty"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg text-sm font-semibold"
        >
          <Plus size={16} />
          New Request
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader className="w-5 h-5 text-orange-600 animate-spin" />
        </div>
      )}

      {/* Pending Requests */}
      {!loading && pendingRequests.length > 0 && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="font-semibold text-yellow-900">Pending Approval</p>
          </div>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <div key={req._id} className="text-sm text-yellow-800">
                <div className="flex justify-between">
                  <span>{new Date(req.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {req.session}</span>
                  <span className="text-xs bg-yellow-100 px-2 py-0.5 rounded text-yellow-700">Pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Approved Off-Duty Dates */}
      {!loading && upcomingOffDuty.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Upcoming Off-Duty
          </h4>
          <div className="space-y-2">
            {upcomingOffDuty.slice(0, 3).map(req => (
              <div key={req._id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(req.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Clock className="w-3 h-3" />
                        {req.session === 'morning' ? '6 AM - 12 PM' : '12 PM - 6 PM'}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs bg-green-100 px-2 py-1 rounded text-green-700 font-semibold">Approved</span>
                </div>
                {req.reason && (
                  <p className="text-xs text-gray-600 mt-2 ml-11">Reason: {req.reason}</p>
                )}
              </div>
            ))}
            {upcomingOffDuty.length > 3 && (
              <p className="text-xs text-gray-500 text-center py-2">
                +{upcomingOffDuty.length - 3} more off-duty dates
              </p>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && offDutyRequests.length === 0 && (
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-2">No Off-Duty Requests</p>
          <p className="text-gray-500 text-sm mb-4">You haven't requested any time off yet</p>
          <Link
            to="/doctor/request-off-duty"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg transition-colors text-sm font-semibold"
          >
            <Plus size={16} />
            Request Off-Duty
          </Link>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex gap-2 text-xs text-gray-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-blue-600 mt-0.5" />
          <p>
            When admin approves your off-duty request, all affected patients will be notified via email to reschedule their appointments.
          </p>
        </div>
      </div>
    </div>
  )
}
