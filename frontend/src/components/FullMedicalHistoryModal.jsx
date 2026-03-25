import React, { useState, useEffect } from 'react';
import { X, Clock, Download, AlertCircle, Calendar, Activity, FileText } from 'lucide-react';
import DoctorConsent from './DoctorConsent';
import api from '../services/api';

const FullMedicalHistoryModal = ({ patientId, patientName, isOpen, onClose, onAccessGranted }) => {
  const [hasConsent, setHasConsent] = useState(false);
  const [fullHistory, setFullHistory] = useState(null);
  const [visitHistory, setVisitHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState(null);

  const fetchFullHistory = async () => {
    try {
      setLoading(true);
      // Fetch complete medical history from patient profile
      const res = await api.get(`/patients?patientId=${patientId}`);
      const patientData = res.data.data;
      
      if (Array.isArray(patientData)) {
        const patient = patientData.find(p => p.user?._id === patientId);
        if (patient) {
          setFullHistory(patient);
        }
      } else {
        setFullHistory(patientData);
      }
      
      // Fetch visit history
      await fetchVisitHistory();
    } catch (error) {
      console.error('Error fetching full history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitHistory = async () => {
    try {
      const res = await api.get(`/visits?patientId=${patientId}`);
      if (res.data && res.data.data) {
        const visits = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
        setVisitHistory(visits.sort((a, b) => new Date(b.date || b.appointmentDate) - new Date(a.date || a.appointmentDate)));
      }
    } catch (error) {
      console.error('Error fetching visit history:', error);
    }
  };

  const generatePDF = () => {
    try {
      // Create PDF content
      let content = `COMPLETE MEDICAL HISTORY\n`;
      content += `Patient: ${fullHistory?.user?.name || patientName}\n`;
      content += `Email: ${fullHistory?.user?.email || 'N/A'}\n`;
      content += `Generated: ${new Date().toLocaleString()}\n`;
      content += `\n${'='.repeat(60)}\n\n`;

      // Personal Information
      content += `PERSONAL INFORMATION\n`;
      content += `Name: ${fullHistory?.user?.name || 'N/A'}\n`;
      content += `Email: ${fullHistory?.user?.email || 'N/A'}\n`;
      content += `Blood Group: ${fullHistory?.bloodGroup || 'Unknown'}\n`;
      content += `Gender: ${fullHistory?.gender || 'Not specified'}\n`;
      content += `Phone: ${fullHistory?.phone || 'Not provided'}\n`;
      content += `Address: ${fullHistory?.address || 'Not provided'}\n`;
      content += `\n${'='.repeat(60)}\n\n`;

      // Visit History
      if (visitHistory && visitHistory.length > 0) {
        content += `VISIT HISTORY (${visitHistory.length} visits)\n`;
        visitHistory.forEach((visit, idx) => {
          const visitDate = visit.date || visit.appointmentDate || new Date();
          content += `\nVisit ${idx + 1} - ${new Date(visitDate).toLocaleDateString()}\n`;
          content += `Reason: ${visit.reason || visit.diagnosis || 'General Checkup'}\n`;
          content += `Prescription: ${visit.prescription || visit.rx || 'Routine care'}\n`;
          if (visit.notes) content += `Notes: ${visit.notes}\n`;
          content += `-`.repeat(40) + `\n`;
        });
        content += `\n${'='.repeat(60)}\n\n`;
      }

      // Medical Conditions
      if (fullHistory?.medicalConditions && fullHistory.medicalConditions.length > 0) {
        content += `MEDICAL CONDITIONS\n`;
        fullHistory.medicalConditions.forEach(condition => {
          content += `• ${condition}\n`;
        });
        content += `\n${'='.repeat(60)}\n\n`;
      }

      // Allergies
      if (fullHistory?.allergies && fullHistory.allergies.length > 0) {
        content += `ALLERGIES\n`;
        fullHistory.allergies.forEach(allergy => {
          content += `• ${allergy}\n`;
        });
        content += `\n${'='.repeat(60)}\n\n`;
      }

      // Current Medications
      if (fullHistory?.currentMedications && fullHistory.currentMedications.length > 0) {
        content += `CURRENT MEDICATIONS\n`;
        fullHistory.currentMedications.forEach(med => {
          content += `• ${med.name || 'Unknown'}${med.dosage ? ` - ${med.dosage}` : ''}\n`;
        });
        content += `\n${'='.repeat(60)}\n\n`;
      }

      // Previous Diagnoses
      if (fullHistory?.previousDiagnoses && fullHistory.previousDiagnoses.length > 0) {
        content += `PREVIOUS DIAGNOSES\n`;
        fullHistory.previousDiagnoses.forEach(diag => {
          content += `• ${diag.diagnosis || 'Unknown'}`;
          if (diag.date) content += ` (${new Date(diag.date).toLocaleDateString()})`;
          if (diag.treatment) content += ` - Treatment: ${diag.treatment}`;
          content += `\n`;
        });
        content += `\n${'='.repeat(60)}\n\n`;
      }

      // Create blob and download
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fullHistory?.user?.name || patientName}_Medical_History_${new Date().getTime()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to download medical history');
    }
  };

  const handleConsentSuccess = () => {
    setHasConsent(true);
    fetchFullHistory();
    if (onAccessGranted) {
      onAccessGranted();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Full Medical History</h2>
            <p className="text-sm text-gray-500 mt-1">{patientName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!hasConsent ? (
            <div className="space-y-6">
              {/* Security Notice */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Secure Access Required</p>
                  <p className="mt-1 text-blue-800">
                    For patient privacy protection, this medical record requires consent verification. 
                    The patient must confirm this access by sharing their verification code.
                  </p>
                </div>
              </div>

              {/* Consent Component */}
              <div>
                <DoctorConsent
                  patientId={patientId}
                  onSuccess={handleConsentSuccess}
                  onCancel={onClose}
                />
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Loading full medical history...</p>
              </div>
            </div>
          ) : fullHistory ? (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">✓</div>
                <div className="text-sm text-green-900">
                  <p className="font-semibold">Access Granted</p>
                  <p className="mt-1">Patient has verified consent. Displaying complete medical history.</p>
                </div>
              </div>

              {/* Full History Display */}
              <div className="space-y-4">
                {/* Personal Information */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-bold text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">Name</p>
                      <p className="text-gray-900 font-semibold">{fullHistory.user?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Email</p>
                      <p className="text-gray-900 font-semibold">{fullHistory.user?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Blood Group</p>
                      <p className="text-gray-900 font-semibold">{fullHistory.bloodGroup || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Gender</p>
                      <p className="text-gray-900 font-semibold">{fullHistory.gender || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Phone</p>
                      <p className="text-gray-900 font-semibold">{fullHistory.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Address</p>
                      <p className="text-gray-900 font-semibold">{fullHistory.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Visit History - Google Style Timeline */}
                {visitHistory && visitHistory.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900 text-lg">Visit History</h3>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {visitHistory.length} visit{visitHistory.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {visitHistory.map((visit, index) => {
                        const visitDate = visit.date || visit.appointmentDate || new Date();
                        const formattedDate = new Date(visitDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                        const formattedTime = new Date(visitDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div
                            key={index}
                            onClick={() => setExpandedVisit(expandedVisit === index ? null : index)}
                            className="rounded-lg border border-gray-200 bg-white hover:shadow-md hover:border-blue-300 transition-all cursor-pointer overflow-hidden group"
                          >
                            {/* Visit Card Header */}
                            <div className="p-4 hover:bg-blue-50 transition-colors">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Calendar size={18} className="text-blue-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900">{formattedDate}</span>
                                      <span className="text-gray-500 text-sm flex items-center gap-1">
                                        <Clock size={14} />
                                        {formattedTime}
                                      </span>
                                    </div>
                                    <p className="text-gray-700 text-sm mt-1 line-clamp-1">
                                      {visit.reason || visit.diagnosis || 'General Checkup'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors">
                                  <svg className={`w-5 h-5 transition-transform ${expandedVisit === index ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                  </svg>
                                </div>
                              </div>
                            </div>

                            {/* Visit Card Details - Expandable */}
                            {expandedVisit === index && (
                              <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 space-y-3">
                                {/* Reason/Diagnosis */}
                                <div className="flex gap-3">
                                  <Activity size={16} className="text-orange-500 flex-shrink-0 mt-1" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-600 uppercase">Reason for Visit</p>
                                    <p className="text-sm text-gray-800 mt-1">{visit.reason || visit.diagnosis || 'General Checkup'}</p>
                                  </div>
                                </div>

                                {/* Prescription/Treatment */}
                                <div className="flex gap-3">
                                  <FileText size={16} className="text-blue-500 flex-shrink-0 mt-1" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-600 uppercase">Prescription & Treatment</p>
                                    <p className="text-sm text-gray-800 mt-1">{visit.prescription || visit.rx || 'Routine care'}</p>
                                  </div>
                                </div>

                                {/* Notes/Follow-up */}
                                {(visit.notes || visit.followUp) && (
                                  <div className="flex gap-3">
                                    <FileText size={16} className="text-purple-500 flex-shrink-0 mt-1" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-gray-600 uppercase">Additional Notes</p>
                                      <p className="text-sm text-gray-800 mt-1">{visit.notes || visit.followUp || 'N/A'}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Medical Conditions */}
                {fullHistory.medicalConditions && fullHistory.medicalConditions.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Medical Conditions</h3>
                    <div className="space-y-2">
                      {fullHistory.medicalConditions.map((condition, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">{condition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergies */}
                {fullHistory.allergies && fullHistory.allergies.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Allergies</h3>
                    <div className="space-y-2">
                      {fullHistory.allergies.map((allergy, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-orange-50 rounded-lg">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="text-sm text-gray-900">{allergy}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Medications */}
                {fullHistory.currentMedications && fullHistory.currentMedications.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Current Medications</h3>
                    <div className="space-y-2">
                      {fullHistory.currentMedications.map((med, i) => (
                        <div key={i} className="flex items-start gap-3 p-2 bg-blue-50 rounded-lg">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{med.name || 'Unknown'}</p>
                            {med.dosage && <p className="text-xs text-gray-600">{med.dosage}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Previous Diagnoses */}
                {fullHistory.previousDiagnoses && fullHistory.previousDiagnoses.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-bold text-gray-900 mb-3">Previous Diagnoses</h3>
                    <div className="space-y-3">
                      {fullHistory.previousDiagnoses.map((diag, i) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm font-semibold text-gray-900">{diag.diagnosis || 'Unknown'}</p>
                          {diag.date && <p className="text-xs text-gray-500 mt-1">Date: {new Date(diag.date).toLocaleDateString()}</p>}
                          {diag.treatment && <p className="text-xs text-gray-700 mt-1">Treatment: {diag.treatment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No additional history message */}
                {(!fullHistory.medicalConditions || fullHistory.medicalConditions.length === 0) &&
                  (!fullHistory.allergies || fullHistory.allergies.length === 0) &&
                  (!fullHistory.currentMedications || fullHistory.currentMedications.length === 0) &&
                  (!fullHistory.previousDiagnoses || fullHistory.previousDiagnoses.length === 0) &&
                  (!visitHistory || visitHistory.length === 0) && (
                  <div className="p-6 text-center bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-gray-500">No additional medical history records available</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button 
                  onClick={generatePDF}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Download size={16} />
                  Download Medical History
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullMedicalHistoryModal;
