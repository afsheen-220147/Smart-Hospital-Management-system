import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2, RefreshCw, Users, Stethoscope, CalendarCheck,
  ClipboardList, UserPlus, Calendar, BarChart3, Building2,
  Activity, TrendingUp
} from 'lucide-react'
import api from '../../services/api'
import AdminDeletionPolls from '../../components/AdminDeletionPolls'

const STATUS_BADGE = {
  pending:     'bg-yellow-100 text-yellow-700',
  confirmed:   'bg-blue-100 text-blue-700',
  'in-progress': 'bg-indigo-100 text-indigo-700',
  completed:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-red-100 text-red-700',
  'no-show':   'bg-gray-100 text-gray-700',
}

const statusBadge = (s) => (
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[s] || 'bg-gray-100 text-gray-600'}`}>
    {s}
  </span>
)

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/stats')
      setStats(res.data.data)
    } catch (err) {
      setError('Failed to load dashboard data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const monthly = stats?.monthlyData || []
  const max = monthly.length ? Math.max(...monthly.map(m => m.appointments), 1) : 1
  const deptStats = stats?.departmentStats || []
  const maxDept = deptStats.length ? Math.max(...deptStats.map(d => d.count), 1) : 1

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-800 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-violet-300 text-sm">Admin Control Panel</p>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 size={26} /> Hospital Overview</h1>
            <p className="text-violet-300 text-sm mt-1">
              {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} · All systems operational
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="hidden md:flex w-14 h-14 rounded-2xl bg-white/10 border border-white/20 items-center justify-center">
              <Building2 size={28} className="text-white" />
            </div>
            <button
              onClick={fetchStats}
              className="flex items-center gap-1.5 text-violet-200 hover:text-white text-xs bg-violet-700 hover:bg-violet-600 px-3 py-1.5 rounded-lg transition-all"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-violet-500" />
        </div>
      )}

      {!loading && stats && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Patients',     value: stats.totalPatients.toLocaleString(),     Icon: Users,        color: 'bg-blue-50 text-blue-600',    border: 'border-blue-200',   sub: 'registered' },
              { label: 'Total Doctors',      value: stats.totalDoctors.toLocaleString(),      Icon: Stethoscope,  color: 'bg-teal-50 text-teal-600',    border: 'border-teal-200',   sub: 'active' },
              { label:"Today's Appts",      value: stats.todayAppointments.toLocaleString(), Icon: CalendarCheck, color: 'bg-violet-50 text-violet-600', border: 'border-violet-200', sub: 'scheduled today' },
              { label: 'Total Appointments', value: stats.totalAppointments.toLocaleString(), Icon: ClipboardList, color: 'bg-orange-50 text-orange-600', border: 'border-orange-200', sub: 'all time' },
            ].map(s => (
              <div key={s.label} className={`bg-white dark:bg-gray-800 rounded-2xl border ${s.border} dark:border-gray-700 p-5 flex items-center gap-4 hover:shadow-md transition-shadow`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.color}`}>
                  <s.Icon size={22} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Deletion Polls Widget */}
          <div>
            <AdminDeletionPolls />
          </div>

          {/* Appointment status pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Upcoming',   value: stats.statusBreakdown.upcoming,   color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: 'Completed',  value: stats.statusBreakdown.completed,  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
              { label: 'Cancelled',  value: stats.statusBreakdown.cancelled,  color: 'bg-red-50 text-red-700 border-red-200' },
              { label: 'No-Show',    value: stats.statusBreakdown.noShow,     color: 'bg-gray-50 text-gray-700 border-gray-200' },
            ].map(p => (
              <div key={p.label} className={`border rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-semibold ${p.color}`}>
                <span className="text-lg font-bold">{p.value}</span>
                <span className="font-medium text-xs">{p.label}</span>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Monthly Chart */}
            <div className="md:col-span-2 card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="section-title text-lg">Appointments per Month</h2>
                  <p className="section-subtitle">Last 12 months</p>
                </div>
                <span className="text-xs bg-violet-100 text-violet-700 px-3 py-1.5 rounded-lg font-medium">Live Data</span>
              </div>
              <div className="flex items-end gap-2 h-40">
                {monthly.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                    <div className="relative w-full flex justify-center">
                      <div className="absolute -top-6 text-xs text-gray-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">{m.appointments}</div>
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-lg hover:from-violet-700 hover:to-violet-500 transition-all cursor-pointer"
                      style={{ height: `${(m.appointments / max) * 100}%`, minHeight: m.appointments > 0 ? '4px' : '2px' }}
                      title={`${m.month}: ${m.appointments}`}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">{m.month}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Department Stats */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">Department Stats</h2>
              {deptStats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No appointment data yet</p>
              ) : (
                <div className="space-y-3">
                  {deptStats.map(d => (
                    <div key={d.dept}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{d.dept}</span>
                        <span className="text-gray-400">{d.count} appts</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all duration-500"
                          style={{ width: `${(d.count / maxDept) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Appointments + Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 card overflow-hidden p-0">
              <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                <h2 className="font-bold text-gray-900">Recent Appointments</h2>
                <Link to="/admin/appointments" className="text-sm text-violet-600 hover:underline">View all →</Link>
              </div>
              {stats.recentAppointments.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">No appointments yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr>
                      <th className="table-th">Patient</th>
                      <th className="table-th">Doctor</th>
                      <th className="table-th">Date</th>
                      <th className="table-th">Status</th>
                    </tr></thead>
                    <tbody>
                      {stats.recentAppointments.map(a => (
                        <tr key={a._id} className="hover:bg-gray-50">
                          <td className="table-td font-medium text-gray-900">{a.patient}</td>
                          <td className="table-td text-gray-500">{a.doctor}</td>
                          <td className="table-td text-gray-500">{a.date}</td>
                          <td className="table-td">{statusBadge(a.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4">Quick Admin Actions</h2>
              <div className="space-y-2">
                {[
                  { Icon: UserPlus,    label: 'Add New Doctor',    to: '/admin/doctors',      color: 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
                  { Icon: Users,       label: 'Manage Patients',   to: '/admin/patients',     color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
                  { Icon: Calendar,    label: 'View Appointments', to: '/admin/appointments', color: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
                  { Icon: TrendingUp,  label: 'View Reports',      to: '/admin/reports',      color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
                ].map(a => (
                  <Link key={a.label} to={a.to}
                    className={`flex items-center gap-3 p-3 rounded-xl ${a.color} font-medium text-sm hover:opacity-80 transition-all`}>
                    <a.Icon size={17} />{a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

