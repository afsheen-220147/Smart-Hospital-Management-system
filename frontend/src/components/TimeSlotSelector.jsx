import React, { useState, useEffect } from 'react'
import { Loader, AlertCircle, Clock } from 'lucide-react'
import api from '../services/api'
import {
  filterValidSlots,
  groupSlotsBySession,
  isDayCompleted,
  isSessionCompleted,
  getNoSlotsMessage,
  DOCTOR_WORKING_HOURS,
  getTodayIST,
  getCurrentTimeIST,
  isDoctorAvailableNow
} from '../utils/timeUtils'

export default function TimeSlotSelector({ selectedDate, doctorId, value, onChange, sessionGroups = true }) {
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dayCompleted, setDayCompleted] = useState(false)

  useEffect(() => {
    if (selectedDate && doctorId) {
      fetchAvailableSlots()
    }
  }, [selectedDate, doctorId])

  const fetchAvailableSlots = async () => {
    setLoading(true)
    setError(null)
    setDayCompleted(false)

    try {
      // 1. Check if day is already completed (after 5 PM today)
      if (isDayCompleted(selectedDate)) {
        setDayCompleted(true)
        setSlots([])
        setLoading(false)
        return
      }

      // 2. API call to fetch booked slots
      const response = await api.get(`/appointments/slots`, {
        params: {
          doctorId,
          date: selectedDate
        }
      })

      const bookedSlots = response.data.data?.bookedSlots || []
      
      // 3. Get all valid slots (morning + afternoon from working hours)
      const ALL_VALID_SLOTS = [
        ...DOCTOR_WORKING_HOURS.morning.slots,
        ...DOCTOR_WORKING_HOURS.afternoon.slots
      ]

      // 4. Filter valid slots (removes past slots, booked slots, invalid slots)
      const validSlots = filterValidSlots(ALL_VALID_SLOTS, bookedSlots, selectedDate)

      // 5. Mark slots with their properties
      const processedSlots = validSlots.map(slot => ({
        time: slot,
        isBooked: bookedSlots.includes(slot),
        session: DOCTOR_WORKING_HOURS.morning.slots.includes(slot) ? 'morning' : 'afternoon',
        isPast: false // Already filtered out via filterValidSlots
      }))

      setSlots(processedSlots)
    } catch (err) {
      console.error('Error fetching slots:', err)
      setError('Unable to fetch available slots. Please try again.')
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  const groupSlotsBySession = () => {
    return {
      morning: slots.filter(s => s.session === 'morning'),
      afternoon: slots.filter(s => s.session === 'afternoon')
    }
  }

  const handleSlotSelect = (slot) => {
    if (!slot.isBooked) {
      onChange(slot.time)
    }
  }

  if (!selectedDate) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Select a date to view available time slots</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-gray-600">Loading available slots...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
        {error}
      </div>
    )
  }

  const grouped = groupSlotsBySession(slots)
  const availableCount = slots.filter(s => !s.isBooked).length

  // ============ RENDER STATES ============

  if (!selectedDate) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>Select a date to view available time slots</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="ml-2 text-gray-600">Loading available slots...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-600 font-semibold">Error Loading Slots</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  // ============ NO SLOTS AVAILABLE ============
  if (availableCount === 0) {
    const noSlotsMsg = getNoSlotsMessage(selectedDate)
    
    return (
      <div className="text-center py-8 bg-orange-50 rounded-lg border-2 border-orange-300">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-6 h-6 text-orange-600" />
          <p className="text-lg font-semibold text-orange-900">{noSlotsMsg.message}</p>
        </div>
        <p className="text-sm text-orange-700">{noSlotsMsg.subtitle}</p>
      </div>
    )
  }

  // ============ DAY COMPLETED ============
  if (dayCompleted) {
    return (
      <div className="text-center py-8 bg-red-50 rounded-lg border-2 border-red-300">
        <p className="text-lg font-semibold text-red-900">❌ Doctor's Hours Ended</p>
        <p className="text-sm text-red-700 mt-1">No more slots available today (After 5 PM)</p>
        <p className="text-xs text-red-600 mt-2">Working hours: 9 AM - 5 PM</p>
      </div>
    )
  }

  // ============ RENDER AVAILABLE SLOTS ============
  return (
    <div className="space-y-6">
      {/* Morning Session */}
      {grouped.morning && grouped.morning.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            {DOCTOR_WORKING_HOURS.morning.label}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {grouped.morning.map((slot) => (
              <button
                key={slot.time}
                onClick={() => handleSlotSelect(slot)}
                disabled={slot.isBooked}
                title={slot.isBooked ? 'Already booked' : 'Select this slot'}
                className={`
                  py-3 px-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer
                  ${value === slot.time
                    ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-lg scale-105'
                    : slot.isBooked
                    ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed line-through'
                    : 'bg-white text-gray-900 border-2 border-gray-300 hover:border-blue-500 hover:shadow-md hover:bg-blue-50'
                  }
                `}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Afternoon Session */}
      {grouped.afternoon && grouped.afternoon.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            {DOCTOR_WORKING_HOURS.afternoon.label}
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {grouped.afternoon.map((slot) => (
              <button
                key={slot.time}
                onClick={() => handleSlotSelect(slot)}
                disabled={slot.isBooked}
                title={slot.isBooked ? 'Already booked' : 'Select this slot'}
                className={`
                  py-3 px-2 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer
                  ${value === slot.time
                    ? 'bg-blue-600 text-white border-2 border-blue-600 shadow-lg scale-105'
                    : slot.isBooked
                    ? 'bg-gray-100 text-gray-400 border-2 border-gray-200 cursor-not-allowed line-through'
                    : 'bg-white text-gray-900 border-2 border-gray-300 hover:border-blue-500 hover:shadow-md hover:bg-blue-50'
                  }
                `}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selection Info */}
      {value && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="text-sm text-green-900">
            <span className="font-semibold">✅ Selected Time:</span> {value}
          </p>
        </div>
      )}

      {/* Today's Note */}
      {selectedDate === getTodayIST() && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          ℹ️ Only slots after current time are available
        </div>
      )}
    </div>
  )
}
