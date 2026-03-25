import React, { useState } from 'react';
import { 
  ArrowLeft, Clock, Calendar, User, AlertTriangle, 
  MapPin, StickyNote, Play, Square, XCircle, Pause,
  FileText, Upload, Eye, CheckCircle, AlertCircle
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import api from '../../../services/api';
import { showSuccess, showError } from '../../../utils/toast';

const AppointmentDetail = ({ 
  appointment, 
  onBack, 
  onStart, 
  onEnd, 
  onCancel,
  onPause,
  onResume,
  className,
  isToday,
  refreshData
}) => {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  if (!appointment) {
    return (
      <div className={`hidden md:flex items-center justify-center p-8 bg-gray-50 h-full text-gray-400 ${className}`}>
        <div className="text-center">
          <User className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Select a patient to view details</p>
        </div>
      </div>
    );
  }

  const isDelayed = appointment.delay > 0;
  const isOngoing = appointment.status === 'in-progress';
  const isPaused = appointment.consultationState === 'paused' || appointment.status === 'paused';
  const isCompleted = appointment.status === 'completed';
  const isCancelled = appointment.status === 'cancelled';
  const isConfirmed = appointment.status === 'confirmed';

  // --- Handlers ---

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadReport = async () => {
    if (!selectedFile) return;
    
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      await api.post(`/appointments/${appointment._id}/upload-report`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('Report uploaded successfully');
      setSelectedFile(null);
      if (refreshData) refreshData();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload report');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white relative ${className}`}>
      {/* --- HEADER --- */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 sticky top-0 bg-white z-10 shadow-sm">
        <button 
          onClick={onBack}
          className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 truncate">
            {appointment.patientName}
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>#{appointment.queueNumber || '0'}</span>
            <span>•</span>
            <span className="capitalize">{appointment.type} Consultation</span>
          </div>
        </div>
        
        <div className="hidden sm:block">
          <StatusBadge status={appointment.status} />
        </div>
      </div>

      {/* --- SCROLLABLE CONTENT --- */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-6">
        {/* Status Banner (Mobile) */}
        <div className="sm:hidden mb-4">
          <StatusBadge status={appointment.status} />
        </div>

        {/* --- PATIENT INFO CARD --- */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3">
                <User className="w-4 h-4 text-primary-600" />
                Patient Information 
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                    <span className="text-xs text-gray-400 block mb-1">Gender</span>
                    <span className="font-medium text-gray-700 capitalize">{appointment.gender || '--'}</span>
                </div>
                <div>
                    <span className="text-xs text-gray-400 block mb-1">Age</span>
                    <span className="font-medium text-gray-700">{appointment.age ? `${appointment.age} yrs` : '--'}</span>
                </div>
                <div className="col-span-2">
                    <span className="text-xs text-gray-400 block mb-1">Contact</span>
                    <span className="font-medium text-gray-700 font-mono">{appointment.phone || '--'}</span>
                </div>
            </div>
        </div>

        {/* --- SCHEDULE INFO --- */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase">Date</span>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Calendar className="w-4 h-4 text-primary-500" />
                {appointment.date}
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase">Time Slot</span>
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Clock className="w-4 h-4 text-primary-500" />
                {appointment.time}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase">Session</span>
              <div className="text-sm font-semibold text-gray-700 capitalize">
                {appointment.session}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-medium text-gray-400 uppercase">Est. Start</span>
              <div className="text-sm font-semibold text-gray-700">
                {appointment.estimatedTime}
              </div>
            </div>
          </div>

          {/* Delay Indicator */}
          {isDelayed && !isCompleted && !isCancelled && (
            <div className="mt-4 flex items-center gap-2 p-2.5 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-100">
              <AlertTriangle className="w-4 h-4 shrink-0 animate-pulse" />
              <span className="font-medium">
                Running late by {appointment.delay} minutes
              </span>
            </div>
          )}
        </div>

        {/* --- CANCELLATION INFO --- */}
        {isCancelled && appointment.cancelledBy && (
          <div className="p-4 rounded-xl border border-red-100 bg-red-50 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-100 rounded-lg text-red-600 flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">
                  {appointment.cancelledBy === 'patient' 
                    ? 'Cancelled by patient' 
                    : appointment.cancelledBy === 'doctor' 
                    ? 'Cancelled by doctor' 
                    : appointment.cancelledBy === 'admin' 
                    ? 'Cancelled by admin' 
                    : 'Cancelled by system'}
                </p>
                {appointment.cancelReason && (
                  <p className="text-sm text-red-800 mt-2 italic leading-relaxed">
                    "{appointment.cancelReason}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- SYMPTOMS --- */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <StickyNote className="w-4 h-4 text-gray-400" />
            Reported Symptoms
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed min-h-[100px] max-h-[300px] overflow-y-auto shadow-sm whitespace-pre-wrap">
            {appointment.symptoms}
          </div>
        </div>

        {/* --- MEDICAL REPORTS --- */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                    <FileText className="w-4 h-4 text-gray-400" />
                    Medical Report
                </div>
            </div>

            {/* Existing Report */}
            {appointment.reportUrl ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-900">Report Available</p>
                            <a 
                                href={appointment.reportUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline mt-0.5 block"
                            >
                                View Document
                            </a>
                        </div>
                    </div>
                    <a 
                        href={appointment.reportUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="View Report"
                    >
                        <Eye className="w-5 h-5" />
                    </a>
                </div>
            ) : (
                <div className="text-sm text-gray-500 italic p-2">
                    No reports uploaded yet.
                </div>
            )}
            
            {/* Upload Area (Only for Completed) */}
            {isCompleted && (
                <div className="mt-4 p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Upload Consultation Report</h4>
                    <div className="flex items-center gap-3">
                        <label className="flex-1">
                            <input 
                                type="file" 
                                accept="application/pdf,image/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-xs file:font-semibold
                                file:bg-primary-50 file:text-primary-700
                                hover:file:bg-primary-100
                                cursor-pointer" 
                            />
                        </label>
                        <button
                            onClick={handleUploadReport}
                            disabled={!selectedFile || uploading}
                            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2
                                ${!selectedFile || uploading 
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                    : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'}
                            `}
                        >
                            {uploading ? (
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                            ) : (
                                <Upload className="w-4 h-4" />
                            )}
                            Upload
                        </button>
                    </div>
                </div>
            )}
        </div>

      </div>

      {/* --- ACTION BAR (Fixed Bottom) --- */}
      {/* Do NOT show for Cancelled */}
      {!isCancelled && !isCompleted && (
        <div className="p-4 border-t border-gray-100 bg-white absolute bottom-0 left-0 right-0 md:bg-gray-50/80 md:backdrop-blur-sm z-20">
          <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto md:max-w-none md:flex md:justify-end md:flex-wrap">
            
            <button
              onClick={() => onCancel(appointment)}
              className="col-span-1 md:w-auto px-4 py-3 md:py-2.5 bg-white border border-red-200 text-red-600 rounded-xl font-medium text-sm hover:bg-red-50 focus:ring-2 focus:ring-red-100 transition-colors flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>

            {isOngoing ? (
              <>
                {!isPaused && (
                  <button
                    onClick={() => onPause(appointment)}
                    className="col-span-1 md:w-auto px-4 py-3 md:py-2.5 bg-amber-600 text-white rounded-xl font-medium text-sm hover:bg-amber-700 focus:ring-4 focus:ring-amber-100 transition-all shadow-md shadow-amber-200 flex items-center justify-center gap-2"
                  >
                    <Pause className="w-4 h-4 fill-current" />
                    Pause
                  </button>
                )}
                {isPaused && (
                  <button
                    onClick={() => onResume(appointment)}
                    className="col-span-1 md:w-auto px-4 py-3 md:py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Resume
                  </button>
                )}
                <button
                  onClick={() => onEnd(appointment)}
                  className="col-span-1 md:w-auto px-6 py-3 md:py-2.5 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700 focus:ring-4 focus:ring-red-100 transition-all shadow-md shadow-red-200 flex items-center justify-center gap-2"
                >
                  <Square className="w-4 h-4 fill-current" />
                  End Consultation
                </button>
              </>
            ) : (
              <div 
                title={!isToday ? "Consultation allowed only on scheduled date" : "Start now"} // Tooltip for disabled state
                className="col-span-1 md:w-auto"
              >
                <button
                    disabled={!isToday || !isConfirmed}
                    onClick={() => onStart(appointment)}
                    className={`
                        w-full px-6 py-3 md:py-2.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2
                        ${(!isToday || !isConfirmed)
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-200 focus:ring-4 focus:ring-primary-100'
                        }
                    `}
                >
                    <Play className="w-4 h-4 fill-current" />
                    Start Consultation
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentDetail;