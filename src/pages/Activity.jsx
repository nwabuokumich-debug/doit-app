import { useState, useEffect } from 'react'
import { format, subDays, addDays, isToday as dateFnsIsToday } from 'date-fns'
import { Play, Square, Trash2, Plus, X, BarChart2, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useActivities, formatDuration } from '../hooks/useActivities'

const COLORS = [
  '#f97316', '#ec4899', '#22c55e', '#6366f1',
  '#ef4444', '#06b6d4', '#8b5cf6', '#f59e0b',
  '#14b8a6', '#a855f7', '#f43f5e', '#84cc16',
  '#0ea5e9', '#d946ef', '#fb923c', '#2dd4bf',
  '#facc15', '#34d399', '#f87171',
]

function AddActivityModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState([])

  const handle = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onAdd({ name: name.trim(), color })
    setAdded(prev => [...prev, { name: name.trim(), color }])
    setName('')
    const usedColors = [...added.map(a => a.color), color]
    const nextColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[(usedColors.length) % COLORS.length]
    setColor(nextColor)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border-[3px] border-ink p-6 pb-8 shadow-sticker-lg">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-black text-ink">Add Activities</h2>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border-[3px] border-ink bg-background active:translate-y-0.5 transition-all"
            aria-label="Close"
          >
            <X size={16} className="text-ink" strokeWidth={2.5} />
          </button>
        </div>

        {added.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {added.map((a, i) => (
              <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-ink bg-card font-mono text-[10px] font-bold text-ink">
                <span className="w-2 h-2 rounded-full border border-ink" style={{ backgroundColor: a.color }} />
                {a.name}
              </span>
            ))}
          </div>
        )}

        <form onSubmit={handle} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            autoFocus
            className="w-full bg-background text-ink rounded-xl px-4 py-3 text-sm font-medium outline-none border-[3px] border-ink"
            placeholder="Activity name (e.g. Writing)"
          />
          <div>
            <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2 block">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-8 rounded-full border-2 border-ink transition-all ${color === c ? 'shadow-sticker-sm scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-primary border-[3px] border-ink text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-xl py-3 shadow-sticker active:translate-y-0.5 active:shadow-sticker-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-card border-[3px] border-ink text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-xl py-3 shadow-sticker-sm active:translate-y-0.5 active:shadow-none transition-all"
            >
              Done
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditTimeModal({ activity, dateStr, currentSeconds, onClose, onSave }) {
  const [hours, setHours] = useState(Math.floor(currentSeconds / 3600))
  const [minutes, setMinutes] = useState(Math.floor((currentSeconds % 3600) / 60))
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    await onSave(activity.id, hours, minutes, dateStr)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border-[3px] border-ink p-6 pb-8 shadow-sticker-lg">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full border-2 border-ink" style={{ backgroundColor: activity.color }} />
            <h2 className="font-display text-lg font-black text-ink">{activity.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border-[3px] border-ink bg-background active:translate-y-0.5 transition-all"
            aria-label="Close"
          >
            <X size={16} className="text-ink" strokeWidth={2.5} />
          </button>
        </div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-5">
          Total time for {format(new Date(dateStr + 'T12:00'), 'MMMM d')}
        </p>
        <form onSubmit={handle} className="space-y-5">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-1 block">Hours</label>
              <input
                type="number" min="0" max="23" value={hours}
                onChange={e => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                className="w-full bg-background text-ink text-center font-display text-2xl font-black rounded-xl px-4 py-3 outline-none border-[3px] border-ink"
              />
            </div>
            <div className="pb-3 font-display text-2xl font-black text-ink/40">:</div>
            <div className="flex-1">
              <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-1 block">Minutes</label>
              <input
                type="number" min="0" max="59" value={minutes}
                onChange={e => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-full bg-background text-ink text-center font-display text-2xl font-black rounded-xl px-4 py-3 outline-none border-[3px] border-ink"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary border-[3px] border-ink text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-xl py-3 shadow-sticker active:translate-y-0.5 active:shadow-sticker-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ActiveBanner({ activity, session, onStop }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const calc = () => setElapsed(Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000))
    calc()
    const interval = setInterval(calc, 1000)
    return () => clearInterval(interval)
  }, [session.started_at])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const timeStr = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`

  return (
    <div
      className="active-pulse mx-5 mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl border-[3px] border-ink shadow-sticker"
      style={{ backgroundColor: activity.color }}
    >
      <span className="size-3 rounded-full border-2 border-ink bg-card flex-shrink-0" />
      <div className="flex-1">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">{activity.name}</p>
        <p className="font-display text-2xl font-black text-ink tabular-nums leading-none">{timeStr}</p>
      </div>
      <button
        onClick={onStop}
        className="flex size-10 items-center justify-center rounded-xl border-[3px] border-ink bg-ink active:translate-y-0.5 transition-all"
        aria-label="Stop"
      >
        <Square size={16} fill="currentColor" className="text-background" />
      </button>
    </div>
  )
}

function ActivityRings({ summary }) {
  const GOAL_SECONDS = 7200
  const size = 200
  const center = size / 2
  const strokeWidth = 14
  const gap = 4

  const rings = summary.slice(0, 5)
  if (rings.length === 0) return null

  const totalSecs = summary.reduce((s, a) => s + a.totalSeconds, 0)

  const describeArc = (radius, startAngle, endAngle) => {
    const start = {
      x: center + radius * Math.cos(startAngle - Math.PI / 2),
      y: center + radius * Math.sin(startAngle - Math.PI / 2),
    }
    const end = {
      x: center + radius * Math.cos(endAngle - Math.PI / 2),
      y: center + radius * Math.sin(endAngle - Math.PI / 2),
    }
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  return (
    <div className="mx-5 mt-4">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">Activity Rings</p>
      <div className="flex items-center justify-center gap-5 rounded-3xl border-[3px] border-ink bg-card p-5 shadow-sticker-lg">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {rings.map((ring, i) => {
            const radius = center - strokeWidth / 2 - i * (strokeWidth + gap)
            if (radius < 20) return null
            const progress = Math.min(ring.totalSeconds / GOAL_SECONDS, 1)
            const angle = progress * 2 * Math.PI * 0.999

            return (
              <g key={ring.activityId}>
                <circle
                  cx={center} cy={center} r={radius}
                  fill="none" stroke={ring.color + '25'}
                  strokeWidth={strokeWidth} strokeLinecap="round"
                />
                {progress > 0.005 && (
                  <path
                    d={describeArc(radius, 0, angle)}
                    fill="none" stroke={ring.color}
                    strokeWidth={strokeWidth} strokeLinecap="round"
                  />
                )}
              </g>
            )
          })}
          <text x={center} y={center - 4} textAnchor="middle" fill="oklch(0.15 0 0)" fontSize="20" fontWeight="900" fontFamily="Fraunces">
            {formatDuration(totalSecs)}
          </text>
          <text x={center} y={center + 14} textAnchor="middle" fill="oklch(0.15 0 0 / 0.5)" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono">
            TOTAL TODAY
          </text>
        </svg>

        <div className="flex flex-col gap-2">
          {rings.map(ring => {
            const pct = Math.round(Math.min(ring.totalSeconds / GOAL_SECONDS, 1) * 100)
            return (
              <div key={ring.activityId} className="flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-ink flex-shrink-0" style={{ backgroundColor: ring.color }} />
                <div>
                  <p className="text-[11px] font-bold text-ink leading-tight">{ring.name}</p>
                  <p className="font-mono text-[9px] font-bold text-ink/50">{formatDuration(ring.totalSeconds)} · {pct}%</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AnalyzeView({ summary, onBack, selectedDate, onPrevDay, onNextDay }) {
  const isSelectedToday = dateFnsIsToday(selectedDate)
  const now = new Date()
  const dayStart = new Date(selectedDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = isSelectedToday ? now : new Date(selectedDate.getTime() + 86400000)
  const elapsedSecs = (dayEnd - dayStart) / 1000

  const totalTracked = summary.reduce((s, a) => s + a.totalSeconds, 0)
  const untrackedSecs = Math.max(0, elapsedSecs - totalTracked)
  const totalSecs = totalTracked + untrackedSecs

  const size = 200
  const center = size / 2
  const radius = 85

  const slices = [
    ...summary.map(s => ({ label: s.name, secs: s.totalSeconds, color: s.color })),
    ...(untrackedSecs > 1 ? [{ label: 'Untracked', secs: untrackedSecs, color: 'oklch(0.85 0.02 95)' }] : []),
  ]

  const donutPath = (r1, r2, startAngle, sweep) => {
    if (sweep >= Math.PI * 2 * 0.999) sweep = Math.PI * 2 * 0.999
    const endAngle = startAngle + sweep
    const large = sweep > Math.PI ? 1 : 0
    const cos1 = Math.cos(startAngle), sin1 = Math.sin(startAngle)
    const cos2 = Math.cos(endAngle), sin2 = Math.sin(endAngle)
    return [
      `M ${center + r2 * cos1} ${center + r2 * sin1}`,
      `A ${r2} ${r2} 0 ${large} 1 ${center + r2 * cos2} ${center + r2 * sin2}`,
      `L ${center + r1 * cos2} ${center + r1 * sin2}`,
      `A ${r1} ${r1} 0 ${large} 0 ${center + r1 * cos1} ${center + r1 * sin1}`,
      'Z',
    ].join(' ')
  }

  let angle = -Math.PI / 2
  const GAP = 0.03
  const innerR = 52

  const paths = slices.map((slice, i) => {
    const sweep = totalSecs > 0 ? (slice.secs / totalSecs) * Math.PI * 2 : 0
    if (sweep < 0.002) { angle += sweep; return null }
    const path = donutPath(innerR, radius, angle + GAP / 2, Math.max(0, sweep - GAP))
    angle += sweep
    return { ...slice, path }
  }).filter(Boolean)

  const maxSecs = Math.max(...summary.map(s => s.totalSeconds), 1)

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-5 pt-5 pb-2 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex size-10 items-center justify-center rounded-xl border-[3px] border-ink bg-card shadow-sticker-sm active:translate-y-0.5 transition-all"
          aria-label="Back"
        >
          <ChevronLeft size={18} className="text-ink" strokeWidth={2.5} />
        </button>
        <div className="flex-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60 font-bold">Analyze</p>
          <h1 className="font-display text-xl font-black text-ink leading-none">Breakdown</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onPrevDay} className="flex size-8 items-center justify-center rounded-lg border-2 border-ink bg-card active:translate-y-0.5 transition-all">
            <ChevronLeft size={14} className="text-ink" strokeWidth={2.5} />
          </button>
          <span className="font-mono text-[10px] font-bold uppercase text-ink min-w-[68px] text-center">
            {isSelectedToday ? 'Today' : format(selectedDate, 'MMM d')}
          </span>
          <button
            onClick={onNextDay}
            disabled={isSelectedToday}
            className="flex size-8 items-center justify-center rounded-lg border-2 border-ink bg-card active:translate-y-0.5 transition-all disabled:opacity-30"
          >
            <ChevronRight size={14} className="text-ink" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Pie chart */}
        <div className="mx-5 mt-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">
            {isSelectedToday ? "Today's Breakdown" : format(selectedDate, 'EEEE, MMM d')}
          </p>
          <div className="flex flex-col items-center rounded-3xl border-[3px] border-ink bg-card p-5 shadow-sticker-lg">
            {totalSecs > 0 && (
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {paths.map((p, i) => (
                  <path key={i} d={p.path} fill={p.color} stroke="oklch(0.15 0 0)" strokeWidth="2" />
                ))}
                <circle cx={center} cy={center} r={innerR - 2} fill="oklch(1 0 0)" />
                <text x={center} y={center - 2} textAnchor="middle" fill="oklch(0.15 0 0)" fontSize="20" fontWeight="900" fontFamily="Fraunces">
                  {Math.round((totalTracked / totalSecs) * 100)}%
                </text>
                <text x={center} y={center + 14} textAnchor="middle" fill="oklch(0.15 0 0 / 0.5)" fontSize="9" fontWeight="700" fontFamily="JetBrains Mono">
                  TRACKED
                </text>
              </svg>
            )}

            <div className="w-full mt-3 space-y-1.5">
              {slices.filter(s => s.secs > 0).map((item, i) => {
                const pct = totalSecs > 0 ? ((item.secs / totalSecs) * 100).toFixed(1) : 0
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full border border-ink flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] font-bold text-ink flex-1">{item.label}</span>
                    <span className="font-mono text-[10px] font-bold text-ink/50 tabular-nums">{pct}%</span>
                    <span className="font-mono text-[11px] font-bold text-ink tabular-nums">{formatDuration(item.secs)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Horizontal bar chart */}
        {summary.length > 0 && (
          <div className="mx-5 mt-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">Time Comparison</p>
            <div className="rounded-3xl border-[3px] border-ink bg-card p-4 shadow-sticker space-y-3">
              {summary.map(item => (
                <div key={item.activityId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-ink">{item.name}</span>
                    <span className="font-mono text-[11px] font-bold text-ink tabular-nums">{formatDuration(item.totalSeconds)}</span>
                  </div>
                  <div className="h-3 bg-background border-2 border-ink rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(2, (item.totalSeconds / maxSecs) * 100)}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mx-5 mt-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">Stats</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border-[3px] border-ink bg-primary p-3 shadow-sticker-sm">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/70">Tracked</p>
              <p className="font-display text-lg font-black text-ink leading-none mt-1">{formatDuration(totalTracked)}</p>
            </div>
            <div className="rounded-2xl border-[3px] border-ink bg-card p-3 shadow-sticker-sm">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/60">Untracked</p>
              <p className="font-display text-lg font-black text-ink/60 leading-none mt-1">{formatDuration(untrackedSecs)}</p>
            </div>
            <div className="rounded-2xl border-[3px] border-ink bg-secondary p-3 shadow-sticker-sm">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/70">Activities</p>
              <p className="font-display text-lg font-black text-ink leading-none mt-1">{summary.length}</p>
            </div>
            <div className="rounded-2xl border-[3px] border-ink bg-sage p-3 shadow-sticker-sm">
              <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/70">Productivity</p>
              <p className="font-display text-lg font-black text-ink leading-none mt-1">{totalSecs > 0 ? Math.round((totalTracked / totalSecs) * 100) : 0}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ActivityPage({ user }) {
  const {
    activities, activeSessions, loading,
    addActivity, deleteActivity, startSession, stopSession, setActivityTime,
    getTodaySessions, getTodaySummary, getSummaryForDate,
  } = useActivities(user)

  const [showModal, setShowModal] = useState(false)
  const [manualActivity, setManualActivity] = useState(null)
  const [view, setView] = useState('track')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const summary = getTodaySummary()
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const analyzeSummary = getSummaryForDate(selectedDateStr)

  const handlePrevDay = () => setSelectedDate(d => subDays(d, 1))
  const handleNextDay = () => {
    if (!dateFnsIsToday(selectedDate)) setSelectedDate(d => addDays(d, 1))
  }

  if (view === 'analyze') {
    return (
      <AnalyzeView
        summary={analyzeSummary}
        onBack={() => setView('track')}
        selectedDate={selectedDate}
        onPrevDay={handlePrevDay}
        onNextDay={handleNextDay}
      />
    )
  }

  return (
    <div className="flex flex-col h-full relative bg-background">
      <div className="px-5 pt-5 pb-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60 font-bold">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        <h1 className="font-display text-2xl font-black text-ink leading-none">Activity</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Active session banners */}
        {activeSessions.map(session => {
          const act = activities.find(a => a.id === session.activity_id)
          if (!act) return null
          return (
            <ActiveBanner key={session.id} activity={act} session={session} onStop={() => stopSession(act.id)} />
          )
        })}

        {/* Activities list */}
        <div className="px-5 mt-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">Activities</p>
          {loading && activities.length === 0 && (
            <div className="flex justify-center py-8">
              <div className="size-8 border-[3px] border-ink border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="space-y-2.5">
            {activities.map(act => {
              const isActive = activeSessions.some(s => s.activity_id === act.id)
              const todaySecs = summary.find(s => s.activityId === act.id)?.totalSeconds || 0
              return (
                <div
                  key={act.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-[3px] border-ink transition-all ${
                    isActive ? 'bg-accent shadow-sticker' : 'bg-card shadow-sticker-sm'
                  }`}
                >
                  <span className="size-10 rounded-xl border-[3px] border-ink flex-shrink-0" style={{ backgroundColor: act.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{act.name}</p>
                    {todaySecs > 0 && (
                      <p className="font-mono text-[10px] font-bold text-ink/60">{formatDuration(todaySecs)} today</p>
                    )}
                  </div>
                  {isActive ? (
                    <button
                      onClick={() => stopSession(act.id)}
                      className="flex size-9 items-center justify-center rounded-xl border-2 border-ink bg-ink active:translate-y-0.5 transition-all"
                      aria-label="Stop"
                    >
                      <Square size={14} fill="currentColor" className="text-background" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startSession(act.id)}
                      className="flex size-9 items-center justify-center rounded-xl border-2 border-ink bg-primary active:translate-y-0.5 transition-all"
                      aria-label="Start"
                    >
                      <Play size={14} fill="currentColor" className="text-ink" />
                    </button>
                  )}
                  <button
                    onClick={() => setManualActivity(act)}
                    className="text-ink/40 hover:text-ink transition-colors p-1"
                    aria-label="Edit time"
                  >
                    <Clock size={14} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => deleteActivity(act.id)}
                    className="text-ink/40 hover:text-destructive transition-colors p-1"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} strokeWidth={2.5} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Today's summary */}
        {summary.length > 0 && (
          <div className="px-5 mt-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2">Today's Summary</p>
            <div className="rounded-2xl border-[3px] border-ink bg-card p-3 shadow-sticker space-y-1.5">
              {summary.map(s => (
                <div key={s.activityId} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full border border-ink flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs font-bold text-ink flex-1">{s.name}</span>
                  <span className="font-mono text-xs font-bold text-ink tabular-nums">{formatDuration(s.totalSeconds)}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t-2 border-ink/15">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 flex-1">Total</span>
                <span className="font-display text-base font-black text-ink">
                  {formatDuration(summary.reduce((s, a) => s + a.totalSeconds, 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Activity rings */}
        <ActivityRings summary={summary} />

        {/* Analyze button */}
        <div className="px-5 mt-4">
          <button
            onClick={() => setView('analyze')}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-[3px] border-ink bg-secondary text-ink font-mono text-xs font-bold uppercase tracking-widest shadow-sticker active:translate-y-0.5 active:shadow-sticker-sm transition-all"
          >
            <BarChart2 size={16} strokeWidth={2.5} />
            Analyze Data
          </button>
        </div>

        {/* Empty state */}
        {activities.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <div className="size-16 rounded-2xl border-[3px] border-dashed border-ink/40 bg-card flex items-center justify-center mb-3">
              <Play size={24} className="text-ink/40" strokeWidth={2.5} />
            </div>
            <p className="font-display text-lg font-black text-ink">No activities yet</p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50 mt-1">
              Tap + to add one
            </p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed size-14 bg-primary border-[3px] border-ink rounded-full shadow-sticker flex items-center justify-center active:translate-y-0.5 active:shadow-sticker-sm transition-all z-40"
        style={{
          bottom: 'calc(96px + max(14px, env(safe-area-inset-bottom)))',
          right: 'max(20px, calc(50vw - 204px))',
        }}
        aria-label="Add activity"
      >
        <Plus size={26} className="text-ink" strokeWidth={3} />
      </button>

      {showModal && (
        <AddActivityModal
          onClose={() => setShowModal(false)}
          onAdd={addActivity}
        />
      )}

      {manualActivity && (
        <EditTimeModal
          activity={manualActivity}
          dateStr={format(new Date(), 'yyyy-MM-dd')}
          currentSeconds={summary.find(s => s.activityId === manualActivity.id)?.totalSeconds || 0}
          onClose={() => setManualActivity(null)}
          onSave={setActivityTime}
        />
      )}
    </div>
  )
}
