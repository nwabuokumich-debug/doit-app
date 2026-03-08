import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, isToday, isBefore, startOfDay
} from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function CalendarPicker({ selected, onSelect, onClose, getDailyScore }) {
  const [viewMonth, setViewMonth] = useState(selected || new Date())

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  })

  function dotColor(day) {
    const { earned, possible } = getDailyScore(format(day, 'yyyy-MM-dd'))
    if (possible === 0) return null
    const pct = (earned / possible) * 100
    if (pct >= 80) return '#22c55e'
    if (pct >= 50) return '#eab308'
    return '#ef4444'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-sm bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl border border-white/5 p-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setViewMonth(m => subMonths(m, 1))} className="text-gray-400 hover:text-white p-1">
            <ChevronLeft size={20} />
          </button>
          <p className="text-white font-semibold">{format(viewMonth, 'MMMM yyyy')}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMonth(m => addMonths(m, 1))}
              className="text-gray-400 hover:text-white p-1"
            >
              <ChevronRight size={20} />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-1 ml-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center text-xs text-gray-600 font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Days — always 6 rows (42 cells) so height never changes */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => {
            const leadingBlanks = days[0].getDay()
            const dayIndex = i - leadingBlanks
            const day = dayIndex >= 0 && dayIndex < days.length ? days[dayIndex] : null

            if (!day) return <div key={`cell${i}`} className="aspect-square" />

            const isSelected = isSameDay(day, selected)
            const todayFlag = isToday(day)
            const isPastDay = isBefore(startOfDay(day), startOfDay(new Date()))
            const color = dotColor(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => { onSelect(day); onClose() }}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all relative ${
                  isSelected
                    ? 'bg-indigo-500 text-white'
                    : todayFlag
                    ? 'bg-white/10 text-white'
                    : isPastDay
                    ? 'text-gray-600 hover:bg-white/5'
                    : 'text-gray-400 hover:bg-white/5'
                }`}
              >
                {format(day, 'd')}
                {color && !isSelected && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Today shortcut */}
        <button
          onClick={() => { onSelect(new Date()); onClose() }}
          className="w-full mt-4 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          Go to Today
        </button>
      </div>
    </div>
  )
}
