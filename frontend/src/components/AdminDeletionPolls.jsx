import React, { useState, useEffect } from 'react'
import { AlertCircle, Check, X, Clock, User, Users, RefreshCw, Loader2 } from 'lucide-react'
import api from '../services/api'
import { showSuccess, showError, getErrorMessage } from '../utils/toast'

export default function AdminDeletionPolls() {
  const [pendingActions, setPendingActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [votingOn, setVotingOn] = useState(null)
  const [approvalReason, setApprovalReason] = useState('')

  const fetchPendingActions = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/actions', {
        params: { status: 'pending' }
      })
      
      // Filter only deletion-related actions
      const deletionActions = res.data.data.filter(a => 
        a.actionType.includes('delete') && a.actionType !== 'doctor_update'
      ) || []
      
      setPendingActions(deletionActions)
    } catch (err) {
      console.error('Failed to fetch deletion requests:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingActions()
    const interval = setInterval(fetchPendingActions, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const handleApprove = async (actionId) => {
    setVotingOn(actionId)
    try {
      const res = await api.post(`/admin/actions/${actionId}/approve`)
      
      if (res.data.data.status === 'executed') {
        showSuccess('✅ Deletion approved and executed! Notification sent to user.')
      } else {
        showSuccess(`✅ Approved! ${res.data.data.approvalsRemaining} more approval(s) needed.`)
      }
      
      fetchPendingActions()
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to approve'))
    } finally {
      setVotingOn(null)
    }
  }

  const handleReject = async (actionId) => {
    setVotingOn(actionId)
    try {
      await api.post(`/admin/actions/${actionId}/reject`, {
        reason: approvalReason || 'Deletion not approved'
      })
      
      showSuccess('❌ Deletion request rejected.')
      setApprovalReason('')
      fetchPendingActions()
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to reject'))
    } finally {
      setVotingOn(null)
    }
  }

  if (loading) {
    return (
      <div className="card p-8 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-gray-600">Loading deletion requests...</span>
      </div>
    )
  }

  if (pendingActions.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-50 mb-3">
          <Check className="w-7 h-7 text-green-600" />
        </div>
        <p className="text-gray-600 font-medium">No deletion requests pending</p>
        <p className="text-sm text-gray-400 mt-1">All deletion requests are resolved</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          Deletion Requests Pending Approval
          <span className="ml-2 px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">{pendingActions.length}</span>
        </h2>
        <button
          onClick={fetchPendingActions}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Deletion Requests List */}
      <div className="space-y-3">
        {pendingActions.map(action => {
          const approvalPercent = (action.approvals / action.approvalsNeeded) * 100
          const userData = action.payload?.userId || action.payload?.patientId || action.payload?.doctorId
          const isUserDeletion = action.actionType === 'user_delete'
          
          return (
            <div key={action.actionId} className="card border border-red-100 bg-gradient-to-r from-red-50/50 to-white p-4 hover:shadow-md transition-shadow">
              {/* Header Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {isUserDeletion ? <User className="w-4 h-4 text-red-600" /> : <Users className="w-4 h-4 text-red-600" />}
                    <h3 className="font-bold text-gray-900 text-sm">{action.description}</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Initiated by: <span className="font-medium text-gray-700">{action.initiator.name}</span> • {new Date(action.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg">PENDING</span>
              </div>

              {/* Approval Progress */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">Admin Approvals</span>
                  <span className="text-xs font-bold text-gray-900">
                    {action.approvals}/{action.approvalsNeeded}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      action.approvals === 3
                        ? 'bg-green-500'
                        : action.approvals === 2
                        ? 'bg-amber-500'
                        : 'bg-orange-500'
                    }`}
                    style={{ width: `${approvalPercent}%` }}
                  />
                </div>
                
                {/* Approved By List */}
                {action.approvedBy && action.approvedBy.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <span className="font-medium">✓ Approved by:</span> {action.approvedBy.join(', ')}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(action.actionId)}
                  disabled={votingOn === action.actionId}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all"
                >
                  {votingOn === action.actionId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Approve Deletion
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleReject(action.actionId)}
                  disabled={votingOn === action.actionId}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-300 hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 text-sm font-semibold rounded-lg transition-all"
                >
                  {votingOn === action.actionId ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Reject
                    </>
                  )}
                </button>
              </div>

              {/* Status Badge */}
              {action.approvals >= 3 && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-xs text-green-700 font-medium">
                  <Check className="w-4 h-4" />
                  Ready to execute - All approvals received!
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="card bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-1">⚠️ Deletion Process</p>
          <p>Each deletion request requires <strong>3 admin approvals</strong> to be executed. Once approved, the user will be marked as deleted and receive a notification email. They will no longer be able to log in.</p>
        </div>
      </div>
    </div>
  )
}
