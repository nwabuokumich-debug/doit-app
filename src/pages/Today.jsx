import { useRef, useState, useEffect, useCallback } from 'react'
import {
  format, addDays, subDays, isToday, isTomorrow, isYesterday, isBefore, startOfDay,
  startOfWeek, eachDayOfInterval, endOfWeek, isSameDay
} from 'date-fns'
import { Plus, Zap, ChevronLeft, ChevronRight, CalendarDays, LayoutList, Clock3, Flame } from 'lucide-react'

// Combo tier windows based on latest completed task's points
function getTierWindow(pts) {
  if (pts >= 10) return 2 * 60 * 60 * 1000  // 2 hrs — Heavy (Major/Grand/Epic)
  if (pts >= 4)  return 45 * 60 * 1000       // 45 min — Medium (Normal/Solid)
  return 5 * 60 * 1000                        // 5 min  — Light (Light/Basic)
}

function getComboFactor(timeSinceLastMs, maxPts) {
  const m = timeSinceLastMs / 60000
  if (maxPts >= 10) {
    if (m <= 30)  return 0.50
    if (m <= 60)  return 0.30
    if (m <= 120) return 0.15
    return 0
  }
  if (maxPts >= 4) {
    if (m <= 15) return 0.30
    if (m <= 45) return 0.15
    return 0
  }
  return m <= 5 ? 'flat' : 0
}

function formatCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}
import TaskItem from '../components/TaskItem'
import AddTaskModal from '../components/AddTaskModal'
import CalendarPicker from '../components/CalendarPicker'
import Timeline from './Timeline'

function dayLabel(date) {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d')
}

