/**
 * Professional Doctor Dashboard Component
 * 
 * File: frontend/src/pages/doctor/Dashboard_ENHANCED.jsx
 * 
 * Features:
 * - Enterprise-grade professional UI matching Patient Dashboard
 * - Doctor info with status tracking
 * - Session-based appointment filtering
 * - Clean table layout with minimal styling
 * - No emojis, no orange buttons, professional design
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, Clock, Search, Play, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { showSuccess, showError } from '../../utils/toast';
import {
  getCurrentSession,
  isToday,
  isCurrentSession,
  formatTimeIST,
  formatDateIST,
  parseTimeToMinutes,
  getSessionBadge,
  shouldBeDoctorOffDuty
} from '../../utils/timeHelper';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStr, setFilterStr] = useState('Today');
  const [currentSession, setCurrentSession] = useState(null);
  const [doctorStatus, setDoctorStatus] = useState('on-duty');
  const [onDutyToggle, setOnDutyToggle] = useState(true);

  // ============================================
  // EFFECT: Fetch doctor profile
  // ============================================

  useEffect(() => {
    const fetchDoctorData = async () => {
      try {
        setLoading(true);

        const profRes = await api.get('/doctors/me');
        setDoctorProfile(profRes.data.data);

        const apptRes = await api.get(`/appointments/doctor/${profRes.data.data._id}`);
        const realAppts = apptRes.data.data || [];

        // Handle demo doctors
        const isDemoDoctor = user?.email === 'sneha@medicare.com' || user?.email === 'suresh@medicare.com';
        
        if (isDemoDoctor) {
          const demoAppts = [
            {
              _id: 'd1',
              timeSlot: '10:30 AM',
              endTime: '11:00 AM',
              patient: { name: 'Venkat R.' },
              visitType: 'First Consultation',
              status: 'pending',
              isOverbooking: false,
              consultationType: 'in-person',
              session: 'morning',
              date: new Date()
            },
            {
              _id: 'd2',
              timeSlot: '11:00 AM',
              endTime: '11:15 AM',
              patient: { name: 'Rahul K.' },
              visitType: 'Follow-up',
              status: 'in-progress',
              isOverbooking: false,
              consultationType: 'online',
              session: 'morning',
              date: new Date()
            },
            {
              _id: 'd3',
              timeSlot: '14:00',
              endTime: '14:30 PM',
              patient: { name: 'Anitha S.' },
              visitType: 'Emergency',
              status: 'confirmed',
              isOverbooking: true,
              consultationType: 'in-person',
              session: 'afternoon',
              date: new Date()
            },
            {
              _id: 'd4',
              timeSlot: '09:00 AM',
              endTime: '09:30 AM',
              patient: { name: 'Mohammed A.' },
              visitType: 'Routine Checkup',
              status: 'completed',
              isOverbooking: false,
              consultationType: 'in-person',
              session: 'morning',
              date: new Date()
            },
            {
              _id: 'd5',
              timeSlot: '10:00 AM',
              endTime: '10:30 AM',
              patient: { name: 'Cancelled Patient' },
              visitType: 'Consultation',
              status: 'cancelled',
              isOverbooking: false,
              consultationType: 'in-person',
              session: 'morning',
              date: new Date()
            }
          ];
          
          setAppointments([...demoAppts, ...realAppts]);
        } else {
          setAppointments(realAppts);
        }
      } catch (err) {
        console.error("Doctor dashboard error:", err);
        showError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDoctorData();
  }, [user]);

  // ============================================
  // EFFECT: Update session & status every minute
  // ============================================

  useEffect(() => {
    const updateSessionAndStatus = () => {
      const session = getCurrentSession();
      setCurrentSession(session);

      const offDuty = shouldBeDoctorOffDuty();
      setDoctorStatus(offDuty ? 'off-duty' : 'on-duty');
      setOnDutyToggle(!offDuty);
    };

    updateSessionAndStatus();
    const interval = setInterval(updateSessionAndStatus, 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // HELPER: Get status badge styling
  // ============================================

  const getStatusBadgeStyles = (status) => {
    const badges = {
      'pending': {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        label: 'Pending'
      },
      'confirmed': {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        label: 'Confirmed'
      },
      'in-progress': {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        label: 'In Progress'
      },
      'completed': {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        label: 'Completed'
      },
      'cancelled': {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        label: 'Cancelled'
      }
    };
    return badges[status] || badges.pending;
  };

  // ============================================
  // HELPER: Can start consultation?
  // ============================================

  const canStartConsultation = (appointment) => {
    // Rule 1: Only Scheduled/Confirmed status
    if (!['pending', 'confirmed'].includes(appointment.status)) return false;

    // Rule 2: Must be today
    if (!isToday(appointment.date)) return false;

    // Rule 3: Must be in current session
    if (!isCurrentSession(appointment.date, appointment.session)) return false;

    // Rule 4: Cannot be cancelled or completed
    if (['cancelled', 'completed'].includes(appointment.status)) return false;

    return true;
  };

  // ============================================
  // HELPER: Get disable reason for tooltip
  // ============================================

  const getStartButtonDisableReason = (appt) => {
    if (appt.status === 'cancelled') {
      return 'This appointment has been cancelled';
    }
    if (appt.status === 'completed') {
      return 'This appointment is already completed';
    }

    const today = new Date().toDateString();
    const apptDate = new Date(appt.date).toDateString();
    if (apptDate !== today) {
      return `This is a ${formatDateIST(appt.date)} appointment`;
    }

    if (appt.session !== currentSession) {
      return `This is a ${appt.session} session appointment`;
    }

    return 'Cannot start this appointment';
  };

  // ============================================
  // HANDLER: Start consultation
  // ============================================

  const handleStartConsultation = async (appointment) => {
    if (!canStartConsultation(appointment)) {
      showError(getStartButtonDisableReason(appointment));
      return;
    }

    try {
      // Update appointment status
      await api.put(`/appointments/${appointment._id}`, { 
        status: 'in-progress'
      });

      showSuccess('Consultation started');

      // Navigate to diagnosis page with data
      navigate('/doctor/diagnosis', {
        state: {
          selectedAppointmentId: appointment._id,
          patientName: appointment.patient?.name,
          patientData: appointment.patient,
          appointmentData: appointment
        }
      });
    } catch (err) {
      showError(err.response?.data?.message || 'Failed to start consultation');
    }
  };

  // ============================================
  // HANDLER: Update appointment status
  // ============================================

  const handleStatusUpdate = async (appt, newStatus) => {
    const id = appt._id;
    
    if (!String(id).startsWith('d')) {
      try {
        await api.put(`/appointments/${id}`, { status: newStatus });
        showSuccess(`Appointment marked as ${newStatus}`);
      } catch (err) {
        showError('Error updating appointment');
        return;
      }
    }

    setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: newStatus } : a));
  };

  // ============================================
  // HELPER: Parse time to minutes
  // ============================================

  const parseTime = (timeStr) => parseTimeToMinutes(timeStr);

  // ============================================
  // COMPUTED: Filtered and sorted appointments
  // ============================================

  const filteredAndSortedAppointments = useMemo(() => {
    let filtered = appointments.filter(a => {
      // Search filter
      if (searchTerm && !a.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Status-based filtering
      if (filterStr === 'Today') {
        return isToday(a.date) && a.status !== 'completed' && a.status !== 'cancelled';
      }
      if (filterStr === 'Upcoming') {
        return ['pending', 'confirmed', 'in-progress'].includes(a.status);
      }
      if (filterStr === 'Completed') {
        return a.status === 'completed';
      }
      if (filterStr === 'Cancelled') {
        return a.status === 'cancelled';
      }

      return true;
    });

    // Smart sorting
    return filtered.sort((a, b) => {
      // Emergency first
      const aIsEmergency = a.visitType === 'Emergency';
      const bIsEmergency = b.visitType === 'Emergency';
      if (aIsEmergency && !bIsEmergency) return -1;
      if (!aIsEmergency && bIsEmergency) return 1;

      // In-progress second
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
      if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;

      // Time-based sorting (nearest first)
      return parseTime(a.timeSlot) - parseTime(b.timeSlot);
    });
  }, [appointments, searchTerm, filterStr]);

  // ============================================
  // COMPUTED: Summary stats
  // ============================================

  const stats = useMemo(() => {
    const todayAppts = appointments.filter(a => isToday(a.date));
    return {
      totalToday: todayAppts.length,
      upcoming: todayAppts.filter(a => ['pending', 'confirmed', 'in-progress'].includes(a.status)).length,
      emergencies: todayAppts.filter(a => a.visitType === 'Emergency').length,
      completed: todayAppts.filter(a => a.status === 'completed').length
    };
  }, [appointments]);

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      {/* ============================================
          HEADER: Doctor Profile & Status
          ============================================ */}

      <div className="card bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none !p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Dr. {doctorProfile?.user?.name || user?.name || 'Doctor'}
            </h1>
            <p className="text-blue-100 flex items-center gap-4">
              <span className="text-lg font-medium">{doctorProfile?.specialization || 'Medical Professional'}</span>
              <span>·</span>
              <span className="text-lg font-medium">{doctorProfile?.experience || 0} years experience</span>
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${
              onDutyToggle
                ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-400/30'
                : 'bg-red-500/20 text-red-100 border border-red-400/30'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${onDutyToggle ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
              {onDutyToggle ? 'On Duty' : 'Off Duty'}
            </div>
            <p className="text-blue-100 text-sm">
              {new Date().toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit'
              })} IST
            </p>
          </div>
        </div>
      </div>

      {/* ============================================
          AVAILABILITY STATUS
          ============================================ */}

      <div className="card !p-6 flex items-center justify-between bg-blue-50 border border-blue-200">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">Availability</h3>
          <p className="text-sm text-gray-500 mt-1">Current Status: {currentSession} Session</p>
        </div>
        <Link
          to="/doctor/off-duty"
          className="px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          Request Leave
        </Link>
      </div>

      {/* ============================================
          STATS CARDS
          ============================================ */}

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Daily Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Total Today */}
          <div className="card group hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                <Users className="text-blue-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Patients</p>
                <h3 className="text-3xl font-bold text-gray-900">{stats.totalToday}</h3>
              </div>
            </div>
          </div>

          {/* Upcoming */}
          <div className="card group hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-100 transition-colors">
                <Calendar className="text-emerald-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Upcoming</p>
                <h3 className="text-3xl font-bold text-gray-900">{stats.upcoming}</h3>
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="card group hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-100 transition-colors">
                <CheckCircle2 className="text-gray-600" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Completed</p>
                <h3 className="text-3xl font-bold text-gray-900">{stats.completed}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          APPOINTMENTS TABLE
          ============================================ */}

      <div className="card !p-0 overflow-hidden flex flex-col">

        {/* OFF-DUTY BANNER */}
        {!onDutyToggle && (
          <div className="bg-red-50 border-b border-red-200 px-6 py-4 flex items-center gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-red-700">You are currently Off Duty</p>
              <p className="text-xs text-red-600">New appointments cannot be started.</p>
            </div>
          </div>
        )}

        {/* TABLE HEADER */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Appointments</h2>
            <p className="text-sm text-gray-500 mt-1">Manage your schedule</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {['Today', 'Upcoming', 'Completed', 'Cancelled'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStr(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    filterStr === f
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Time</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Patient</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Type</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide">Status</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAndSortedAppointments.length > 0 ? (
                filteredAndSortedAppointments.map((appt) => {
                  const isOngoing = appt.status === 'in-progress';
                  const canStart = canStartConsultation(appt);
                  const badge = getStatusBadgeStyles(appt.status);

                  return (
                    <tr
                      key={appt._id}
                      className={`hover:bg-blue-50/30 transition-colors ${
                        isOngoing ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Time */}
                      <td className="px-6 py-4 font-semibold text-gray-900">
                        {appt.timeSlot}
                      </td>

                      {/* Patient */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                            {appt.patient?.name?.charAt(0) || 'P'}
                          </div>
                          <span className="font-semibold text-gray-800">{appt.patient?.name}</span>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4 text-gray-600">
                        <span className="text-sm font-medium">{appt.visitType}</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-lg font-semibold text-xs border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canStart ? (
                            <button
                              onClick={() => handleStartConsultation(appt)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                              title="Start consultation"
                            >
                              <Play size={14} /> Start
                            </button>
                          ) : (
                            <button
                              disabled
                              title={getStartButtonDisableReason(appt)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-400 text-xs font-semibold rounded-lg cursor-not-allowed"
                            >
                              <Play size={14} /> Start
                            </button>
                          )}

                          {isOngoing && (
                            <button
                              onClick={() => handleStatusUpdate(appt, 'completed')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                              title="Mark as completed"
                            >
                              <CheckCircle2 size={14} /> Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No appointments found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
