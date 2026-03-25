import React from 'react';
import { User, Stethoscope, Shield, Zap, HelpCircle } from 'lucide-react';

/**
 * CANCELLATION BADGE COMPONENT
 * 
 * Compact badge showing who cancelled an appointment
 * Used in table/list views (Admin Dashboard)
 * 
 * Shows ONLY when appointment.status === 'cancelled'
 */
const CancellationBadge = ({ appointment, showReason = true }) => {
  if (!appointment || appointment.status !== 'cancelled') {
    return null;
  }

  const { cancelledBy, cancelReason } = appointment;

  /**
   * Get role-specific styling and icon
   */
  const getBadgeStyles = (role) => {
    switch (role?.toLowerCase()) {
      case 'patient':
        return {
          bg: 'bg-yellow-100',
          text: 'text-yellow-800',
          icon: <User className="w-3 h-3" />,
          label: 'Patient'
        };
      case 'doctor':
        return {
          bg: 'bg-red-100',
          text: 'text-red-800',
          icon: <Stethoscope className="w-3 h-3" />,
          label: 'Doctor'
        };
      case 'admin':
        return {
          bg: 'bg-purple-100',
          text: 'text-purple-800',
          icon: <Shield className="w-3 h-3" />,
          label: 'Admin'
        };
      case 'system':
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: <Zap className="w-3 h-3" />,
          label: 'System'
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-800',
          icon: <HelpCircle className="w-3 h-3" />,
          label: 'Unknown'
        };
    }
  };

  const styles = getBadgeStyles(cancelledBy);

  return (
    <div className="inline-block">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold ${styles.bg} ${styles.text}`}
        title={showReason && cancelReason ? cancelReason : ''}
      >
        {styles.icon}
        <span>Cancelled by {styles.label}</span>
      </div>
      {showReason && cancelReason && (
        <p className="text-xs text-gray-600 mt-1 truncate max-w-xs">
        "{cancelReason}"
        </p>
      )}
    </div>
  );
};

export default CancellationBadge;
