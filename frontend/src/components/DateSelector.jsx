import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function DateSelector({ value, onChange, doctorId, onDateSelect }) {
  const [dates, setDates] = useState([])
  const scrollContainerRef = useRef(null)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Generate next 10 days
  const generateNextDates = () => {
    const dateList = []
    for (let i = 0; i < 10; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      
      dateList.push({
        dateString,
        date: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: i === 0,
        isTomorrow: i === 1,
        fullDate: date
      })
    }
    setDates(dateList)
    
    // Auto-scroll to today on load
    setTimeout(() => scrollToToday(), 0)
  }

  useEffect(() => {
    generateNextDates()
  }, [])

  const scrollToToday = () => {
    if (scrollContainerRef.current) {
      const todayElement = scrollContainerRef.current.querySelector('[data-today="true"]')
      if (todayElement) {
        todayElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const handleDateClick = (dateString) => {
    onChange(dateString)
    if (onDateSelect) {
      onDateSelect(dateString)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-900">Select Date</label>
      
      {/* Date Selector Container */}
      <div className="relative">
        {/* Scroll Buttons */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} className="text-gray-600" />
        </button>

        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          aria-label="Scroll right"
        >
          <ChevronRight size={18} className="text-gray-600" />
        </button>

        {/* Dates Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto px-12 py-3 scroll-smooth scrollbar-hide"
          style={{
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            scrollSnapType: 'x mandatory'
          }}
        >
          {dates.map((dateObj) => (
            <button
              key={dateObj.dateString}
              onClick={() => handleDateClick(dateObj.dateString)}
              data-today={dateObj.isToday}
              className={`
                flex-shrink-0 w-20 p-3 rounded-2xl border-2 transition-all duration-200
                flex flex-col items-center justify-center text-center
                scroll-snap-align-center
                ${value === dateObj.dateString
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg transform scale-105'
                  : dateObj.isToday
                  ? 'border-blue-400 bg-white text-gray-900 hover:shadow-md'
                  : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300 hover:shadow-sm'
                }
              `}
            >
              {/* Day Name */}
              <span className={`text-xs font-semibold uppercase tracking-wide ${
                value === dateObj.dateString ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {dateObj.day}
              </span>

              {/* Date Number */}
              <span className={`text-lg font-bold my-1 ${
                value === dateObj.dateString ? 'text-white' : 'text-gray-900'
              }`}>
                {dateObj.date}
              </span>

              {/* Month */}
              <span className={`text-xs font-semibold ${
                value === dateObj.dateString ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {dateObj.month}
              </span>

              {/* Today Badge */}
              {dateObj.isToday && (
                <span className={`text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full ${
                  value === dateObj.dateString 
                    ? 'bg-blue-400 text-white' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  Today
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Help Text */}
      <p className="text-xs text-gray-500 px-0">
        Select a date to view available time slots
      </p>
    </div>
  )
}
