import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function RestrictedDatePicker({ value, onChange }) {
  const [showCalendar, setShowCalendar] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Get first day of month and number of days
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startingDayOfWeek = firstDay.getDay()

  const isValidDate = (date) => {
    const dateToCheck = new Date(date)
    dateToCheck.setHours(0, 0, 0, 0)
    return (
      dateToCheck.getTime() === today.getTime() ||
      dateToCheck.getTime() === tomorrow.getTime()
    )
  }

  const handleDateClick = (day) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    if (isValidDate(selectedDate)) {
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const dateStr = String(day).padStart(2, '0')
      onChange(`${year}-${month}-${dateStr}`)
      setShowCalendar(false)
    }
  }

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return 'Select a date'
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const daysArray = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    daysArray.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i)
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setShowCalendar(!showCalendar)}
        className="w-full px-4 py-3 text-left bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all"
      >
        {formatDisplayDate(value)}
      </button>

      {showCalendar && (
        <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-lg p-4 z-50 w-80">
          {/* Month/Year Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h3 className="font-bold text-gray-900">{monthName}</h3>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {daysArray.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />
              }

              const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
              const isValid = isValidDate(dateObj)
              const isPast = dateObj < today
              const isSelected = value === `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

              let bgColor = 'bg-white text-gray-900'
              let borderColor = 'border-gray-200'
              let cursorClass = 'cursor-pointer hover:bg-gray-50'

              if (isSelected) {
                bgColor = 'bg-blue-600 text-white'
                borderColor = 'border-blue-600'
              } else if (isValid) {
                bgColor = 'bg-green-50 text-green-700'
                borderColor = 'border-green-400'
              } else if (isPast) {
                bgColor = 'bg-gray-100 text-gray-400'
                borderColor = 'border-gray-200'
                cursorClass = 'cursor-not-allowed'
              } else {
                bgColor = 'bg-gray-50 text-gray-400'
                borderColor = 'border-gray-200'
                cursorClass = 'cursor-not-allowed'
              }

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  disabled={!isValid}
                  className={`p-2 text-sm font-medium border rounded-lg transition-all ${bgColor} ${borderColor} border-2 ${cursorClass} ${!isValid ? 'hover:bg-inherit' : ''}`}
                  title={isValid ? 'Selectable' : isPast ? 'Past date' : 'Cannot book for this date'}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-gray-200 space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-400 rounded" />
              <span className="text-gray-600">Available (Today & Tomorrow)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded" />
              <span className="text-gray-600">Unavailable (Past or Future)</span>
            </div>
          </div>
        </div>
      )}

      {/* Overlay to close calendar when clicking outside */}
      {showCalendar && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCalendar(false)}
        />
      )}
    </div>
  )
}
