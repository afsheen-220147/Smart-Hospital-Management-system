import React from 'react';
import { AlertCircle, User, Stethoscope, Shield, Zap } from 'lucide-react';

/**
 * CANCELLATION INFO COMPONENT
 * 
 * Displays:
 * - Who cancelled the appointment
 * - Why it was cancelled
 * - Role-specific badge colors
 * 
 * Shows ONLY when appointment.status === 'cancelled'
 */
const CancellationInfo = ({ appointment }) => {
  if (!appointment || appointment.status !== 'cancelled') {
    return null;
  }

  const { cancelledBy, cancelReason, cancelledAt } = appointment;

  /**
   * Get role-specific styling and icon
   */
  const getCancelledByStyles = (role) => {
    switch (role?.toLowerCase()) {
      case 'patient':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-900',
          label: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-800',
          icon: <User className="w-4 h-4" />,
          displayName: 'Patient'
        };
      case 'doctor':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
          label: 'text-red-700',
          badge: 'bg-red-100 text-red-800',
          icon: <Stethoscope className="w-4 h-4" />,
          displayName: 'Doctor'
        };
      case 'admin':
        return {
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          text: 'text-purple-900',
          label: 'text-purple-700',
          badge: 'bg-purple-100 text-purple-800',
          icon: <Shield className="w-4 h-4" />,
          displayName: 'Admin'
        };
      case 'system':
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-900',
          label: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-800',
          icon: <Zap className="w-4 h-4" />,
          displayName: 'System'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-900',
          label: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-800',
          icon: <AlertCircle className="w-4 h-4" />,
          displayName: 'Unknown'
        };
    }
  };

  const styles = getCancelledByStyles(cancelledBy);
  const formattedDate = cancelledAt 
    ? new Date(cancelledAt).toLocaleString([], { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    : 'N/A';

  return (
    <div className={`mt-4 p-3 rounded-lg border ${styles.bg} ${styles.border}`}>
      {/* Header with Icon and Role */}
      <div className="flex items-start gap-3 mb-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${styles.badge}`}>
          {styles.icon}
        </div>
        <div className="flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wide ${styles.label}`}>
            Cancelled by {styles.displayName}
          </p>
          {cancelledAt && (
            <p className={`text-xs ${styles.label} opacity-75 mt-0.5`}>
              {formattedDate}
            </p>
          )}
        </div>
      </div>

      {/* Reason */}
      {cancelReason && (
        <div className="mt-2">
          <p className={`text-xs font-medium ${styles.label} mb-1`}>
            Reason
          </p>
          <p className={`text-sm ${styles.text} leading-relaxed`}>
            {cancelReason}
          </p>
        </div>
      )}
      
      {!cancelReason && (
        <div className="mt-2">
          <p className={`text-sm italic ${styles.text} opacity-70`}>
            No reason provided
          </p>
        </div>
      )}
    </div>
  );
};

export default CancellationInfo;
