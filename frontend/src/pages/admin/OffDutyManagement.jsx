import React, { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Calendar, User, Mail, Loader, AlertCircle, Clock, FileText } from 'lucide-react'
import api from '../../services/api'
import { showSuccess, showError } from '../../utils/toast'

export default function OffDutyManagement() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('pending')
  const [actionLoading, setActionLoading] = useState(null)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/admin/off-duty/requests?status=${filter}`)
      setRequests(response.data.data || [])
    } catch (error) {
      console.error('Off-duty error:', error)
      showError('Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (requestId) => {
    setActionLoading(requestId)
    try {
      await api.post(`/admin/off-duty/requests/${requestId}/approve`, {
        adminRemarks: 'Approved by admin'
      })
      showSuccess('Request approved successfully. Patients will be notified.')
      setShowDetails(false)
      fetchRequests()
    } catch (error) {
      console.error('Approve error:', error)
      showError(error.response?.data?.message || 'Failed to approve request')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (requestId) => {
    setActionLoading(requestId)
    try {
      await api.post(`/admin/off-duty/requests/${requestId}/reject`, {
        rejectionReason: 'Request does not meet approval criteria'
      })
      showSuccess('Request rejected. Doctor has been notified.')
      setShowDetails(false)
      fetchRequests()
    } catch (error) {
      console.error('Reject error:', error)
      showError(error.response?.data?.message || 'Failed to reject request')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: 'text-yellow-600' },
      approved: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: 'text-green-600' },
      rejected: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', icon: 'text-red-600' }
    }
    return colors[status] || colors.pending
  }

  const getFilterStats = () => {
    const allRequests = requests
    return {
      pending: allRequests.filter(r => r.status === 'pending').length,
      approved: allRequests.filter(r => r.status === 'approved').length,
      rejected: allRequests.filter(r => r.status === 'rejected').length,
    }
  }

  const stats = getFilterStats()

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Off-Duty Requests</h1>
              <p className="text-orange-100 text-sm">Manage doctor time-off requests</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 border border-white/20 rounded-lg px-4 py-2">
              <p className="text-xs text-orange-100 mb-1">Total Requests</p>
              <p className="text-2xl font-bold text-white">{requests.length + stats.pending + stats.approved + stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 flex-wrap">
        {['pending', 'approved', 'rejected'].map(status => {
          const count = filter === status ? requests.length : 0
          const statusColors = getStatusColor(status)
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all transform ${
                filter === status
                  ? `${statusColors.badge} border-2 ${statusColors.border} shadow-lg`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
              }`}
            >
              <span className="text-lg capitalize">{status === 'pending' ? '⏳' : status === 'approved' ? '✓' : '✗'}</span>
              {status.charAt(0).toUpperCase() + status.slice(1)}
              {count > 0 && <span className="ml-2 px-2.5 py-0.5 bg-white/40 rounded-full text-sm font-bold">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Main Content */}
      <div className="space-y-4">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader className="w-10 h-10 text-orange-600 animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Loading off-duty requests...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && requests.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No {filter} requests</h3>
            <p className="text-gray-600 mb-6">There are no {filter} off-duty requests at the moment</p>
            <button
              onClick={() => {
                if (filter !== 'pending') setFilter('pending')
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors font-semibold"
            >
              <Clock size={16} />
              View All Requests
            </button>
          </div>
        )}

        {/* Requests List */}
        {!loading && requests.length > 0 && (
          <div className="grid gap-4">
            {requests.map((request) => {
              const statusColors = getStatusColor(request.status)
              return (
                <div
                  key={request._id}
                  onClick={() => {
                    setSelectedRequest(request)
                    setShowDetails(true)
                  }}
                  className={`${statusColors.bg} border-2 ${statusColors.border} rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all transform hover:scale-[1.01]`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center text-sm font-bold">
                        {(request.doctorName || request.doctor?.user?.name || 'Dr')?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">Dr. {request.doctorName || request.doctor?.user?.name}</h4>
                        <p className="text-xs text-gray-600">{request.doctor?.user?.email}</p>
                      </div>
                    </div>
                    <span className={`${statusColors.badge} px-3 py-1.5 rounded-lg text-xs font-bold capitalize`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 bg-white/40 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Calendar className={`w-4 h-4 ${statusColors.icon}`} />
                      <div>
                        <p className="text-xs text-gray-600">Date</p>
                        <p className="font-semibold text-gray-900">{new Date(request.date).toLocaleDateString('en-IN')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${statusColors.icon}`} />
                      <div>
                        <p className="text-xs text-gray-600">Session</p>
                        <p className="font-semibold text-gray-900 capitalize">{request.session}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className={`w-4 h-4 ${statusColors.icon}`} />
                      <div>
                        <p className="text-xs text-gray-600">Submitted</p>
                        <p className="font-semibold text-gray-900">
                          {request.requestedAt ? new Date(request.requestedAt).toLocaleDateString('en-IN') : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {request.reason && (
                    <div className="bg-white/40 rounded-lg p-3 mb-4 border-l-4 border-current">
                      <p className="text-xs text-gray-600 font-semibold mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{request.reason}</p>
                    </div>
                  )}

                  {filter === 'pending' && (
                    <div className="flex gap-3 pt-4 border-t border-gray-200/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApprove(request._id)
                        }}
                        disabled={actionLoading === request._id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                      >
                        {actionLoading === request._id ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleReject(request._id)
                        }}
                        disabled={actionLoading === request._id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                      >
                        {actionLoading === request._id ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <XCircle size={16} />
                        )}
                        Reject
                      </button>
                    </div>
                  )}

                  {filter === 'approved' && (
                    <div className="flex items-center gap-2 text-green-700 font-semibold text-sm pt-2">
                      <CheckCircle size={16} />
                      Approved on {request.approvedAt ? new Date(request.approvedAt).toLocaleDateString() : 'N/A'}
                    </div>
                  )}

                  {filter === 'rejected' && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                        <XCircle size={16} />
                        Rejected on {request.rejectedAt ? new Date(request.rejectedAt).toLocaleDateString() : 'N/A'}
                      </div>
                      {request.adminRemarks && (
                        <p className="text-sm text-red-700 bg-red-100/50 px-3 py-2 rounded">Reason: {request.adminRemarks}</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 flex gap-4">
        <Mail className="text-blue-600 flex-shrink-0 w-5 h-5 mt-0.5" />
        <div>
          <h4 className="font-semibold text-blue-900 mb-1">Automatic Notifications</h4>
          <p className="text-sm text-blue-800 leading-relaxed">
            When you approve a request, all patients with appointments during the off-duty period will automatically receive an email notification asking them to reschedule. Rejected requests will also notify the doctor via email.
          </p>
        </div>
      </div>
    </div>
  )
}
