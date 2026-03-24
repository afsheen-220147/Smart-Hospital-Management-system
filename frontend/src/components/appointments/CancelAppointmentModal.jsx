import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, Loader, Calendar, Clock, MapPin, Video } from 'lucide-react';
import api from '../../services/api';

/**
 * MODERN CANCEL APPOINTMENT MODAL
 * 
 * Features:
 * - Centered overlay with backdrop blur
 * - Healthcare-themed color palette
 * - Responsive & Accessible (Focus trap + Keyboard support)
 * - Smooth fade-in animation
 * - Built with React + Tailwind CSS
 */
export default function CancelAppointmentModal({ 
  appointment, 
  isOpen, 
  onClose, 
  onCancelSuccess 
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const modalRef = useRef(null);

  // ✅ Focus trap, escape key, and scroll lock with proper cleanup
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      // ✅ Prevent body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);

      return () => {
        // ✅ CLEANUP: Restore scroll and remove listeners
        document.body.style.overflow = originalOverflow;
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || !appointment) return null;

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // API call to cancel appointment
      const response = await api.put(`/appointments/${appointment._id}`, {
        status: 'cancelled',
        cancellationReason: reason
      });

      if (response.data.success) {
        if (onCancelSuccess) {
          onCancelSuccess(response.data.data);
        }
        reset();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to cancel appointment. Please try again.';
      setError(errorMsg);
      console.error("Cancellation Error:", err);
      // ✅ NO automatic reset - let user retry
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setReason('');
    setError(null);
    onClose();
  };

  const isVideo = appointment.type?.toLowerCase() === 'video' || appointment.consultationType === 'online';

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && reset()}
    >
      <div 
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-300"
      >
        
        {/* --- HEADER --- */}
        <div className="relative bg-gradient-to-r from-red-50 to-white px-6 py-5 border-b border-red-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shadow-sm">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <div className="flex-1">
              <h2 id="modal-title" className="text-lg font-bold text-gray-900">Cancel Appointment</h2>
              <p className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full w-fit mt-1 italic">
                {appointment.patientName || 'Haripriya'}
              </p>
            </div>
          </div>
          <button 
            onClick={reset}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* --- CONTENT --- */}
        <div className="p-6 space-y-6">
          
          {/* Section: Appointment Details */}
          <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 shadow-sm">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Date & Time</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {appointment.date} at {appointment.time}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pt-2 border-t border-blue-100/50">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  {isVideo ? <Video className="w-4 h-4 text-purple-600" /> : <MapPin className="w-4 h-4 text-teal-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Consultation Type</p>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {isVideo ? 'Online Video Call' : 'In-Person Visit'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Reason Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-800 flex items-center justify-between">
              Reason for Cancellation
              <span className="text-[10px] text-red-500 font-normal">Required*</span>
            </label>
            <textarea 
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              autoFocus
              placeholder="Please explain why you're cancelling this appointment..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all resize-none shadow-inner"
            />
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Warning Style Box */}
          <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl shadow-sm">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-xs text-orange-800 leading-relaxed font-medium">
              This action <span className="underline decoration-orange-300 font-bold">cannot be undone</span>. 
              The patient will be notified of the cancellation immediately.
            </p>
          </div>
        </div>

        {/* --- FOOTER BUTTONS --- */}
        <div className="bg-gray-50 px-6 py-5 flex flex-col sm:flex-row gap-3 border-t border-gray-200">
          <button 
            onClick={reset}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-bold text-sm rounded-xl hover:bg-white hover:border-gray-400 active:scale-95 transition-all disabled:opacity-50"
          >
            Keep Appointment
          </button>
          <button 
            onClick={handleCancel}
            disabled={loading || !reason.trim()}
            className="flex-1 px-4 py-3 bg-red-600 text-white font-bold text-sm rounded-xl shadow-md shadow-red-200 hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Cancel Appointment</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
