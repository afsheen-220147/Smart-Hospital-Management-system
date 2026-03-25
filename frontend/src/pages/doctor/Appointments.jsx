import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, RefreshCw, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, Filter, Pause, Play
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/toast';

// Components
import AppointmentList from '../../components/appointments/dashboard/AppointmentList';
import AppointmentDetail from '../../components/appointments/dashboard/AppointmentDetail';
import CancelAppointmentModal from '../../components/appointments/CancelAppointmentModal';

const POLLING_INTERVAL = 15000;

export default function DoctorAppointments() {
  const { user } = useAuth();
  
  // Data State
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // UI State
  const [selectedId, setSelectedId] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Date State
  const [dateMode, setDateMode] = useState('today'); // 'today', 'tomorrow', 'previous', 'custom'
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);

  // Helper: Calculate Age from DOB
  const calculateAge = (dob) => {
    if (!dob) return '--';
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    const ageDate = new Date(difference);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  // Fetch Data Logic
  const fetchData = useCallback(async (showRefreshing = false) => {
    if (!user?._id && !user?.id) return;

    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      // Get doctor profile
      const profRes = await api.get('/doctors/me');
      const doctorProfile = profRes.data.data;

      // Determine date parameter
      let dateParam = 'today';
      if (dateMode === 'tomorrow') dateParam = 'tomorrow';
      else if (dateMode === 'previous') dateParam = 'previous';
      else if (dateMode === 'custom') dateParam = customDate;

      // Fetch appointments
      const apptRes = await api.get(`/appointments/doctor/${doctorProfile._id}`, {
        params: {
          date: dateParam,
          // Fetch all relevant statuses - must match database enum
          status: 'confirmed,in-progress,completed,cancelled' 
        }
      });

      const rawData = apptRes.data.data || [];
      
      const mappedAppointments = rawData.map(apt => ({
        _id: apt._id,
        // Detailed Patient Info (now from enriched patientDetails)
        patientName: apt.patientName || apt.patient?.name || apt.patientDetails?.name || 'Unknown Patient',
        patientId: apt.patient?._id || apt.patientDetails?._id,
        age: apt.patientDetails?.age || '--',
        gender: apt.patientDetails?.gender || '--',
        phone: apt.patientDetails?.phone || '--',
        
        date: apt.date ? new Date(apt.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric' }) : '--',
        rawDate: apt.date,
        time: apt.timeSlot || '--',
        session: apt.session || 'morning',
        type: apt.consultationType || 'in-person',
        status: apt.status,
        cancelledBy: apt.cancelledBy,
        cancelReason: apt.cancelReason || apt.cancellationReason,
        queueNumber: apt.queuePosition || 0,
        estimatedTime: apt.estimatedStartTime 
          ? new Date(apt.estimatedStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : apt.timeSlot || '--',
        delay: apt.delayInMinutes || 0,
        symptoms: apt.reason || 'No specific symptoms reported.',
        consultationState: apt.consultationState || 'not_started',
        reportUrl: apt.reportUrl || null,
        patientDetails: apt.patientDetails || {},
        originalData: apt
      }));

      // Sort logic depends on view
      if (dateMode === 'previous') {
        // Sort by date DESC for history
        mappedAppointments.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
      } else {
        // Sort by queue/time ASC for today/future
        mappedAppointments.sort((a, b) => a.queueNumber - b.queueNumber);
      }

      setAppointments(mappedAppointments);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, dateMode, customDate]);

  // Initial Load & Polling
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Derived State: Selected Appointment
  const selectedAppointment = useMemo(() => 
    appointments.find(a => a._id === selectedId) || null
  , [appointments, selectedId]);

  // Derived State: Filtered List
  const filteredAppointments = useMemo(() => 
    appointments.filter(app => {
      const matchSearch = app.patientName.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchStatus = true;
      if (statusFilter === 'active') {
        // Active = confirmed or in-progress appointments only
        matchStatus = ['confirmed', 'in-progress'].includes(app.status);
      } else if (statusFilter !== 'All') {
        matchStatus = app.status === statusFilter;
      }
      
      return matchSearch && matchStatus;
    })
  , [appointments, searchTerm, statusFilter]);


  // Handlers
  const handleSelect = (appointment) => {
    setSelectedId(appointment._id);
  };

  const handleBack = () => {
    setSelectedId(null);
  };

  const handleStart = async (appointment) => {
    // Logic check: Only allowed if date is Today and status is correct
    if (dateMode === 'previous') {
        showError("Cannot start past appointments.");
        return;
    }

    if (window.confirm(`Start consultation for ${appointment.patientName}?`)) {
      try {
        setIsProcessing(true);
        await api.post(`/appointments/${appointment._id}/start`);
        await fetchData(true);
        showSuccess(`Consultation started with ${appointment.patientName}`);
      } catch (err) {
        console.error("Start failed", err);
        showError(err.response?.data?.message ||"Failed to start consultation");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handlePause = async (appointment) => {
    if (window.confirm(`Pause consultation for ${appointment.patientName}?`)) {
      try {
        setIsProcessing(true);
        await api.post(`/appointments/${appointment._id}/pause`);
        await fetchData(true);
        showSuccess(`Consultation paused. You can resume later.`);
      } catch (err) {
        console.error("Pause failed", err);
        showError(err.response?.data?.message ||"Failed to pause consultation");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleResume = async (appointment) => {
    if (window.confirm(`Resume consultation for ${appointment.patientName}?`)) {
      try {
        setIsProcessing(true);
        await api.post(`/appointments/${appointment._id}/resume`);
        await fetchData(true);
        showSuccess(`Consultation resumed with ${appointment.patientName}`);
      } catch (err) {
        console.error("Resume failed", err);
        showError(err.response?.data?.message ||"Failed to resume consultation");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleEnd = async (appointment) => {
    if (window.confirm(`End consultation for ${appointment.patientName}?`)) {
      try {
        setIsProcessing(true);
        await api.post(`/appointments/${appointment._id}/end`);
        await fetchData(true);
        showSuccess(`Consultation completed successfully!`);
        // Don't close details immediately so doctor can upload report
      } catch (err) {
        console.error("End failed", err);
        showError(err.response?.data?.message ||"Failed to end consultation");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleCancelClick = (appointment) => {
    setAppointmentToCancel(appointment);
    setCancelModalOpen(true);
  };

  const handleCancelSuccess = () => {
    // ✅ OPTIMISTIC: Immediately update local state, polling will validate in 15s
    if (appointmentToCancel) {
      setAppointments(prev => prev.map(apt =>
        apt._id === appointmentToCancel._id
          ? { ...apt, status: 'cancelled' }
          : apt
      ));
    }
    
    setCancelModalOpen(false);
    setAppointmentToCancel(null);
    if (selectedId === appointmentToCancel?._id) {
      setSelectedId(null);
    }
    
    // Trigger a refresh after 2 seconds to ensure sync
    setTimeout(() => fetchData(true), 2000);
  };


  if (loading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)] bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 overflow-hidden">
      
      {/* --- HEADER --- */}
      <div className="flex-none bg-white border-b border-gray-200 px-4 py-3 md:px-6 md:py-4 z-20 shadow-sm">
        <div className="flex flex-col gap-4">
            
            {/* Title & Search Row */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                    <div className="relative flex-1 md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search patient..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all outline-none"
                    />
                    </div>
                </div>

                <button 
                  onClick={() => fetchData(true)}
                  disabled={refreshing}
                  className={`p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
            </div>

            {/* Date Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => setDateMode('today')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${dateMode === 'today' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  Today
                </button>
                <button 
                  onClick={() => setDateMode('tomorrow')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${dateMode === 'tomorrow' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  Tomorrow
                </button>
                <button 
                  onClick={() => setDateMode('previous')}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${dateMode === 'previous' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  Previous
                </button>

                <div className="h-6 w-px bg-gray-300 mx-1 hidden sm:block"></div>

                <div className="relative flex items-center">
                   <CalendarIcon className="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" />
                   <input 
                      type="date"
                      value={dateMode === 'custom' ? customDate : ''}
                      onChange={(e) => {
                          setCustomDate(e.target.value);
                          setDateMode('custom');
                      }}
                      className={`pl-9 pr-3 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${dateMode === 'custom' ? 'border-primary-500 text-primary-700 bg-primary-50' : 'border-gray-300 text-gray-600'}`}
                   />
                </div>
            </div>
        </div>
      </div>

      {/* --- FILTER BAR (Mobile Only) --- */}
      <div className="md:hidden flex overflow-x-auto gap-2 p-2 bg-white border-b border-gray-200 hide-scrollbar">
         {['All', 'active', 'confirmed', 'ongoing', 'completed', 'cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`
                whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border
                ${statusFilter === status 
                  ? 'bg-primary-50 border-primary-200 text-primary-700' 
                  : 'bg-white border-gray-200 text-gray-600'}
              `}
            >
              {status === 'active' ? 'Active' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
         ))}
      </div>

      {/* --- MAIN SPLIT VIEW --- */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT PANEL: Appointment List */}
        <div className={`
          flex-col bg-white border-r border-gray-200 w-full md:w-[320px] lg:w-[380px] xl:w-[420px] transition-all z-10
          ${selectedId ? 'hidden md:flex' : 'flex'}
        `}>
          <div className="p-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center sticky top-0">
            <span>{dateMode === 'today' ?"Today's Queue" : dateMode.toUpperCase()} ({filteredAppointments.length})</span>
            <div className="hidden md:block">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent border-none p-0 text-xs font-semibold text-gray-700 focus:ring-0 cursor-pointer outline-none"
              >
                <option value="All">All Status</option>
                <option value="active">Active Only</option>
                <option value="confirmed">Confirmed</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          
          <AppointmentList 
            appointments={filteredAppointments} 
            selectedId={selectedId} 
            onSelect={handleSelect}
            className="flex-1"
          />
        </div>

        {/* RIGHT PANEL: Details */}
        <div className={`
          flex-col flex-1 bg-white md:bg-gray-50 transition-all 
          ${selectedId ? 'flex fixed inset-0 z-30 md:static md:z-auto' : 'hidden md:flex'}
        `}>
          <AppointmentDetail 
            appointment={selectedAppointment}
            onBack={handleBack}
            onStart={handleStart}
            onEnd={handleEnd}
            onCancel={handleCancelClick}
            onPause={handlePause}
            onResume={handleResume}
            className="h-full w-full"
            isToday={dateMode === 'today'}
            refreshData={() => fetchData(true)}
          />
        </div>

      </div>

      {/* --- MODALS --- */}
      {cancelModalOpen && (
        <CancelAppointmentModal 
          isOpen={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          appointment={appointmentToCancel}
          onCancelSuccess={handleCancelSuccess}
        />
      )}

      {isProcessing && (
        <div className="fixed inset-0 bg-white/50 z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

    </div>
  );
}
