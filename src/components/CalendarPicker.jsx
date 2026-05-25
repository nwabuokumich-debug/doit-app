import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday, isBefore, startOfDay
} from 'date-fns'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export default function CalendarPicker({ selected, onSelect, onClose, getDailyScore }) {
  const [viewMonth, setViewMonth] = useState(selected || new Date())

  const days = eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  })

  function dayTone(day) {
    const { earned, possible } = getDailyScore(format(day, 'yyyy-MM-dd'))
    if (possible === 0) return null
    const pct = (earned / possible) * 100
    if (pct >= 80) return 'bg-sage'
    if (pct >= 50) return 'bg-accent'
    return 'bg-destructive'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-3xl border-[3px] border-ink p-5 pb-8 shadow-sticker-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setViewMonth(m => subMonths(m, 1))}
            className="flex size-9 items-center justify-center rounded-xl border-[3px] border-ink bg-background active:translate-y-0.5 transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} className="text-ink" strokeWidth={2.5} />
          </button>
          <p className="font-display text-base font-black text-ink">{format(viewMonth, 'MMMM yyyy')}</p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMonth(m => addMonths(m, 1))}
              className="flex size-9 items-center justify-center rounded-xl border-[3px] border-ink bg-background active:translate-y-0.5 transition-all"
              aria-label="Next month"
            >
              <ChevronRight size={16} className="text-ink" strokeWidth={2.5} />
            </button>
            <button
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-xl border-[3px] border-ink bg-background active:translate-y-0.5 transition-all"
              aria-label="Close"
            >
              <X size={14} className="text-ink" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1.5">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center font-mono text-[10px] font-bold text-ink/50 py-1">{d}</div>
          ))}
        </div>

        {/* Days — always 6 rows */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 42 }).map((_, i) => {
            const leadingBlanks = days[0].getDay()
            const dayIndex = i - leadingBlanks
            const day = dayIndex >= 0 && dayIndex < days.length ? days[dayIndex] : null

            if (!day) return <div key={`cell${i}`} className="aspect-square" />

            const isSelected = isSameDay(day, selected)
            const todayFlag = isToday(day)
            const isPastDay = isBefore(startOfDay(day), startOfDay(new Date()))
            const tone = dayTone(day)

            return (
              <button
                key={day.toISOString()}
                onClick={() => { onSelect(day); onClose() }}
                className={`aspect-square flex items-center justify-center rounded-lg font-display text-sm font-black transition-all relative border-2 ${
                  isSelected ? 'border-ink bg-primary shadow-sticker-sm' :
                  todayFlag  ? 'border-ink' :
                                'border-transparent'
                } ${tone && !isSelected ? tone : ''}`}
              >
                <span className={`${isPastDay && !tone && !isSelected ? 'text-ink/30' : 'text-ink'}`}>
                  {format(day, 'd')}
                </span>
              </button>
            )
          })}
        </div>

        {/* Today shortcut */}
        <button
          onClick={() => { onSelect(new Date()); onClose() }}
          className="w-full mt-4 py-3 rounded-xl border-[3px] border-ink bg-background font-mono text-xs font-bold uppercase tracking-widest text-ink shadow-sticker-sm active:translate-y-0.5 active:shadow-none transition-all"
        >
          Go to Today
        </button>
      </div>
    </div>
  )
}
