import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  AlertTriangle,
  Loader,
  ChevronDown,
  Stethoscope,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import StatusBadge from './StatusBadge';
import QueueIndicator from './QueueIndicator';
import DelayTag from './DelayTag';
import CancelAppointmentModal from './CancelAppointmentModal';
import CancellationInfo from './CancellationInfo';

/**
 * EXPANDABLE APPOINTMENT CARD
 * 
 * COLLAPSED STATE:
 * - Patient name, date, time, type, status, queue number
 * 
 * EXPANDED STATE (on click):
 * - Full patient details, symptoms, estimated time, delay
 * - Action buttons: Start, End, Cancel
 * 
 * BEHAVIOR:
 * - Only one card expanded at a time (managed by parent)
 * - Smooth animation on expand/collapse
 * - All data from backend (no hardcoded values)
 */
const AppointmentCard = ({ 
  appointment, 
  isExpanded, 
  onToggleExpand, 
  onConsultationUpdate 
}) => {
  const { user } = useAuth();
  const [btnLoading, setBtnLoading] = useState(false);
  const [btnError, setBtnError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const {
    _id,
    patientName,
    date,
    time,
    session,
    type,
    status,
    queueNumber,
    estimatedTime,
    delay,
    priority,
    symptoms,
    consultationState,
    actualStartTime,
    actualEndTime
  } = appointment;

  const isVideo = type?.toLowerCase() === 'video';
  const isOngoing = consultationState === 'in_progress';
  const isCompleted = consultationState === 'completed';
  const isCancelled = status?.toLowerCase() === 'cancelled';

  const userRole = user?.role?.toLowerCase?.();

  const cancelledByLabel = (() => {
    const actor = appointment.cancelledBy?.toLowerCase?.();
    if (!actor) return null;
    if (actor === 'doctor') return userRole === 'doctor' ? 'Cancelled by you' : 'Cancelled by doctor';
    if (actor === 'patient') return userRole === 'patient' ? 'Cancelled by you' : 'Cancelled by patient';
    if (actor === 'admin') return 'Cancelled by admin';
    if (actor === 'system') return 'Cancelled by system';
    return 'Cancelled';
  })();

  // Can start only if confirmed and not started yet
  const canStart = status?.toLowerCase() === 'confirmed' && consultationState === 'not_started';
  // Can end only if in progress
  const canEnd = isOngoing;
  
  // Check if appointment time has passed
  const isAppointmentExpired = () => {
    if (!date || !appointment.timeSlot) return false;
    
    try {
      // Parse date and time
      const appointmentDateTime = new Date(date);
      const [hours, minutes] = appointment.timeSlot.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      
      // Add appointment duration (default 30 minutes) to get end time
      const duration = appointment.duration || 30;
      const appointmentEndTime = new Date(appointmentDateTime.getTime() + duration * 60000);
      
      // Check if current time is past the appointment end time
      return new Date() > appointmentEndTime;
    } catch (error) {
      console.error('Error checking appointment expiration:', error);
      return false;
    }
  };
  
  const appointmentExpired = isAppointmentExpired();
  
  // Can cancel if not completed/cancelled/in progress AND appointment hasn't passed
  const canCancel = ['confirmed', 'pending'].includes(status?.toLowerCase()) && !appointmentExpired;

  /**
   * Start consultation - POST /appointments/:id/start
   */
  const handleStartConsultation = async (e) => {
    e.stopPropagation(); // Don't collapse card
    setBtnLoading(true);
    setBtnError(null);
    try {
      const response = await api.post(`/appointments/${_id}/start`);
      if (response.data.success && onConsultationUpdate) {
        onConsultationUpdate(response.data.data);
      }
    } catch (err) {
      setBtnError(err.response?.data?.message || 'Failed to start consultation');
      console.error("Error starting consultation:", err);
    } finally {
      setBtnLoading(false);
    }
  };

  /**
   * End consultation - POST /appointments/:id/end
   */
  const handleEndConsultation = async (e) => {
    e.stopPropagation();
    setBtnLoading(true);
    setBtnError(null);
    try {
      const response = await api.post(`/appointments/${_id}/end`);
      if (response.data.success && onConsultationUpdate) {
        onConsultationUpdate(response.data.data);
      }
    } catch (err) {
      setBtnError(err.response?.data?.message || 'Failed to end consultation');
      console.error("Error ending consultation:", err);
    } finally {
      setBtnLoading(false);
    }
  };

  /**
   * Handle card click to expand/collapse
   * Still allow button clicks without toggling expand
   */
  const handleCardClick = () => {
    onToggleExpand(_id);
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`
          bg-white rounded-xl border transition-all duration-300 cursor-pointer
          ${isExpanded 
            ? 'border-primary-300 ring-2 ring-primary-100 shadow-lg' 
            : 'border-gray-200 shadow-sm hover:shadow-md'
          }
          ${isOngoing ? '!border-blue-300 !ring-blue-100' : ''}
          ${isCancelled ? 'opacity-60' : ''}
        `}
      >
        
        {/* ===== COLLAPSED VIEW (ALWAYS VISIBLE) ===== */}
        <div className="p-4 sm:p-5">
          
          {/* Header Row: Patient | Status | Expand Icon */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {/* Avatar */}
              <div className={`
                w-10 h-10 rounded-lg font-semibold flex items-center justify-center flex-shrink-0
                ${isOngoing 
                  ? 'bg-blue-100 text-blue-700' 
                  : isExpanded
                  ? 'bg-primary-100 text-primary-600'
                  : 'bg-gray-100 text-gray-600'
                }
              `}>
                {patientName?.charAt(0) || '?'}
              </div>

              {/* Name & Symptoms Preview */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                  {patientName || 'Patient'}
                </h3>
                {symptoms && (
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                    {symptoms}
                  </p>
                )}
              </div>
            </div>

            {/* Status Badge + Chevron */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge status={status} size="sm" />
              <ChevronDown 
                className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>

          {/* Info Row: Date | Time | Type */}
          <div className="text-xs text-gray-600 flex items-center gap-2 sm:gap-3 flex-wrap">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              {date}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              {time}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              {isVideo ? <Video className="w-3.5 h-3.5 flex-shrink-0" /> : <MapPin className="w-3.5 h-3.5 flex-shrink-0" />}
              {isVideo ? 'Video' : 'In-Person'}
            </span>
            
            {/* Expired Badge */}
            {appointmentExpired && status?.toLowerCase() === 'confirmed' && (
              <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium whitespace-nowrap">
                <Clock className="w-3 h-3" />
                Passed
              </span>
            )}
          </div>

          {/* FEATURE 5: Quick Cancellation Info (Collapsed) */}
          {isCancelled && appointment.cancelledBy && (
            <div className="mt-2.5 pt-2.5 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-1">
                {cancelledByLabel || 'Cancelled'}
              </p>
              {appointment.cancelReason && (
                <p className="text-xs text-gray-600 truncate italic">"{appointment.cancelReason}"</p>
              )}
            </div>
          )}

          {/* Bottom Row: Queue | EstTime | Delay */}
          <div className={`flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100 transition-all duration-300 ${isExpanded ? 'py-3' : 'py-0'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <QueueIndicator position={queueNumber} size="sm" />
              <div className="text-xs sm:text-sm">
                <p className="text-gray-500">Est.</p>
                <p className="font-semibold text-gray-900">{estimatedTime || '--'}</p>
              </div>
            </div>

            {delay > 0 && <DelayTag delay={delay} />}
          </div>
        </div>

        {/* ===== EXPANDED VIEW (ACCORDION STYLE) ===== */}
        {isExpanded && (
          <>
            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

            {/* Expanded Content */}
            <div className="px-4 sm:px-5 py-4 sm:py-5 space-y-5 bg-gradient-to-b from-white to-gray-50/30">
              
              {/* Full Symptoms / Reason */}
              {symptoms && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h4 className="text-sm font-semibold text-gray-900">Symptoms / Reason</h4>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed bg-amber-50 border border-amber-100 rounded-lg p-3">
                    {symptoms}
                  </p>
                </div>
              )}

              {/* Session + Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Session</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1 capitalize">{session || 'Not set'}</p>
                </div>
                {priority && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</p>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-1 rounded-md text-xs font-semibold capitalize ${
                        priority === 'emergency' ? 'bg-red-100 text-red-700' :
                        priority === 'follow-up' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {priority}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Estimated vs Actual Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium">Est. Start Time</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{estimatedTime || '--'}</p>
                </div>
                {isOngoing && actualStartTime && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Started at</p>
                    <p className="text-sm font-semibold text-blue-900 mt-1">
                      {new Date(actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
                {isCompleted && actualStartTime && actualEndTime && (
                  <>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="text-xs text-emerald-600 font-medium">Started</p>
                      <p className="text-sm font-semibold text-emerald-900 mt-1">
                        {new Date(actualStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <p className="text-xs text-emerald-600 font-medium">Ended</p>
                      <p className="text-sm font-semibold text-emerald-900 mt-1">
                        {new Date(actualEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Delay Info */}
              {delay > 0 && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-900">Running {delay} minutes late</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Please notify the patient about the delay.
                    </p>
                  </div>
                </div>
              )}

              {/* FEATURE 5: Cancellation Info - Shows who cancelled and why */}
              <CancellationInfo appointment={appointment} />

              {/* Error Message */}
              {btnError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{btnError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* START CONSULTATION */}
                  {canStart && (
                    <button 
                      onClick={handleStartConsultation}
                      disabled={btnLoading}
                      className="px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {btnLoading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Stethoscope className="w-4 h-4" />
                          Start Consultation
                        </>
                      )}
                    </button>
                  )}

                  {/* END CONSULTATION */}
                  {canEnd && (
                    <button 
                      onClick={handleEndConsultation}
                      disabled={btnLoading}
                      className="px-4 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {btnLoading ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Ending...
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4" />
                          End Consultation
                        </>
                      )}
                    </button>
                  )}

                  {/* CANCEL APPOINTMENT */}
                  {['confirmed', 'pending'].includes(status?.toLowerCase()) && (
                    <div className="relative group">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!appointmentExpired) {
                            setShowCancelModal(true);
                          }
                        }}
                        disabled={appointmentExpired}
                        className={`w-full px-4 py-2.5 border-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                          appointmentExpired
                            ? 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                            : 'border-red-300 text-red-600 hover:bg-red-50'
                        }`}
                        title={appointmentExpired ? 'Cannot cancel - appointment time has passed' : 'Cancel this appointment'}
                      >
                        <AlertCircle className="w-4 h-4" />
                        Cancel Appointment
                      </button>
                      
                      {/* Tooltip for expired appointments */}
                      {appointmentExpired && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded hidden group-hover:block whitespace-nowrap z-10">
                          Cannot cancel - appointment time has passed
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Cancel Modal */}
      <CancelAppointmentModal 
        appointment={appointment}
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onCancelSuccess={(data) => {
          setShowCancelModal(false);
          if (onConsultationUpdate) {
            onConsultationUpdate(data);
          }
        }}
      />
    </>
  );
};

export default AppointmentCard;