export default function Today({ selectedDate, onDateChange, getTasksForDate, getDailyScore, onAdd, onComplete, onUncomplete, onDelete, onUpdate }) {
  const [showModal, setShowModal] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)
  const [view, setView] = useState('tasks') // 'tasks' | 'timeline'
  const [headerCollapsed, setHeaderCollapsed] = useState(false)

  // Tick every second for live combo countdown
  const [comboTick, setComboTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setComboTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const isPast = isBefore(startOfDay(selectedDate), startOfDay(new Date()))
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const dayTasks = getTasksForDate(dateStr)
  const score = getDailyScore(dateStr)

  const netEarned = Math.max(0, score.earned - (score.deducted || 0))
  const pct = score.possible > 0 ? Math.round((netEarned / score.possible) * 100) : 0
  const isPerfect = pct === 100 && score.possible > 0

  const prevEarned = useRef(score.earned)
  const [scoreAnim, setScoreAnim] = useState(false)
  useEffect(() => {
    if (score.earned > prevEarned.current) {
      setScoreAnim(true)
      setTimeout(() => setScoreAnim(false), 500)
    }
    prevEarned.current = score.earned
  }, [score.earned])

  // Compute live combo state from task data
  const getComboState = () => {
    void comboTick // reactive on tick
    const sorted = [...dayTasks.filter(t => t.completed && t.completed_at)]
      .sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at))
    if (sorted.length === 0) return null
    const latest = sorted[0]
    const timeSinceLatest = Date.now() - new Date(latest.completed_at).getTime()
    const window = getTierWindow(latest.points)
    if (timeSinceLatest >= window) return null
    const inWindow = sorted.filter(t => Date.now() - new Date(t.completed_at).getTime() < window)
    const msRemaining = window - timeSinceLatest
    const progress = msRemaining / window // 1.0 = fresh, 0.0 = expired
    return { chainCount: inWindow.length, msRemaining, progress }
  }
  const combo = getComboState()

  const handleComplete = useCallback(async (taskId) => {
    const allTasks = getTasksForDate(format(selectedDate, 'yyyy-MM-dd'))
    const currentTask = allTasks.find(t => t.id === taskId)
    const prev = allTasks
      .filter(t => t.completed && t.completed_at && t.id !== taskId)
      .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))

    let bonus = 0
    if (prev.length > 0 && currentTask) {
      const latest = prev[prev.length - 1]
      const timeSinceLastMs = Date.now() - new Date(latest.completed_at).getTime()
      const window = getTierWindow(latest.points)
      if (timeSinceLastMs < window) {
        const inWindow = prev.filter(t => Date.now() - new Date(t.completed_at).getTime() < window)
        const chainBonus = Math.max(0, inWindow.length - 1)
        const factor = getComboFactor(timeSinceLastMs, currentTask.points)
        if (factor === 'flat') {
          bonus = 1
        } else if (factor > 0) {
          bonus = Math.max(0, Math.round(currentTask.points * factor) + chainBonus)
        }
      }
    }
    return onComplete(taskId, bonus)
  }, [getTasksForDate, selectedDate, onComplete])

  const handleUncomplete = useCallback(async (taskId) => {
    const allTasks = getTasksForDate(format(selectedDate, 'yyyy-MM-dd'))
    const sortedCompleted = allTasks
      .filter(t => t.completed && t.completed_at)
      .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))

    const idx = sortedCompleted.findIndex(t => t.id === taskId)
    const taskBefore = idx > 0 ? sortedCompleted[idx - 1] : null
    const taskAfter  = idx >= 0 && idx < sortedCompleted.length - 1 ? sortedCompleted[idx + 1] : null

    // Uncomplete the task first
    await onUncomplete(taskId)

    // Recalculate the bonus for the task that came after the uncompleted one
    if (taskAfter) {
      let newBonus = 0
      if (taskBefore) {
        const gap = new Date(taskAfter.completed_at).getTime() - new Date(taskBefore.completed_at).getTime()
        const window = getTierWindow(taskBefore.points)
        if (gap < window) {
          const factor = getComboFactor(gap, taskAfter.points)
          // Count tasks still in window between taskBefore and taskAfter (excluding removed)
          const between = sortedCompleted.filter(t =>
            t.id !== taskId &&
            new Date(t.completed_at) > new Date(taskBefore.completed_at) &&
            new Date(t.completed_at) < new Date(taskAfter.completed_at)
          )
          if (factor === 'flat') newBonus = 1
          else if (factor > 0) {
            const chainBonus = Math.max(0, between.length - 1)
            newBonus = Math.max(0, Math.round(taskAfter.points * factor) + chainBonus)
          }
        }
      }
      await onUpdate(taskAfter.id, { bonus_points: newBonus })
    }
  }, [getTasksForDate, selectedDate, onUncomplete, onUpdate])

  const sortByPriority = arr => [...arr].sort((a, b) => b.points - a.points)
  const completed = sortByPriority(dayTasks.filter(t => t.completed))
  const pending = sortByPriority(dayTasks.filter(t => !t.completed))

  // Week strip: 7 days centred on selected date
  const weekStart = startOfWeek(selectedDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) })

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500 uppercase tracking-widest">{format(selectedDate, 'MMMM yyyy')}</p>
          <button onClick={() => setShowCalendar(true)} className="text-gray-400 hover:text-white transition-colors">
            <CalendarDays size={18} />
          </button>
        </div>

        {/* Day nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => onDateChange(subDays(selectedDate, 1))} className="text-gray-400 hover:text-white p-1 -ml-1">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-xl font-bold text-white">{dayLabel(selectedDate)}</h1>
          <button onClick={() => onDateChange(addDays(selectedDate, 1))} className="text-gray-400 hover:text-white p-1 -mr-1">
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Week strip — slim pills */}
        <div className="flex gap-1 mt-2">
          {weekDays.map(day => {
            const isSelected = isSameDay(day, selectedDate)
            const todayFlag = isToday(day)
            const isPastDay = isBefore(startOfDay(day), startOfDay(new Date()))
            const { earned, possible } = getDailyScore(format(day, 'yyyy-MM-dd'))
            const hasTasks = possible > 0
            const pctDay = hasTasks ? (earned / possible) * 100 : 0

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateChange(day)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg transition-all ${
                  isSelected && isPastDay ? 'bg-white/10' :
                  isSelected             ? 'bg-indigo-500' :
                  todayFlag              ? 'bg-white/10' :
                  isPastDay              ? 'bg-[#141414]' : 'bg-[#1a1a1a]'
                }`}
              >
                <span className={`text-xs font-semibold ${
                  isSelected ? 'text-white' : isPastDay ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {format(day, 'EEE')[0]}{format(day, 'd')}
                </span>
                {hasTasks && (
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.7)' :
                      pctDay >= 80 ? '#22c55e' : pctDay >= 50 ? '#eab308' : '#ef4444'
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Collapsible section */}
        <div className={`overflow-hidden transition-all duration-300 ${headerCollapsed ? 'max-h-0' : 'max-h-80'}`}>
          {/* Combo banner */}
          {combo && (() => {
            const p = combo.progress
            const color = p > 0.66 ? '#f97316' : p > 0.33 ? '#eab308' : '#6b7280'
            const bgColor = p > 0.66 ? 'rgba(249,115,22,0.08)' : p > 0.33 ? 'rgba(234,179,8,0.06)' : 'rgba(107,114,128,0.05)'
            const borderColor = p > 0.66 ? 'rgba(249,115,22,0.35)' : p > 0.33 ? 'rgba(234,179,8,0.25)' : 'rgba(107,114,128,0.15)'
            return (
              <div
                className="mt-3 flex items-center gap-3 px-4 py-3 rounded-2xl overflow-hidden relative transition-all duration-1000"
                style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}`, opacity: Math.max(0.45, p) }}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to right, ${color}12, transparent)` }} />
                {/* Chain count */}
                <div className="flex flex-col items-center flex-shrink-0 z-10">
                  <span className="text-2xl font-black leading-none" style={{ color }}>{combo.chainCount}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>streak</span>
                </div>
                <div className="w-px h-8 flex-shrink-0 z-10" style={{ backgroundColor: `${color}40` }} />
                {/* Labels */}
                <div className="flex flex-col z-10 flex-1">
                  <span className="text-xs font-black tracking-widest uppercase leading-tight" style={{ color }}>
                    {p > 0.66 ? 'On Fire!' : p > 0.33 ? 'Fading…' : 'Dying out…'}
                  </span>
                  <span className="text-[10px] text-gray-500 mt-0.5">Expires in {formatCountdown(combo.msRemaining)}</span>
                </div>
                {/* Progress bar */}
                <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden z-10">
                  <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${p * 100}%`, backgroundColor: color }} />
                </div>
              </div>
            )
          })()}

          {/* Score bar — compact */}
          <div className={`mt-3 rounded-xl px-4 py-2.5 border transition-all duration-500 ${
            isPerfect
              ? 'bg-gradient-to-br from-yellow-500/20 to-amber-500/10 border-yellow-500/30 perfect-pulse'
              : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border-indigo-500/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className="flex items-baseline gap-1 flex-shrink-0">
                <span className={`text-xl font-bold text-white ${scoreAnim ? 'score-pop' : ''}`}>
                  {netEarned}
                </span>
                <span className="text-gray-500 text-xs">/ {score.possible}</span>
                {score.deducted > 0 && (
                  <span className="text-xs font-semibold text-red-400 ml-0.5">-{score.deducted}</span>
                )}
              </div>
              <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPerfect
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                      : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isPerfect ? (
                  <span className="badge-pop text-xs font-extrabold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 tracking-wide">
                    PERFECT
                  </span>
                ) : (
                  <>
                    <Zap size={12} className="text-yellow-400" />
                    <span className="text-sm font-bold text-yellow-400">{pct}%</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>{completed.length} done · {isPast ? 'sealed' : `${pending.length} left`}</span>
              <span>{isToday(selectedDate) ? "Today's Score" : isPast ? 'Final Score' : 'Day Score'}</span>
            </div>
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setHeaderCollapsed(c => !c)}
          className="w-full flex items-center justify-center py-1 mt-1"
        >
          <div className="flex items-center gap-1.5 text-gray-600 hover:text-gray-400 transition-colors">
            <div className={`w-8 h-0.5 bg-gray-600 rounded-full`} />
            <ChevronLeft size={12} className={`transition-transform duration-300 ${headerCollapsed ? '-rotate-90' : 'rotate-90'}`} />
            <div className={`w-8 h-0.5 bg-gray-600 rounded-full`} />
          </div>
        </button>

        {/* View toggle */}
        <div className="flex gap-1 bg-[#141414] rounded-xl p-1">
          <button
            onClick={() => setView('tasks')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              view === 'tasks' ? 'bg-[#1a1a1a] text-white' : 'text-gray-600'
            }`}
          >
            <LayoutList size={13} /> Tasks
          </button>
          <button
            onClick={() => setView('timeline')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              view === 'timeline' ? 'bg-[#1a1a1a] text-white' : 'text-gray-600'
            }`}
          >
            <Clock3 size={13} /> Timeline
          </button>
        </div>
      </div>

      {/* Timeline view */}
      {view === 'timeline' && (
        <Timeline
          tasks={dayTasks}
          selectedDate={selectedDate}
          onUpdate={onUpdate}
        />
      )}

      {/* Task List */}
      {view === 'tasks' && (
      <div className="flex-1 overflow-y-auto px-5 space-y-2 pb-4">
        {pending.length === 0 && completed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 bg-[#1a1a1a] rounded-2xl flex items-center justify-center mb-3">
              <Plus size={22} className="text-gray-600" />
            </div>
            <p className="text-gray-500 font-medium">No tasks for {dayLabel(selectedDate).toLowerCase()}</p>
            <p className="text-gray-700 text-sm mt-1">{isPast ? 'Nothing was planned this day' : 'Tap + to plan your day'}</p>
          </div>
        )}

        {!isPast && pending.length > 0 && (
          <div className="space-y-2">
            {pending.map(task => (
              <TaskItem key={task.id} task={task} onComplete={handleComplete} onUncomplete={handleUncomplete} onDelete={onDelete} onUpdate={onUpdate} multiplier={combo ? combo.chainCount : 0} />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div className={isPast ? '' : 'mt-4'}>
            {(!isPast || pending.length > 0) && (
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-2 px-1">Completed</p>
            )}
            <div className="space-y-2">
              {completed.map(task => (
                <TaskItem key={task.id} task={task} onComplete={handleComplete} onUncomplete={handleUncomplete} onDelete={onDelete} onUpdate={onUpdate} multiplier={1} locked={isPast} />
              ))}
            </div>
          </div>
        )}

        {isPast && pending.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-red-500/70 uppercase tracking-widest mb-2 px-1">Uncompleted</p>
            <div className="space-y-2">
              {pending.map(task => (
                <TaskItem key={task.id} task={task} onComplete={handleComplete} onUncomplete={handleUncomplete} onDelete={onDelete} onUpdate={onUpdate} multiplier={1} locked={isPast} />
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* FAB — hidden for past days and timeline view */}
      {/* Floating Add button */}
      {!isPast && view === 'tasks' && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed w-14 h-14 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all z-10"
          style={{
            bottom: 'calc(82px + max(12px, env(safe-area-inset-bottom)))',
            right: 'max(20px, calc(50vw - 204px))',
          }}
        >
          <Plus size={24} />
        </button>
      )}

      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onAdd={onAdd}
          defaultDate={dateStr}
        />
      )}

      {showCalendar && (
        <CalendarPicker
          selected={selectedDate}
          onSelect={onDateChange}
          onClose={() => setShowCalendar(false)}
          getDailyScore={getDailyScore}
        />
      )}
    </div>
  )
}
