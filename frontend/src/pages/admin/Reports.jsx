import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { TrendingUp, Users, Calendar, Activity, Download, FileText, Loader2, RefreshCw } from 'lucide-react'
import api from '../../services/api'

const DEPT_COLORS = ['#EF4444', '#8B5CF6', '#F97316', '#EC4899', '#14B8A6', '#3B82F6', '#22C55E', '#F59E0B']

const TABS = ['Monthly Trends', 'Department Visits', 'Doctor Workload']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg text-sm">
        <p className="font-semibold text-gray-900 mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <span className="font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Reports() {
  const [tab, setTab] = useState('Monthly Trends')
  const [stats, setStats] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, doctorsRes, apptRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/doctors'),
        api.get('/appointments'),
      ])
      setStats(statsRes.data.data)
      setDoctors(doctorsRes.data.data || [])
      setAppointments(apptRes.data.data || [])
    } catch (err) {
      setError('Failed to load report data. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Doctor workload: count appointments per doctor
  const doctorWorkload = React.useMemo(() => {
    if (!appointments.length) return []
    const map = {}
    appointments.forEach(a => {
      const docId   = a.doctor?._id
      const docName = a.doctor?.user?.name || 'Unknown'
      const spec    = a.doctor?.specialization || 'General'
      if (!docId) return
      if (!map[docId]) map[docId] = { name: docName, specialization: spec, appointments: 0, completed: 0 }
      map[docId].appointments += 1
      if (a.status === 'completed') map[docId].completed += 1
    })
    return Object.values(map)
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 8)
  }, [appointments])

  // Department pie data from stats
  const deptPie = (stats?.departmentStats || []).map((d, i) => ({
    name: d.dept,
    value: d.count,
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }))
  const totalDeptCount = deptPie.reduce((s, d) => s + d.value, 0) || 1

  const monthlyData = stats?.monthlyData || []
  const totalAppointments = monthlyData.reduce((s, m) => s + m.appointments, 0)
  const avgPerMonth = monthlyData.length ? Math.round(totalAppointments / monthlyData.length) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Analytics Dashboard</h1>
          <p className="section-subtitle">Live hospital performance metrics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="btn-secondary flex items-center gap-2 text-sm py-2">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-violet-500" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Appointments', value: totalAppointments,                  icon: Calendar,   color: 'bg-blue-50 text-blue-600',   border: 'border-blue-100' },
              { label: 'Total Patients',     value: stats?.totalPatients ?? '—',        icon: Users,      color: 'bg-teal-50 text-teal-600',   border: 'border-teal-100' },
              { label: 'Total Doctors',      value: stats?.totalDoctors ?? '—',         icon: Activity,   color: 'bg-violet-50 text-violet-600',border: 'border-violet-100' },
              { label: 'Avg Per Month',      value: avgPerMonth,                         icon: TrendingUp, color: 'bg-orange-50 text-orange-600',border: 'border-orange-100' },
            ].map(s => (
              <div key={s.label} className={`bg-white rounded-2xl border ${s.border} p-5 hover:shadow-md transition-shadow`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                  <s.icon size={18} />
                </div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Status breakdown pills */}
          {stats?.statusBreakdown && (
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Completed',  v: stats.statusBreakdown.completed,  c: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { label: 'Upcoming',   v: stats.statusBreakdown.upcoming,   c: 'bg-blue-50 text-blue-700 border-blue-200' },
                { label: 'Cancelled',  v: stats.statusBreakdown.cancelled,  c: 'bg-red-50 text-red-700 border-red-200' },
                { label: 'No-Show',    v: stats.statusBreakdown.noShow,     c: 'bg-gray-50 text-gray-700 border-gray-200' },
              ].map(p => (
                <div key={p.label} className={`border rounded-xl px-4 py-2 flex items-center gap-2 text-sm font-semibold ${p.c}`}>
                  <span className="text-lg font-bold">{p.v}</span>
                  <span className="font-medium text-xs">{p.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Chart Tabs */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl w-fit">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === t ? 'bg-white text-violet-600 shadow-sm font-semibold' : 'text-gray-500 hover:text-gray-700'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {/* Monthly Trends — Line Chart */}
          {tab === 'Monthly Trends' && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-1">Monthly Appointments — Last 12 Months</h2>
              <p className="text-sm text-gray-400 mb-6">Total appointments per month (live data)</p>
              {monthlyData.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No appointment data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
                    <Line type="monotone" dataKey="appointments" name="Appointments"
                      stroke="#2563EB" strokeWidth={2.5}
                      dot={{ fill: '#2563EB', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Department Visits — Pie Chart */}
          {tab === 'Department Visits' && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-1">Department-wise Appointment Distribution</h2>
              <p className="text-sm text-gray-400 mb-6">Total appointments per department (live data)</p>
              {deptPie.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No department data yet</p>
              ) : (
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={deptPie} cx="50%" cy="50%" innerRadius={70} outerRadius={120}
                        paddingAngle={4} dataKey="value" nameKey="name">
                        {deptPie.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value + ' appointments', name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {deptPie.map(d => (
                      <div key={d.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                            <span className="font-medium text-gray-700">{d.name}</span>
                          </div>
                          <span className="text-gray-500">{d.value} appts</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${(d.value / totalDeptCount) * 100}%`, backgroundColor: d.color }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Doctor Workload — Bar Chart */}
          {tab === 'Doctor Workload' && (
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-1">Doctor Workload Analysis</h2>
              <p className="text-sm text-gray-400 mb-6">Total and completed appointments per doctor</p>
              {doctorWorkload.length === 0 ? (
                <p className="text-gray-400 text-center py-10">No appointment data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={doctorWorkload} margin={{ top: 5, right: 20, left: 0, bottom: 60 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                      angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }} />
                    <Bar dataKey="appointments" name="Total Appointments" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Completed" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Top Performing Doctors Table */}
          {doctorWorkload.length > 0 && (
            <div className="card overflow-hidden p-0">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Top Performing Doctors</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">Rank</th>
                      <th className="table-th">Doctor</th>
                      <th className="table-th">Specialization</th>
                      <th className="table-th">Total Appts</th>
                      <th className="table-th">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctorWorkload.map((d, i) => (
                      <tr key={d.name} className="hover:bg-gray-50">
                        <td className="table-td">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${
                            i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-500' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="table-td font-semibold text-gray-900">{d.name}</td>
                        <td className="table-td text-blue-600">{d.specialization}</td>
                        <td className="table-td font-bold">{d.appointments}</td>
                        <td className="table-td font-bold">{d.completed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

