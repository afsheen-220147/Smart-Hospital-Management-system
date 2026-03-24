import React, { useState, useEffect } from 'react'
import { 
  Calendar, Save, CheckCircle, Clock, ChevronLeft, ChevronRight,
  Plus, X, Bell, AlertCircle, Trash2, Users, Clock3
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../services/api'
import { showSuccess, showError } from '../../utils/toast'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Get date range for a given week offset
const getWeekDates = (weekOffset = 0) => {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (weekOffset * 7))
  
  const dates = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    dates.push(date)
  }
  return dates
}

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatWeekRange = (dates) => {
  const start = dates[0]
  const end = dates[6]
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export default function Schedule() {
  const { user } = useAuth()
  const [weekOffset, setWeekOffset] = useState(0)
  const [weekDates, setWeekDates] = useState(getWeekDates(0))
  const [schedule, setSchedule] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [animationDirection, setAnimationDirection] = useState('')
  const [showSlotModal, setShowSlotModal] = useState(null)
  const [newSlot, setNewSlot] = useState({ start: '09:00', end: '09:30' })
  const [dayStatusInfo, setDayStatusInfo] = useState({})

  const isDemoDoctor = user?.email === 'sneha@medicare.com' || user?.email === 'suresh@medicare.com'
  const isCurrentWeek = weekOffset === 0
  const isPastWeek = weekOffset < 0

  useEffect(() => {
    fetchSchedule()
    fetchDayStatusInfo()
  }, [weekOffset])

  const fetchDayStatusInfo = async () => {
    try {
      if (isDemoDoctor) return
      
      const profRes = await api.get('/doctors/me')
      const docId = profRes.data.data._id
      
      const apptRes = await api.get(`/appointments/doctor/${docId}`)
      const appointments = apptRes.data.data || []
      
      // Group appointments by day and get status counts
      const statusByDay = {}
      DAYS.forEach(day => {
        statusByDay[day] = {
          pending: 0,
          confirmed: 0,
          completed: 0,
          total: 0
        }
      })
      
      appointments.forEach(apt => {
        const aptDate = new Date(apt.date)
        const dayName = DAYS[aptDate.getDay() === 0 ? 6 : aptDate.getDay() - 1]
        if (statusByDay[dayName]) {
          statusByDay[dayName][apt.status || 'pending']++
          statusByDay[dayName].total++
        }
      })
      
      setDayStatusInfo(statusByDay)
    } catch (e) {
      console.error("Fetch day status error:", e)
    }
  }

  const fetchSchedule = async () => {
    try {
      setLoading(true)
      
      const defaultSchedule = {}
      DAYS.forEach(day => {
        defaultSchedule[day] = {
          active: day !== 'Sunday',
          start: '09:00',
          end: '17:00',
          breakStart: '12:00',
          breakEnd: '13:00',
          slots: []
        }
      })

      if (isDemoDoctor) {
        setSchedule({
          ...defaultSchedule,
          Saturday: { ...defaultSchedule.Saturday, end: '13:00', active: true },
          Sunday: { ...defaultSchedule.Sunday, active: false }
        })
      } else {
        try {
          const res = await api.get('/doctors/me')
          const workingHours = res.data.data?.workingHours || []
          
          workingHours.forEach(wh => {
            if (defaultSchedule[wh.day]) {
              defaultSchedule[wh.day] = {
                active: wh.isWorking,
                start: wh.startTime || '09:00',
                end: wh.endTime || '17:00',
                breakStart: wh.breakStart || '12:00',
                breakEnd: wh.breakEnd || '13:00',
                slots: []
              }
            }
          })
          setSchedule(defaultSchedule)
        } catch (e) {
          console.error("Fetch schedule error:", e)
          setSchedule(defaultSchedule)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleWeekChange = (direction) => {
    setAnimationDirection(direction > 0 ? 'slide-left' : 'slide-right')
    setTimeout(() => {
      setWeekOffset(prev => prev + direction)
      setAnimationDirection('')
    }, 150)
  }

  const toggleDay = (day) => {
    if (isPastWeek) return
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], active: !prev[day].active }
    }))
    setHasChanges(true)
  }

  const updateTime = (day, field, value) => {
    if (isPastWeek) return
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }))
    setHasChanges(true)
  }

  const addTimeSlot = (day) => {
    if (isPastWeek) return
    setShowSlotModal(day)
  }

  const confirmAddSlot = () => {
    if (!showSlotModal) return
    
    setSchedule(prev => ({
      ...prev,
      [showSlotModal]: {
        ...prev[showSlotModal],
        slots: [...(prev[showSlotModal].slots || []), { ...newSlot, id: Date.now() }]
      }
    }))
    setHasChanges(true)
    setShowSlotModal(null)
    setNewSlot({ start: '09:00', end: '09:30' })
  }

  const removeSlot = (day, slotId) => {
    if (isPastWeek) return
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter(s => s.id !== slotId)
      }
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      if (isDemoDoctor) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        showSuccess('Schedule updated successfully! Admin has been notified.')
        setHasChanges(false)
        return
      }

      const workingHours = DAYS.map(day => ({
        day,
        isWorking: schedule[day].active,
        startTime: schedule[day].start,
        endTime: schedule[day].end,
        breakStart: schedule[day].breakStart,
        breakEnd: schedule[day].breakEnd
      }))

      const profRes = await api.get('/doctors/me')
      const doctorId = profRes.data.data._id

      await api.put(`/doctors/${doctorId}`, { workingHours })

      try {
        await api.post('/scheduling/notify-schedule-update', {
          doctorId,
          weekOffset,
          changes: schedule
        })
      } catch (e) {
        console.warn("Admin notification failed:", e)
      }

      showSuccess('Schedule updated successfully! Admin has been notified.')
      setHasChanges(false)
    } catch (err) {
      console.error("Save schedule error:", err)
      showError('Failed to save schedule. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="section-title">My Schedule</h1>
          <p className="section-subtitle">Set your weekly availability for appointments</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-orange-600 font-medium flex items-center gap-1">
              <AlertCircle size={14} /> Unsaved changes
            </span>
          )}
          <button 
            onClick={handleSave} 
            disabled={!hasChanges || saving || isPastWeek}
            className="btn-primary flex items-center gap-2 bg-teal-600 hover:bg-teal-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
            ) : (
              <><Save size={18} /> Save & Notify Admin</>
            )}
          </button>
        </div>
      </div>

      <div className="card shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleWeekChange(-1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="text-center">
            <p className="text-lg font-bold text-gray-900 flex items-center justify-center gap-2">
              <Calendar size={20} className="text-teal-600" />
              {formatWeekRange(weekDates)}
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              {isCurrentWeek && (
                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">Current Week</span>
              )}
              {isPastWeek && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">Past Week (Read Only)</span>
              )}
              {weekOffset > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                  {weekOffset === 1 ? 'Next Week' : `${weekOffset} Weeks Ahead`}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => handleWeekChange(1)}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ChevronRight size={24} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          {[0, 1, 2].map(offset => (
            <button
              key={offset}
              onClick={() => setWeekOffset(offset)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${weekOffset === offset ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {offset === 0 ? 'This Week' : offset === 1 ? 'Next Week' : '+2 Weeks'}
            </button>
          ))}
        </div>
      </div>

      <div className={`card shadow-sm border border-gray-100 p-0 overflow-hidden transition-all duration-150 ${animationDirection === 'slide-left' ? 'translate-x-4 opacity-0' : animationDirection === 'slide-right' ? '-translate-x-4 opacity-0' : ''}`}>
        <div className="p-6 border-b border-gray-100 bg-teal-50 flex items-center gap-3">
          <Calendar size={24} className="text-teal-600" />
          <h2 className="font-bold text-teal-900 text-lg">Weekly Availability</h2>
        </div>

        <div className="divide-y divide-gray-50">
          {DAYS.map((day, index) => {
            const dayData = schedule[day] || { active: false, start: '09:00', end: '17:00' }
            const date = weekDates[index]
            const isToday = new Date().toDateString() === date.toDateString()
            
            return (
              <div key={day} className={`p-5 transition-all duration-200 ${dayData.active ? 'bg-white' : 'bg-gray-50/80'} ${isToday ? 'ring-2 ring-inset ring-teal-200' : ''} ${isPastWeek ? 'opacity-60' : ''}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-[200px]">
                    <button 
                      type="button" 
                      onClick={() => toggleDay(day)}
                      disabled={isPastWeek}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:cursor-not-allowed ${dayData.active ? 'bg-teal-500' : 'bg-gray-300'}`}
                    >
                      <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${dayData.active ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <div>
                      <span className={`font-bold text-lg ${dayData.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>{day}</span>
                      <p className={`text-xs ${isToday ? 'text-teal-600 font-semibold' : 'text-gray-400'}`}>
                        {formatDate(date)} {isToday && '(Today)'}
                      </p>
                    </div>
                  </div>

                  {dayData.active ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Working:</span>
                        <div className="relative">
                          <Clock size={14} className="absolute left-3 top-2.5 text-gray-400" />
                          <input type="time" value={dayData.start} onChange={e => updateTime(day, 'start', e.target.value)}
                            disabled={isPastWeek} className="form-input pl-9 py-2 text-sm bg-gray-50 focus:bg-white w-32 disabled:cursor-not-allowed" />
                        </div>
                        <span className="text-gray-400 font-bold">-</span>
                        <div className="relative">
                          <Clock size={14} className="absolute left-3 top-2.5 text-gray-400" />
                          <input type="time" value={dayData.end} onChange={e => updateTime(day, 'end', e.target.value)}
                            disabled={isPastWeek} className="form-input pl-9 py-2 text-sm bg-gray-50 focus:bg-white w-32 disabled:cursor-not-allowed" />
                        </div>
                      </div>

                      <div className="h-6 w-px bg-gray-200 mx-2 hidden lg:block" />

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">Break:</span>
                        <input type="time" value={dayData.breakStart || '12:00'} onChange={e => updateTime(day, 'breakStart', e.target.value)}
                          disabled={isPastWeek} className="form-input py-2 text-sm bg-orange-50 focus:bg-white w-28 border-orange-200 disabled:cursor-not-allowed" />
                        <span className="text-gray-400">-</span>
                        <input type="time" value={dayData.breakEnd || '13:00'} onChange={e => updateTime(day, 'breakEnd', e.target.value)}
                          disabled={isPastWeek} className="form-input py-2 text-sm bg-orange-50 focus:bg-white w-28 border-orange-200 disabled:cursor-not-allowed" />
                      </div>

                      {!isPastWeek && (
                        <button onClick={() => addTimeSlot(day)} className="p-2 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 transition-colors" title="Add custom slot">
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm font-bold text-red-600 uppercase tracking-wider px-4 py-2 bg-red-50 rounded-lg flex items-center gap-2">
                        <Clock3 size={16} /> Off Duty
                      </span>
                      {dayStatusInfo[day] && dayStatusInfo[day].total > 0 && (
                        <div className="flex items-center gap-4">
                          {dayStatusInfo[day].pending > 0 && (
                            <span className="text-xs font-semibold px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg flex items-center gap-1.5">
                              <Users size={14} /> {dayStatusInfo[day].pending} Waiting
                            </span>
                          )}
                          {dayStatusInfo[day].confirmed > 0 && (
                            <span className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg flex items-center gap-1.5">
                              <CheckCircle size={14} /> {dayStatusInfo[day].confirmed} Confirmed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {dayData.active && dayData.slots && dayData.slots.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Custom Slots:</p>
                    <div className="flex flex-wrap gap-2">
                      {dayData.slots.map(slot => (
                        <span key={slot.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                          {slot.start} - {slot.end}
                          {!isPastWeek && (
                            <button onClick={() => removeSlot(day, slot.id)} className="text-blue-400 hover:text-red-500 transition-colors">
                              <X size={14} />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="card bg-blue-50 border border-blue-100 p-4">
        <div className="flex items-start gap-3">
          <Bell size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-blue-900 text-sm">Schedule Update Notifications</p>
            <p className="text-blue-700 text-sm mt-1">
              When you save changes, the hospital admin will be automatically notified about your schedule updates.
            </p>
          </div>
        </div>
      </div>

      {showSlotModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-teal-600" /> Add Custom Time Slot
            </h3>
            <p className="text-sm text-gray-500 mb-4">Add a custom appointment slot for {showSlotModal}</p>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Start Time</label>
                <input type="time" value={newSlot.start} onChange={(e) => setNewSlot(prev => ({ ...prev, start: e.target.value }))} className="form-input w-full" />
              </div>
              <span className="text-gray-400 font-bold mt-6">-</span>
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">End Time</label>
                <input type="time" value={newSlot.end} onChange={(e) => setNewSlot(prev => ({ ...prev, end: e.target.value }))} className="form-input w-full" />
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowSlotModal(null)} className="flex-1 btn-secondary">Cancel</button>
              <button onClick={confirmAddSlot} className="flex-1 btn-primary bg-teal-600 hover:bg-teal-700">Add Slot</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
