import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Play, Square, Trash2, Plus, X, BarChart2, ChevronLeft } from 'lucide-react'
import { useActivities, formatDuration } from '../hooks/useActivities'

const COLORS = [
  '#6366f1', '#ec4899', '#22c55e', '#f59e0b',
  '#ef4444', '#06b6d4', '#8b5cf6', '#f97316',
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
    // Pick next unused color
    const usedColors = [...added.map(a => a.color), color]
    const nextColor = COLORS.find(c => !usedColors.includes(c)) || COLORS[(usedColors.length) % COLORS.length]
    setColor(nextColor)
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl border border-white/5 p-6 pb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Add Activities</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
        </div>

        {/* Already added */}
        {added.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {added.map((a, i) => (
              <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 text-xs text-gray-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
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
            className="w-full bg-[#252525] text-white rounded-xl px-4 py-3 text-sm outline-none border border-white/5 focus:border-indigo-500 transition-colors"
            placeholder="Activity name (e.g. Writing)"
          />
          <div>
            <label className="text-xs text-gray-400 mb-2 block">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a]' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding…' : 'Add'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 bg-[#252525] hover:bg-[#2a2a2a] text-gray-300 font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              Done
            </button>
          </div>
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
      className="active-pulse mx-5 mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl border overflow-hidden relative"
      style={{
        backgroundColor: activity.color + '15',
        borderColor: activity.color + '40',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `linear-gradient(to right, ${activity.color}15, transparent)`
      }} />
      <span className="w-3 h-3 rounded-full flex-shrink-0 z-10" style={{ backgroundColor: activity.color }} />
      <div className="flex-1 z-10">
        <p className="text-sm font-semibold text-white">{activity.name}</p>
        <p className="text-2xl font-black text-white tabular-nums leading-tight">{timeStr}</p>
      </div>
      <button
        onClick={onStop}
        className="z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        style={{ backgroundColor: activity.color + '30' }}
      >
        <Square size={18} fill="white" className="text-white" />
      </button>
    </div>
  )
}

function ActivityRings({ summary }) {
  const GOAL_SECONDS = 7200 // 2 hour goal per ring
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
      <p className="text-xs text-gray-400 mb-2">Activity Rings</p>
      <div className="flex items-center justify-center gap-5 bg-[#141414] rounded-2xl border border-white/5 p-5">
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
                  fill="none" stroke={ring.color + '20'}
                  strokeWidth={strokeWidth} strokeLinecap="round"
                />
                {progress > 0.005 && (
                  <path
                    d={describeArc(radius, 0, angle)}
                    fill="none" stroke={ring.color}
                    strokeWidth={strokeWidth} strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 6px ${ring.color}60)` }}
                  />
                )}
                {progress > 0.01 && (
                  <circle
                    cx={center + radius * Math.cos(angle - Math.PI / 2)}
                    cy={center + radius * Math.sin(angle - Math.PI / 2)}
                    r={strokeWidth / 2} fill={ring.color}
                    style={{ filter: `drop-shadow(0 0 4px ${ring.color}80)` }}
                  />
                )}
              </g>
            )
          })}
          <text x={center} y={center - 8} textAnchor="middle" className="fill-white text-lg font-bold" fontSize="18">
            {formatDuration(totalSecs)}
          </text>
          <text x={center} y={center + 10} textAnchor="middle" className="fill-gray-500" fontSize="9">
            total today
          </text>
        </svg>

        <div className="flex flex-col gap-2">
          {rings.map(ring => {
            const pct = Math.round(Math.min(ring.totalSeconds / GOAL_SECONDS, 1) * 100)
            return (
              <div key={ring.activityId} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: ring.color }} />
                <div>
                  <p className="text-[11px] text-white font-medium leading-tight">{ring.name}</p>
                  <p className="text-[9px] text-gray-500">{formatDuration(ring.totalSeconds)} · {pct}%</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AnalyzeView({ summary, onBack }) {
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)
  const elapsedSecs = (now - dayStart) / 1000

  const totalTracked = summary.reduce((s, a) => s + a.totalSeconds, 0)
  const untrackedSecs = Math.max(0, elapsedSecs - totalTracked)
  const totalSecs = totalTracked + untrackedSecs

  // Pie chart
  const size = 200
  const center = size / 2
  const radius = 85

  const slices = [
    ...summary.map(s => ({ label: s.name, secs: s.totalSeconds, color: s.color })),
    ...(untrackedSecs > 1 ? [{ label: 'Untracked', secs: untrackedSecs, color: '#333333' }] : []),
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

  // Bar chart data — each activity as horizontal bar relative to longest
  const maxSecs = Math.max(...summary.map(s => s.totalSeconds), 1)

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors -ml-1">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Analyze</h1>
          <p className="text-xs text-gray-500">{format(now, 'EEEE, MMMM d')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Pie chart */}
        <div className="mx-5 mt-2">
          <p className="text-xs text-gray-400 mb-2">Day Breakdown</p>
          <div className="flex flex-col items-center bg-[#141414] rounded-2xl border border-white/5 p-5">
            {totalSecs > 0 && (
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {paths.map((p, i) => (
                  <path
                    key={i}
                    d={p.path}
                    fill={p.color}
                    style={p.label !== 'Untracked' ? { filter: `drop-shadow(0 0 4px ${p.color}50)` } : {}}
                  />
                ))}
                <circle cx={center} cy={center} r={innerR - 2} fill="#141414" />
                <text x={center} y={center - 6} textAnchor="middle" className="fill-white font-bold" fontSize="16">
                  {Math.round((totalTracked / totalSecs) * 100)}%
                </text>
                <text x={center} y={center + 10} textAnchor="middle" className="fill-gray-500" fontSize="9">
                  tracked
                </text>
              </svg>
            )}

            {/* Legend */}
            <div className="w-full mt-3 space-y-1.5">
              {slices.filter(s => s.secs > 0).map((item, i) => {
                const pct = totalSecs > 0 ? ((item.secs / totalSecs) * 100).toFixed(1) : 0
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-[11px] text-gray-300 flex-1">{item.label}</span>
                    <span className="text-[10px] text-gray-500 tabular-nums">{pct}%</span>
                    <span className="text-[11px] font-semibold text-white tabular-nums">{formatDuration(item.secs)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Horizontal bar chart */}
        {summary.length > 0 && (
          <div className="mx-5 mt-4">
            <p className="text-xs text-gray-400 mb-2">Time Comparison</p>
            <div className="bg-[#141414] rounded-2xl border border-white/5 p-4 space-y-3">
              {summary.map(item => (
                <div key={item.activityId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-300">{item.name}</span>
                    <span className="text-[11px] font-semibold text-white tabular-nums">{formatDuration(item.totalSeconds)}</span>
                  </div>
                  <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.max(2, (item.totalSeconds / maxSecs) * 100)}%`,
                        backgroundColor: item.color,
                        boxShadow: `0 0 8px ${item.color}40`,
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
          <p className="text-xs text-gray-400 mb-2">Stats</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#141414] rounded-xl border border-white/5 p-3">
              <p className="text-[10px] text-gray-500">Total Tracked</p>
              <p className="text-sm font-bold text-white">{formatDuration(totalTracked)}</p>
            </div>
            <div className="bg-[#141414] rounded-xl border border-white/5 p-3">
              <p className="text-[10px] text-gray-500">Untracked</p>
              <p className="text-sm font-bold text-gray-400">{formatDuration(untrackedSecs)}</p>
            </div>
            <div className="bg-[#141414] rounded-xl border border-white/5 p-3">
              <p className="text-[10px] text-gray-500">Activities</p>
              <p className="text-sm font-bold text-white">{summary.length}</p>
            </div>
            <div className="bg-[#141414] rounded-xl border border-white/5 p-3">
              <p className="text-[10px] text-gray-500">Productivity</p>
              <p className="text-sm font-bold text-white">{totalSecs > 0 ? Math.round((totalTracked / totalSecs) * 100) : 0}%</p>
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
    addActivity, deleteActivity, startSession, stopSession,
    getTodaySessions, getTodaySummary,
  } = useActivities(user)

  const [showModal, setShowModal] = useState(false)
  const [view, setView] = useState('track') // 'track' | 'analyze'
  const [, setTick] = useState(0)

  // Tick every second for live updates
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const todaySessions = getTodaySessions()
  const summary = getTodaySummary()

  if (view === 'analyze') {
    return <AnalyzeView summary={summary} onBack={() => setView('track')} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-white">Activity</h1>
        <p className="text-xs text-gray-500">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
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
          <p className="text-xs text-gray-400 mb-2">Activities</p>
          {loading && activities.length === 0 && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="space-y-2">
            {activities.map(act => {
              const isActive = activeSessions.some(s => s.activity_id === act.id)
              const todaySecs = summary.find(s => s.activityId === act.id)?.totalSeconds || 0
              return (
                <div
                  key={act.id}
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-[#1a1a1a] border-white/10'
                      : 'bg-[#1a1a1a] border-white/5'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: act.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{act.name}</p>
                    {todaySecs > 0 && (
                      <p className="text-[10px] text-gray-500">{formatDuration(todaySecs)} today</p>
                    )}
                  </div>
                  {isActive ? (
                    <button
                      onClick={() => stopSession(act.id)}
                      className="p-1 transition-colors"
                      style={{ color: act.color }}
                    >
                      <Square size={16} fill="currentColor" />
                    </button>
                  ) : (
                    <button
                      onClick={() => startSession(act.id)}
                      className="text-gray-500 hover:text-white transition-colors p-1"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteActivity(act.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Today's summary */}
        {summary.length > 0 && (
          <div className="px-5 mt-4">
            <p className="text-xs text-gray-400 mb-2">Today's Summary</p>
            <div className="space-y-1.5">
              {summary.map(s => (
                <div key={s.activityId} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="text-xs text-gray-300 flex-1">{s.name}</span>
                  <span className="text-xs font-semibold text-white">{formatDuration(s.totalSeconds)}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                <span className="text-xs text-gray-500 flex-1">Total</span>
                <span className="text-xs font-bold text-white">
                  {formatDuration(summary.reduce((s, a) => s + a.totalSeconds, 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Activity rings */}
        <ActivityRings summary={summary} />

        {/* Analyze button */}
        {summary.length > 0 && (
          <div className="px-5 mt-4">
            <button
              onClick={() => setView('analyze')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#1a1a1a] hover:bg-[#222] border border-white/5 rounded-2xl text-sm font-medium text-gray-300 transition-colors"
            >
              <BarChart2 size={16} />
              Analyze Data
            </button>
          </div>
        )}

        {/* Empty state */}
        {activities.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <div className="w-14 h-14 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-3">
              <Play size={24} className="text-gray-600" />
            </div>
            <p className="text-sm text-gray-500">No activities yet</p>
            <p className="text-xs text-gray-700 mt-1">Add activities to track your time</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="absolute bottom-20 right-5 w-14 h-14 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/25 transition-colors z-20"
      >
        <Plus size={24} className="text-white" />
      </button>

      {showModal && (
        <AddActivityModal
          onClose={() => setShowModal(false)}
          onAdd={addActivity}
        />
      )}
    </div>
  )
}
