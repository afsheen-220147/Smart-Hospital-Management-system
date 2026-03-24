import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, Calendar, AlertCircle, Clock, Search, 
  Filter, Video, MapPin, ChevronRight, Activity,
  CheckCircle2, PlayCircle, MoreVertical
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStr, setFilterStr] = useState('Today'); // Today, Upcoming, Completed

  // Fetch Data
  useEffect(() => {
    const fetchDoctorData = async () => {
      try {
        setLoading(true);
        let realAppts = [];
        let realProfile = null;

        if (user?._id || user?.id) {
          const profRes = await api.get('/doctors/me');
          realProfile = profRes.data.data;
          
          const apptRes = await api.get(`/appointments/doctor/${realProfile._id}`);
          realAppts = apptRes.data.data || [];
        }

        // Handle Demo Doctor fallback
        const isDemoDoctor = user?.email === 'sneha@medicare.com' || user?.email === 'suresh@medicare.com';
        if (isDemoDoctor) {
          setProfile(realProfile || { specialization: 'General Physician', experience: 12, rating: 4.8 });
          const demoAppts = [
            { _id: 'd1', timeSlot: '10:30 AM', endTime: '11:00 AM', patient: { name: 'Venkat R.' }, visitType: 'First Consultation', status: 'pending', isOverbooking: false, consultationType: 'in-person' },
            { _id: 'd2', timeSlot: '11:00 AM', endTime: '11:15 AM', patient: { name: 'Rahul K.' }, visitType: 'Follow-up', status: 'in-progress', isOverbooking: false, consultationType: 'online' },
            { _id: 'd3', timeSlot: '11:30 AM', endTime: '12:00 PM', patient: { name: 'Anitha S.' }, visitType: 'Emergency', status: 'confirmed', isOverbooking: true, consultationType: 'in-person' },
            { _id: 'd4', timeSlot: '09:00 AM', endTime: '09:30 AM', patient: { name: 'Mohammed A.' }, visitType: 'Routine Checkup', status: 'completed', isOverbooking: false, consultationType: 'in-person' },
          ];
          setAppointments([...demoAppts, ...realAppts]);
        } else {
          setProfile(realProfile);
          setAppointments(realAppts);
        }
      } catch (err) {
        console.error("Doctor dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDoctorData();
  }, [user]);

  const handleStatusUpdate = async (appt, newStatus) => {
    const id = appt._id;
    if (!String(id).startsWith('d')) {
      try {
        await api.put(`/appointments/${id}`, { status: newStatus });
      } catch (err) {
        console.error("Error updating status:", err);
      }
    }

    setAppointments(prev => prev.map(a => a._id === id ? { ...a, status: newStatus } : a));

    if (newStatus === 'in-progress') {
      navigate('/doctor/diagnosis', { 
        state: { selectedAppointmentId: id, patientName: appt.patient?.name } 
      });
    }
  };

  // Helper for sorting
  const parseTime = (timeStr) => {
    if (!timeStr) return 0;
    const timeOnly = timeStr.replace(/ AM| PM| am| pm/g, '').trim();
    let [hours, minutes] = timeOnly.split(':').map(Number);
    if (timeStr.toLowerCase().includes('pm') && hours !== 12) hours += 12;
    else if (timeStr.toLowerCase().includes('am') && hours === 12) hours = 0;
    return hours * 60 + (minutes || 0);
  };

  // Smart Sorting & Filtering
  const filteredAndSortedAppointments = useMemo(() => {
    // 1. Filter
    let filtered = appointments.filter(a => {
      // Search
      if (searchTerm && !a.patient?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      // Category Filter (Mock implementation based on basic rules)
      if (filterStr === 'Today') {
        const isToday = !a.date || new Date(a.date).toDateString() === new Date().toDateString();
        return isToday && a.status !== 'completed';
      }
      if (filterStr === 'Upcoming') return ['pending', 'confirmed'].includes(a.status);
      if (filterStr === 'Completed') return a.status === 'completed';
      return true;
    });

    // 2. Advanced Smart Sorting
    return filtered.sort((a, b) => {
      // Emergency priority highest
      const aIsEmergency = a.visitType === 'Emergency';
      const bIsEmergency = b.visitType === 'Emergency';
      if (aIsEmergency && !bIsEmergency) return -1;
      if (!aIsEmergency && bIsEmergency) return 1;

      // In-progress priority
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
      if (a.status !== 'in-progress' && b.status === 'in-progress') return 1;

      // Status priority: pending/confirmed > completed > cancelled
      const statusOrder = { pending: 1, confirmed: 1, completed: 2, cancelled: 3 };
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      if (orderA !== orderB) return orderA - orderB;

      // Time-based sorting (nearest first)
      return parseTime(a.timeSlot) - parseTime(b.timeSlot);
    });
  }, [appointments, searchTerm, filterStr]);

  // Derived Summary Stats
  const stats = useMemo(() => {
    const todayAppts = appointments.filter(a => !a.date || new Date(a.date).toDateString() === new Date().toDateString());
    return {
      totalToday: todayAppts.length,
      upcoming: todayAppts.filter(a => ['pending', 'confirmed', 'in-progress'].includes(a.status)).length,
      emergencies: todayAppts.filter(a => a.visitType === 'Emergency').length,
      overbooked: todayAppts.filter(a => a.isOverbooking).length
    };
  }, [appointments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      
      {/* 1. Summary Cards Section */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4 tracking-tight">Daily Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Total Patients Today</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{stats.totalToday}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <Users className="text-green-600" size={24} />
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Upcoming</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{stats.upcoming}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Calendar className="text-blue-600" size={24} />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm flex items-center justify-between relative overflow-hidden cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-300">
            <div className="absolute top-0 right-0 w-2 h-full bg-red-500"></div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Emergency Cases</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{stats.emergencies}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <Activity className="text-red-600" size={24} />
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:scale-105 hover:shadow-md transition-all duration-300">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Overbooked Slots</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{stats.overbooked}</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center">
              <AlertCircle className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Scheduler Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        
        {/* Table Header Controls */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-green-600" size={20} /> Smart Schedule
            </h2>
            <p className="text-sm text-gray-500 mt-1">AI-prioritized patient queue.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                placeholder="Search patient..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all bg-white"
              />
            </div>
            
            {/* Filter Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
              {['Today', 'Upcoming', 'Completed'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStr(f)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${filterStr === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50/80 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Consultation</th>
                <th className="px-6 py-4">Mode</th>
                <th className="px-6 py-4">Priority / Smart Alert</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredAndSortedAppointments.length > 0 ? (
                filteredAndSortedAppointments.map((appt) => {
                  const isOngoing = appt.status === 'in-progress';
                  const isEmergency = appt.visitType === 'Emergency';
                  
                  return (
                    <tr 
                      key={appt._id} 
                      className={`group hover:bg-green-50/30 transition-all duration-300 cursor-pointer hover:shadow-sm ${isOngoing ? 'bg-green-50/50' : ''}`}
                    >
                      {/* 1. Time Slot */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className={`font-bold ${isOngoing ? 'text-green-700' : 'text-gray-900'}`}>{appt.timeSlot}</span>
                          {appt.endTime && <span className="text-xs text-gray-400 font-medium">to {appt.endTime}</span>}
                          <span className="text-[10px] text-gray-500 mt-1">Booked: {appt.createdAt ? new Date(appt.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
                        </div>
                      </td>

                      {/* 2. Patient Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isEmergency ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {appt.patient?.name?.charAt(0) || 'P'}
                          </div>
                          <span className="font-semibold text-gray-800">{appt.patient?.name || 'Unknown Patient'}</span>
                        </div>
                      </td>

                      {/* 3. Consultation Type */}
                      <td className="px-6 py-4">
                        <span className="text-gray-600 font-medium flex items-center gap-1.5">
                          {appt.visitType || 'First Consultation'}
                        </span>
                      </td>

                      {/* 4. Mode */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          {appt.consultationType === 'online' ? (
                            <><Video size={14} className="text-blue-500"/> Online</>
                          ) : (
                            <><MapPin size={14} className="text-gray-400"/> Clinic</>
                          )}
                        </div>
                      </td>

                      {/* 5. Smart Priority / Alerts */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {isEmergency && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                              EMERGENCY
                            </span>
                          )}
                          {!isEmergency && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-700 border border-green-200">
                              NORMAL
                            </span>
                          )}
                          {appt.isOverbooking && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-100 text-yellow-700 border border-yellow-200 gap-1">
                              <AlertCircle size={10} /> OVERBOOKED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 6. Status */}
                      <td className="px-6 py-4">
                        {isOngoing && (
                          <span className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Ongoing
                          </span>
                        )}
                        {(appt.status === 'pending' || appt.status === 'confirmed' || appt.status === 'Waiting') && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                            <Clock size={12} /> Waiting
                          </span>
                        )}
                        {appt.status === 'completed' && (
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                            <CheckCircle2 size={12} className="text-green-500" /> Done
                          </span>
                        )}
                      </td>

                      {/* 7. Action Button */}
                      <td className="px-6 py-4 text-right">
                        {appt.status !== 'completed' && !isOngoing && (
                          <button 
                            onClick={() => handleStatusUpdate(appt, 'in-progress')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:border-green-500 hover:text-green-600 hover:scale-105 hover:shadow-md shadow-sm transition-all duration-300 cursor-pointer"
                          >
                            <PlayCircle size={14} /> Start
                          </button>
                        )}
                        {isOngoing && (
                          <button 
                            onClick={() => handleStatusUpdate(appt, 'completed')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 hover:scale-105 hover:shadow-md shadow-sm transition-all duration-300 cursor-pointer"
                          >
                            <CheckCircle2 size={14} /> Complete
                          </button>
                        )}
                        {appt.status === 'completed' && (
                          <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded hover:scale-105 transition-all cursor-pointer">
                            <MoreVertical size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Calendar className="w-10 h-10 text-gray-300" />
                      <p className="text-base font-medium text-gray-900 mt-2">No appointments found</p>
                      <p className="text-sm">You have no scheduled visits matching this criteria.</p>
                    </div>
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
