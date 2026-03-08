import { useMemo, useState } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, subMonths, addMonths, isToday
} from 'date-fns'
import { ChevronLeft, ChevronRight, TrendingUp, Target, Flame, Star } from 'lucide-react'

function scoreColor(pct) {
  if (pct >= 80) return '#22c55e'
  if (pct >= 50) return '#eab308'
  if (pct > 0)  return '#ef4444'
  return '#1f2937'
}

function scoreBg(pct) {
  if (pct >= 80) return 'bg-green-500/20 text-green-400'
  if (pct >= 50) return 'bg-yellow-500/20 text-yellow-400'
  if (pct > 0)  return 'bg-red-500/20 text-red-400'
  return 'bg-white/5 text-gray-600'
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
    const d = subMonths(today, 0)
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
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-6 pb-6 space-y-5">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Star size={16} className="text-yellow-400" />} label="Monthly Points" value={totalEarned} />
          <StatCard icon={<Target size={16} className="text-indigo-400" />} label="Avg Completion" value={`${avgPct}%`} />
          <StatCard icon={<Flame size={16} className="text-orange-400" />} label="Day Streak" value={`${streak}🔥`} />
          <StatCard icon={<TrendingUp size={16} className="text-green-400" />} label="Best Day" value={bestDay ? `${bestDay.pct}%` : '—'} />
        </div>

        {/* Bar chart */}
        <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
          <p className="text-xs text-gray-400 mb-4 uppercase tracking-widest">Last 14 Days</p>
          <div className="relative flex items-end gap-1" style={{ height: 120 }}>
            {hoveredBar && (
              <div
                className="absolute -top-8 bg-[#252525] border border-white/10 rounded-xl px-3 py-1.5 text-xs pointer-events-none z-10 -translate-x-1/2"
                style={{ left: hoveredBar.x }}
              >
                <p className="font-semibold" style={{ color: scoreColor(hoveredBar.pct) }}>{hoveredBar.pct}%</p>
                <p className="text-gray-400">{hoveredBar.earned} / {hoveredBar.possible} pts</p>
              </div>
            )}
            {chartData.map((d, i) => {
              const barH = d.possible > 0 ? Math.max(6, Math.round((d.pct / 100) * 100)) : 0
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
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: barH,
                        backgroundColor: d.possible > 0 ? scoreColor(d.pct) : 'transparent',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-600 flex-shrink-0">{d.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setViewMonth(m => subMonths(m, 1))} className="text-gray-400 hover:text-white p-1">
              <ChevronLeft size={18} />
            </button>
            <p className="text-sm font-semibold text-white">{format(viewMonth, 'MMMM yyyy')}</p>
            <button
              onClick={() => setViewMonth(m => addMonths(m, 1))}
              disabled={isSameMonth(viewMonth, new Date())}
              className="text-gray-400 hover:text-white p-1 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {['S','M','T','W','T','F','S'].map((d, i) => (
              <div key={i} className="text-center text-xs text-gray-600 font-medium">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for first day of month */}
            {Array.from({ length: days[0].getDay() }).map((_, i) => (
              <div key={`e${i}`} />
            ))}

            {dayData.map(({ day, dateStr, pct, earned, possible }) => {
              const isSelected = selectedDay === dateStr
              const todayFlag = isToday(day)
              const hasTasks = possible > 0

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all relative ${
                    isSelected ? 'ring-2 ring-indigo-400' : ''
                  } ${todayFlag ? 'ring-1 ring-white/30' : ''}`}
                  style={{ backgroundColor: hasTasks ? scoreColor(pct) + '40' : 'transparent' }}
                >
                  <span className={hasTasks ? (pct >= 50 ? 'text-white' : 'text-red-300') : 'text-gray-600'}>
                    {format(day, 'd')}
                  </span>
                  {hasTasks && (
                    <span
                      className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: scoreColor(pct) }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Selected day detail */}
          {selectedDay && (() => {
            const d = dayData.find(d => d.dateStr === selectedDay)
            if (!d) return null
            return (
              <div className={`mt-4 rounded-xl px-4 py-3 ${scoreBg(d.pct)}`}>
                <p className="text-xs font-semibold">{format(new Date(selectedDay + 'T12:00'), 'MMMM d, yyyy')}</p>
                <p className="text-lg font-bold">{d.earned} / {d.possible} pts — {d.pct}%</p>
              </div>
            )
          })()}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-500/40 inline-block"/>≥80%</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-500/40 inline-block"/>50–79%</div>
            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-500/40 inline-block"/>&lt;50%</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 flex items-center gap-3">
      <div className="w-8 h-8 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-white">{value}</p>
      </div>
    </div>
  )
}
