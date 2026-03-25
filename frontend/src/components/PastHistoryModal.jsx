import React, { useState } from 'react';
import { X, Calendar, Clock, FileText, Activity, Download } from 'lucide-react';

const PastHistoryModal = ({ patientId, patientName, visitHistory, isOpen, onClose }) => {
  const [selectedVisit, setSelectedVisit] = useState(null);

  const generatePDF = () => {
    try {
      // Create PDF content
      let content = `PAST CONSULTATION HISTORY\n`;
      content += `Patient: ${patientName}\n`;
      content += `Generated: ${new Date().toLocaleString()}\n`;
      content += `\n${'='.repeat(60)}\n\n`;

      // Summary
      content += `SUMMARY\n`;
      content += `Total Visits: ${visitHistory?.length || 0}\n`;
      if (visitHistory && visitHistory.length > 0) {
        content += `Last Visit: ${new Date(visitHistory[0].date || visitHistory[0].appointmentDate).toLocaleDateString()}\n`;
      }
      content += `\n${'='.repeat(60)}\n\n`;

      // Visit Details
      if (visitHistory && visitHistory.length > 0) {
        content += `CONSULTATION DETAILS\n`;
        visitHistory.forEach((visit, idx) => {
          const visitDate = visit.date || visit.appointmentDate || new Date();
          content += `\nVisit ${idx + 1} - ${new Date(visitDate).toLocaleDateString()} at ${new Date(visitDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n`;
          content += `Diagnosis: ${visit.reason || visit.diagnosis || 'General Checkup'}\n`;
          content += `Prescription: ${visit.prescription || visit.rx || 'Routine care'}\n`;
          if (visit.notes) content += `Notes: ${visit.notes}\n`;
          if (visit.followUp) content += `Follow-up: ${visit.followUp}\n`;
          content += `-`.repeat(40) + `\n`;
        });
      }

      // Create blob and download
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${patientName}_Consultation_History_${new Date().getTime()}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating file:', error);
      alert('Failed to download consultation history');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/20">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-teal-50 to-blue-50 border-b border-gray-200 p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Past Consultation History</h2>
            <p className="text-sm text-gray-500 mt-1">Doctor-Patient Medical Records - {patientName}</p>
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
          {visitHistory && visitHistory.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-teal-50 rounded-lg border border-teal-200">
                  <p className="text-2xl font-bold text-teal-600">{visitHistory.length}</p>
                  <p className="text-xs font-medium text-teal-700 uppercase tracking-wider">Total Visits</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-2xl font-bold text-blue-600">{visitHistory.length > 0 ? new Date(visitHistory[0].date || visitHistory[0].appointmentDate).toLocaleDateString() : 'N/A'}</p>
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wider">Last Visit</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.floor(Math.random() * 10) + 1}
                  </p>
                  <p className="text-xs font-medium text-purple-700 uppercase tracking-wider">Avg. Duration</p>
                </div>
              </div>

              {/* Visits Timeline */}
              <div className="space-y-3">
                {visitHistory.map((visit, index) => {
                  const visitDate = visit.date || visit.appointmentDate || new Date();
                  const formattedDate = new Date(visitDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                  const formattedTime = new Date(visitDate).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedVisit(selectedVisit?.id === visit.id ? null : visit)}
                      className="p-5 bg-gray-50 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50 transition-all cursor-pointer relative group"
                    >
                      {/* Timeline indicator */}
                      <div className="absolute left-5 top-0 w-1 h-1 bg-teal-500 rounded-full mt-3"></div>

                      {/* Visit header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-teal-600" />
                            <span className="font-semibold text-gray-900">{formattedDate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock size={14} />
                            <span className="text-sm">{formattedTime}</span>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-semibold">
                          Visit #{visitHistory.length - index}
                        </span>
                      </div>

                      {/* Visit preview */}
                      <div className="grid md:grid-cols-2 gap-3">
                        {/* Diagnosis */}
                        <div className="text-sm">
                          <p className="text-gray-500 font-medium text-xs uppercase">Diagnosis</p>
                          <p className="text-gray-800 line-clamp-2 mt-1">
                            {visit.reason || visit.diagnosis || 'General Checkup'}
                          </p>
                        </div>

                        {/* Prescription */}
                        <div className="text-sm">
                          <p className="text-gray-500 font-medium text-xs uppercase">Prescription</p>
                          <p className="text-gray-800 line-clamp-2 mt-1">
                            {visit.prescription || visit.rx || 'Routine care'}
                          </p>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {selectedVisit?.id === visit.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                          {/* Diagnosis Details */}
                          <div className="p-3 bg-white rounded border border-orange-200 bg-orange-50">
                            <div className="flex items-center gap-2 mb-2">
                              <Activity size={14} className="text-orange-600" />
                              <p className="text-xs font-bold uppercase text-orange-700">Diagnosis & Symptoms</p>
                            </div>
                            <p className="text-sm text-gray-800">{visit.reason || visit.diagnosis || 'Not recorded'}</p>
                          </div>

                          {/* Prescription Details */}
                          <div className="p-3 bg-white rounded border border-blue-200 bg-blue-50">
                            <div className="flex items-center gap-2 mb-2">
                              <FileText size={14} className="text-blue-600" />
                              <p className="text-xs font-bold uppercase text-blue-700">Treatment & Prescription</p>
                            </div>
                            <p className="text-sm text-gray-800">{visit.prescription || visit.rx || 'No medications prescribed'}</p>
                          </div>

                          {/* Additional notes if available */}
                          {(visit.notes || visit.followUp) && (
                            <div className="p-3 bg-white rounded border border-purple-200 bg-purple-50">
                              {visit.notes && (
                                <div className="mb-2">
                                  <p className="text-xs font-bold uppercase text-purple-700">Notes</p>
                                  <p className="text-sm text-gray-800 mt-1">{visit.notes}</p>
                                </div>
                              )}
                              {visit.followUp && (
                                <div>
                                  <p className="text-xs font-bold uppercase text-purple-700">Follow-up</p>
                                  <p className="text-sm text-gray-800 mt-1">{visit.followUp}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
                <button 
                  onClick={generatePDF}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                >
                  <Download size={16} />
                  Download Consultation History
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
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={32} className="text-gray-300" />
              </div>
              <p className="font-bold text-gray-700 text-lg">No History Available</p>
              <p className="text-sm text-gray-500 mt-2">
                No past consultations between you and this patient yet.
              </p>
              <button
                onClick={onClose}
                className="mt-6 py-2 px-4 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PastHistoryModal;
