import { useMemo, useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, subMonths, addMonths, isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight, TrendingUp, Target, Flame, Star } from 'lucide-react'

function scoreColor(pct) {
  if (pct >= 80) return 'oklch(0.7 0.16 145)'    // sage / green
  if (pct >= 50) return 'oklch(0.78 0.16 75)'    // mustard-ish
  if (pct > 0)   return 'oklch(0.65 0.24 27)'    // destructive
  return 'oklch(0.85 0.04 95)'                    // muted cream
}

function scoreBg(pct) {
  if (pct >= 80) return 'bg-sage'
  if (pct >= 50) return 'bg-accent'
  if (pct > 0)   return 'bg-destructive text-background'
  return 'bg-card'
}

export default function Analytics({ tasks, getDailyScore }) {
  const [viewMonth, setViewMonth] = useState(new Date())

  const days = useMemo(() => {
    const start = startOfMonth(viewMonth)
    const end = endOfMonth(viewMonth)
    return eachDayOfInterval({ start, end })
  }, [viewMonth])

  const dayData = useMemo(() => {
    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd')
      const { earned, possible } = getDailyScore(dateStr)
      const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0
      return { day, dateStr, earned, possible, pct }
    })
  }, [days, getDailyScore])

  // Stats
  const activeDays = dayData.filter(d => d.possible > 0)
  const totalEarned = activeDays.reduce((s, d) => s + d.earned, 0)
  const avgPct = activeDays.length > 0
    ? Math.round(activeDays.reduce((s, d) => s + d.pct, 0) / activeDays.length)
    : 0
  const bestDay = activeDays.reduce((best, d) => (!best || d.pct > best.pct) ? d : best, null)

  // Streak
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - i)
    const { pct } = getDailyScore(format(checkDate, 'yyyy-MM-dd'))
    if (pct >= 50) streak++
    else break
  }

  // Chart data — last 14 days
  const chartData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      const dateStr = format(d, 'yyyy-MM-dd')
      const { earned, possible } = getDailyScore(dateStr)
      const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0
      return { label: format(d, 'dd'), earned, possible, pct }
    })
  }, [getDailyScore])

  const [selectedDay, setSelectedDay] = useState(null)
  const [hoveredBar, setHoveredBar] = useState(null)

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="px-5 pt-5 pb-32 space-y-4">
        {/* Header */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60 font-bold">
            Your Graph
          </p>
          <h1 className="font-display text-2xl font-black text-ink leading-none">Analytics</h1>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Star size={18} className="text-ink" strokeWidth={2.5} />} label="Monthly Points" value={totalEarned} bg="bg-primary" />
          <StatCard icon={<Target size={18} className="text-ink" strokeWidth={2.5} />} label="Avg Completion" value={`${avgPct}%`} bg="bg-secondary" />
          <StatCard icon={<Flame size={18} className="text-ink" strokeWidth={2.5} />} label="Day Streak" value={streak} bg="bg-accent" />
          <StatCard icon={<TrendingUp size={18} className="text-ink" strokeWidth={2.5} />} label="Best Day" value={bestDay ? `${bestDay.pct}%` : '—'} bg="bg-sage" />
        </div>

        {/* Bar chart */}
        <div className="rounded-3xl border-[3px] border-ink bg-card p-4 shadow-sticker-lg">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-3">
            Last 14 Days
          </p>
          <div className="relative flex items-end gap-1.5" style={{ height: 140 }}>
            {hoveredBar && (
              <div
                className="absolute -top-10 rounded-xl border-[3px] border-ink bg-card px-2.5 py-1 text-xs pointer-events-none z-10 -translate-x-1/2 shadow-sticker-sm"
                style={{ left: hoveredBar.x }}
              >
                <p className="font-display font-black text-ink leading-none">{hoveredBar.pct}%</p>
                <p className="font-mono text-[9px] font-bold text-ink/60 mt-0.5">{hoveredBar.earned}/{hoveredBar.possible}</p>
              </div>
            )}
            {chartData.map((d, i) => {
              const barH = d.possible > 0 ? Math.max(8, Math.round((d.pct / 100) * 100)) : 0
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1.5"
                  style={{ height: '100%' }}
                  onMouseEnter={e => {
                    if (d.possible === 0) return
                    const rect = e.currentTarget.getBoundingClientRect()
                    const parentRect = e.currentTarget.parentElement.getBoundingClientRect()
                    setHoveredBar({ ...d, x: rect.left - parentRect.left + rect.width / 2 })
                  }}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  <div className="flex-1 flex items-end w-full">
                    <div
                      className="w-full rounded-t-lg border-[3px] border-ink transition-all"
                      style={{
                        height: `${barH}%`,
                        backgroundColor: d.possible > 0 ? scoreColor(d.pct) : 'transparent',
                        borderColor: d.possible > 0 ? 'oklch(0.15 0 0)' : 'transparent',
                      }}
                    />
                  </div>
                  <span className="font-mono text-[9px] font-bold uppercase text-ink/50">{d.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Calendar */}
        <div className="rounded-3xl border-[3px] border-ink bg-card p-4 shadow-sticker">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setViewMonth(m => subMonths(m, 1))}
              className="flex size-9 items-center justify-center rounded-xl border-[3px] border-ink bg-background active:translate-y-0.5 transition-all"
              aria-label="Previous month"
            >
              <ChevronLeft size={16} className="text-ink" strokeWidth={2.5} />
            </button>
            <p className="font-display text-base font-black text-ink">{format(viewMonth, 'MMMM yyyy')}</p>
            <button
              onClick={() => setViewMonth(m => addMonths(m, 1))}
              disabled={isSameMonth(viewMonth, new Date())}
              className="flex size-9 items-center justify-center rounded-xl border-[3px] border-ink bg-background active:translate-y-0.5 transition-all disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight size={16} className="text-ink" strokeWidth={2.5} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1.5">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center font-mono text-[10px] font-bold text-ink/50">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: days[0].getDay() }).map((_, i) => (
              <div key={`e${i}`} />
            ))}

            {dayData.map(({ day, dateStr, pct, possible }) => {
              const isSelected = selectedDay === dateStr
              const todayFlag = isToday(day)
              const hasTasks = possible > 0

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`aspect-square flex items-center justify-center rounded-lg font-display text-sm font-black transition-all border-2 ${
                    isSelected ? 'border-ink shadow-sticker-sm' : todayFlag ? 'border-ink/40' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: hasTasks ? scoreColor(pct) : 'transparent' }}
                >
                  <span className={hasTasks ? 'text-ink' : 'text-ink/40'}>
                    {format(day, 'd')}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && (() => {
            const d = dayData.find(d => d.dateStr === selectedDay)
            if (!d) return null
            return (
              <div className={`mt-3 rounded-2xl border-[3px] border-ink px-4 py-3 ${scoreBg(d.pct)}`}>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
                  {format(new Date(selectedDay + 'T12:00'), 'MMMM d, yyyy')}
                </p>
                <p className="font-display text-xl font-black text-ink mt-0.5">
                  {d.earned} / {d.possible} pts · {d.pct}%
                </p>
              </div>
            )
          })()}

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 font-mono text-[10px] font-bold uppercase text-ink/50">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-ink bg-sage inline-block"/>≥80%</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-ink bg-accent inline-block"/>50–79</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm border border-ink bg-destructive inline-block"/>&lt;50</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, bg }) {
  return (
    <div className={`rounded-2xl border-[3px] border-ink p-3 shadow-sticker ${bg}`}>
      <div className="flex size-9 items-center justify-center rounded-xl border-2 border-ink bg-card mb-2">
        {icon}
      </div>
      <p className="font-display text-2xl font-black text-ink leading-none">{value}</p>
      <p className="font-mono mt-1 text-[9px] font-bold uppercase tracking-widest text-ink/70">{label}</p>
    </div>
  )
}
