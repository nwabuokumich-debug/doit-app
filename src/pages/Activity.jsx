import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Play, Square, Trash2, Plus, X } from 'lucide-react'
import { useActivities, formatDuration } from '../hooks/useActivities'

const COLORS = [
  '#6366f1', '#ec4899', '#22c55e', '#f59e0b',
  '#ef4444', '#06b6d4', '#8b5cf6', '#f97316',
]

const HOUR_HEIGHT = 48
const TIMELINE_START = 6  // 6am
const TIMELINE_END = 24   // midnight
const TIMELINE_HOURS = TIMELINE_END - TIMELINE_START

function AddActivityModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onAdd({ name: name.trim(), color })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl border border-white/5 p-6 pb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New Activity</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
        </div>
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
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding…' : 'Add Activity'}
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

function DailyTimeline({ sessions, activities }) {
  const now = new Date()
  const actMap = Object.fromEntries(activities.map(a => [a.id, a]))

  const toY = (date) => {
    const d = new Date(date)
    const hours = d.getHours() + d.getMinutes() / 60 - TIMELINE_START
    return Math.max(0, Math.min(TIMELINE_HOURS, hours)) * HOUR_HEIGHT
  }

  return (
    <div className="mx-5 mt-4">
      <p className="text-xs text-gray-400 mb-2">Today's Timeline</p>
      <div className="relative overflow-y-auto rounded-xl bg-[#141414] border border-white/5" style={{ height: Math.min(TIMELINE_HOURS * HOUR_HEIGHT, 300) }}>
        <div className="relative" style={{ height: TIMELINE_HOURS * HOUR_HEIGHT, marginLeft: 40 }}>
          {/* Hour lines */}
          {Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => {
            const hour = TIMELINE_START + i
            return (
              <div key={hour} className="absolute left-0 right-0 border-t border-white/5" style={{ top: i * HOUR_HEIGHT }}>
                <span className="absolute text-[9px] text-gray-600" style={{ left: -38, top: -6 }}>
                  {hour === 0 ? '12am' : hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                </span>
              </div>
            )
          })}

          {/* Session blocks */}
          {sessions.map(s => {
            const act = actMap[s.activity_id]
            if (!act) return null
            const top = toY(s.started_at)
            const end = s.ended_at ? new Date(s.ended_at) : now
            const bottom = toY(end)
            const height = Math.max(4, bottom - top)
            return (
              <div
                key={s.id}
                className="absolute left-1 right-1 rounded-lg px-2 py-0.5 overflow-hidden"
                style={{
                  top,
                  height,
                  backgroundColor: act.color + '30',
                  borderLeft: `3px solid ${act.color}`,
                }}
              >
                {height > 16 && (
                  <p className="text-[10px] font-medium text-white truncate">{act.name}</p>
                )}
              </div>
            )
          })}

          {/* Now indicator */}
          {(() => {
            const nowHour = now.getHours() + now.getMinutes() / 60
            if (nowHour < TIMELINE_START || nowHour > TIMELINE_END) return null
            const top = (nowHour - TIMELINE_START) * HOUR_HEIGHT
            return (
              <div className="absolute left-0 right-0 z-10 pointer-events-none flex items-center" style={{ top }}>
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                <div className="flex-1 h-px bg-red-500" />
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default function ActivityPage({ user }) {
  const {
    activities, activeSession, loading,
    addActivity, deleteActivity, startSession, stopSession,
    getTodaySessions, getTodaySummary,
  } = useActivities(user)

  const [showModal, setShowModal] = useState(false)
  const [, setTick] = useState(0)

  // Tick every minute for summary updates
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  const todaySessions = getTodaySessions()
  const summary = getTodaySummary()
  const activeAct = activeSession ? activities.find(a => a.id === activeSession.activity_id) : null

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-white">Activity</h1>
        <p className="text-xs text-gray-500">{format(new Date(), 'EEEE, MMMM d')}</p>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Active session banner */}
        {activeSession && activeAct && (
          <ActiveBanner activity={activeAct} session={activeSession} onStop={stopSession} />
        )}

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
              const isActive = activeSession?.activity_id === act.id
              const todayMins = summary.find(s => s.activityId === act.id)?.totalMinutes || 0
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
                    {todayMins > 0 && (
                      <p className="text-[10px] text-gray-500">{formatDuration(todayMins)} today</p>
                    )}
                  </div>
                  {isActive ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
                      backgroundColor: act.color + '20',
                      color: act.color,
                    }}>
                      Running
                    </span>
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
                  <span className="text-xs font-semibold text-white">{formatDuration(s.totalMinutes)}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                <span className="text-xs text-gray-500 flex-1">Total</span>
                <span className="text-xs font-bold text-white">
                  {formatDuration(summary.reduce((s, a) => s + a.totalMinutes, 0))}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Daily timeline */}
        {todaySessions.length > 0 && (
          <DailyTimeline sessions={todaySessions} activities={activities} />
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
