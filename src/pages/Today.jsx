import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  format, addDays, subDays, isToday, isTomorrow, isYesterday, isBefore, startOfDay,
  startOfWeek, eachDayOfInterval, endOfWeek, isSameDay
} from 'date-fns'
import { Plus, Zap, ChevronLeft, ChevronRight, CalendarDays, LayoutList, Clock3, Flame, Trophy } from 'lucide-react'

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
      setTimeout(() => setScoreAnim(false), 700)
    }
    prevEarned.current = score.earned
  }, [score.earned])

  // ─── Milestone detection (perfect / bonus / day-done) ───────────────
  const prevMilestone = useRef({ pct: 0, net: 0, possible: 0, pending: -1 })
  const [milestone, setMilestone] = useState(null) // 'perfect' | 'bonus' | 'day-done'

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

  // Milestone detection — only fires on today's view, transitioning state
  useEffect(() => {
    if (!isToday(selectedDate)) {
      prevMilestone.current = { pct, net: netEarned, possible: score.possible, pending: pending.length }
      return
    }
    const prev = prevMilestone.current
    if (prev.pending === -1) {
      prevMilestone.current = { pct, net: netEarned, possible: score.possible, pending: pending.length }
      return
    }
    const justBonus = score.possible > 0 && netEarned > score.possible && prev.net <= prev.possible
    const justPerfect = score.possible > 0 && pct >= 100 && prev.pct < 100 && !justBonus
    const justDayDone = pending.length === 0 && prev.pending > 0 && completed.length > 0
    if (justBonus) setMilestone('bonus')
    else if (justPerfect) setMilestone('perfect')
    else if (justDayDone) setMilestone('day-done')
    prevMilestone.current = { pct, net: netEarned, possible: score.possible, pending: pending.length }
  }, [pct, netEarned, score.possible, pending.length, completed.length, selectedDate])

  useEffect(() => {
    if (!milestone) return
    navigator.vibrate?.([60, 80, 80, 80, 100])
    const t = setTimeout(() => setMilestone(null), 1900)
    return () => clearTimeout(t)
  }, [milestone])

  // Week strip: 7 days centred on selected date
  const weekStart = startOfWeek(selectedDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) })

  return (
    <div className="flex flex-col h-full relative bg-background">
      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60 font-bold">
            {format(selectedDate, 'MMMM yyyy')}
          </p>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex size-10 items-center justify-center rounded-xl border-[3px] border-ink bg-card shadow-sticker-sm active:translate-y-0.5 active:shadow-none transition-all"
            aria-label="Open calendar"
          >
            <CalendarDays size={16} className="text-ink" strokeWidth={2.5} />
          </button>
        </div>

        {/* Day nav */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => onDateChange(subDays(selectedDate, 1))}
            className="flex size-10 items-center justify-center rounded-xl border-[3px] border-ink bg-card shadow-sticker-sm active:translate-y-0.5 active:shadow-none transition-all"
            aria-label="Previous day"
          >
            <ChevronLeft size={18} className="text-ink" strokeWidth={2.5} />
          </button>
          <h1 className="font-display text-2xl font-black text-ink leading-none">
            {dayLabel(selectedDate)}
          </h1>
          <button
            onClick={() => onDateChange(addDays(selectedDate, 1))}
            className="flex size-10 items-center justify-center rounded-xl border-[3px] border-ink bg-card shadow-sticker-sm active:translate-y-0.5 active:shadow-none transition-all"
            aria-label="Next day"
          >
            <ChevronRight size={18} className="text-ink" strokeWidth={2.5} />
          </button>
        </div>

        {/* Week strip */}
        <div className="flex gap-1.5 mt-3">
          {weekDays.map(day => {
            const isSelected = isSameDay(day, selectedDate)
            const todayFlag = isToday(day)
            const isPastDay = isBefore(startOfDay(day), startOfDay(new Date()))
            const { earned, possible } = getDailyScore(format(day, 'yyyy-MM-dd'))
            const hasTasks = possible > 0
            const pctDay = hasTasks ? (earned / possible) * 100 : 0

            const bg = isSelected
              ? 'bg-primary'
              : todayFlag
                ? 'bg-accent'
                : isPastDay
                  ? 'bg-card/60'
                  : 'bg-card'

            return (
              <button
                key={day.toISOString()}
                onClick={() => onDateChange(day)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl border-2 border-ink transition-all ${bg} ${
                  isSelected ? 'shadow-sticker-sm' : ''
                }`}
              >
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/70">
                  {format(day, 'EEE')[0]}
                </span>
                <span className="font-display text-sm font-black text-ink leading-none">
                  {format(day, 'd')}
                </span>
                {hasTasks && (
                  <span className="w-1.5 h-1.5 rounded-full" style={{
                    backgroundColor: isSelected
                      ? 'oklch(0.15 0 0)'
                      : pctDay >= 80 ? 'oklch(0.6 0.18 145)'
                      : pctDay >= 50 ? 'oklch(0.72 0.21 65)'
                      : 'oklch(0.65 0.24 27)'
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* Collapsible section */}
        <div className={`overflow-hidden transition-all duration-300 ${headerCollapsed ? 'max-h-0' : 'max-h-[28rem]'}`}>
          {/* Combo banner — slim, with live bottom progress bar */}
          {combo && (() => {
            const p = combo.progress
            const tone = p > 0.66 ? 'bg-primary' : p > 0.33 ? 'bg-accent' : 'bg-sage'
            const label = p > 0.66 ? 'ON FIRE!' : p > 0.33 ? 'FADING…' : 'DYING OUT…'
            return (
              <div className={`mt-3 rounded-2xl border-[3px] border-ink overflow-hidden shadow-sticker ${tone}`}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl border-2 border-ink bg-card">
                    <Flame size={16} className="text-ink" strokeWidth={2.75} />
                  </div>
                  <div className="flex-1 flex items-baseline gap-1.5">
                    <span className="font-display text-xl font-black text-ink leading-none">
                      ×{combo.chainCount}
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                      {label}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold tabular-nums text-ink">
                    {formatCountdown(combo.msRemaining)}
                  </span>
                </div>
                <div className="h-1.5 bg-ink/15">
                  <div className="h-full bg-ink transition-all duration-1000" style={{ width: `${p * 100}%` }} />
                </div>
              </div>
            )
          })()}

          {/* Score card — hero, celebrates bonus over 100% */}
          {(() => {
            const overflow = Math.max(0, netEarned - score.possible)
            const isBonus  = overflow > 0
            const baseWidth = score.possible > 0 ? Math.min(100, (netEarned / score.possible) * 100) : 0
            const overflowMax = score.possible > 0 ? Math.min(100, (overflow / score.possible) * 100) : 0
            const bgClass   = (isBonus || isPerfect) ? 'bg-accent' : 'bg-secondary'
            const animClass = scoreAnim
              ? 'score-celebrate'
              : isBonus   ? 'bonus-pulse'
              : isPerfect ? 'perfect-pulse'
              : ''

            return (
              <div className={`mt-3 rounded-2xl border-[3px] border-ink p-4 shadow-sticker transition-all ${bgClass} ${animClass}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
                      {isToday(selectedDate) ? "Today's Score" : isPast ? 'Final Score' : 'Day Score'}
                    </p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className={`font-display text-4xl font-black text-ink leading-none ${scoreAnim ? 'score-pop' : ''}`}>
                        {netEarned}
                      </span>
                      <span className="font-display text-lg font-black text-ink/40 leading-none">
                        / {score.possible}
                      </span>
                      {isBonus && (
                        <span className="badge-pop ml-1 font-mono text-[10px] font-black uppercase tracking-widest text-ink px-1.5 py-0.5 rounded border-2 border-ink bg-card">
                          +{overflow}
                        </span>
                      )}
                      {score.deducted > 0 && (
                        <span className="font-mono text-xs font-bold text-destructive ml-1">
                          −{score.deducted}
                        </span>
                      )}
                    </div>
                  </div>
                  {isBonus ? (
                    <div className="badge-pop flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-3 py-1">
                      <Flame size={11} className="text-primary" strokeWidth={2.75} fill="currentColor" />
                      <span className="font-mono text-[10px] font-black uppercase tracking-widest text-primary">
                        Bonus
                      </span>
                    </div>
                  ) : isPerfect ? (
                    <div className="badge-pop flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-3 py-1">
                      <span className="font-mono text-[10px] font-black uppercase tracking-widest text-accent">
                        Perfect
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 rounded-full border-2 border-ink bg-card px-2.5 py-1">
                      <Zap size={12} className="text-ink" strokeWidth={2.75} />
                      <span className="font-mono text-xs font-bold text-ink">{pct}%</span>
                    </div>
                  )}
                </div>
                {/* Progress bar — black base, coral overlay on the right when over 100% */}
                <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-ink bg-card relative">
                  <div className="absolute inset-y-0 left-0 bg-ink transition-all duration-500" style={{ width: `${baseWidth}%` }} />
                  {isBonus && (
                    <div
                      className="absolute inset-y-0 right-0 bg-primary border-l-2 border-ink transition-all duration-500"
                      style={{ width: `${overflowMax}%` }}
                    />
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">
                  <span>{completed.length} done · {isPast ? 'sealed' : `${pending.length} left`}</span>
                  {isBonus && <span className="text-ink">+{overflow} bonus pts</span>}
                </div>
              </div>
            )
          })()}

          {/* Stat chips row */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <StatChip label="Points" value={netEarned} bg="bg-primary" />
            <StatChip label="Done" value={completed.length} bg="bg-secondary" />
            <StatChip label="Rate" value={`${pct}%`} bg="bg-sage" />
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setHeaderCollapsed(c => !c)}
          className="w-full flex items-center justify-center py-1.5 mt-1"
          aria-label="Toggle header"
        >
          <div className="flex items-center gap-1.5 text-ink/40">
            <div className="w-8 h-0.5 bg-ink/30 rounded-full" />
            <ChevronLeft size={12} className={`transition-transform duration-300 ${headerCollapsed ? '-rotate-90' : 'rotate-90'}`} strokeWidth={2.5} />
            <div className="w-8 h-0.5 bg-ink/30 rounded-full" />
          </div>
        </button>

        {/* View toggle */}
        <div className="flex gap-1.5 mt-1">
          <button
            onClick={() => setView('tasks')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-[3px] border-ink font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${
              view === 'tasks' ? 'bg-ink text-background shadow-sticker-sm' : 'bg-card text-ink'
            }`}
          >
            <LayoutList size={12} strokeWidth={2.5} /> Tasks
          </button>
          <button
            onClick={() => setView('timeline')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border-[3px] border-ink font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${
              view === 'timeline' ? 'bg-ink text-background shadow-sticker-sm' : 'bg-card text-ink'
            }`}
          >
            <Clock3 size={12} strokeWidth={2.5} /> Timeline
          </button>
        </div>
      </div>

      {/* Timeline view */}
      {view === 'timeline' && (
        <Timeline
          key={dateStr}
          tasks={dayTasks}
          selectedDate={selectedDate}
          onUpdate={onUpdate}
          locked={isPast}
          onAdd={() => setShowModal(true)}
          onComplete={handleComplete}
          onUncomplete={handleUncomplete}
          onDelete={onDelete}
          multiplier={combo ? combo.chainCount : 0}
        />
      )}

      {/* Task List */}
      {view === 'tasks' && (
      <div className="flex-1 overflow-y-auto px-5 pt-3 space-y-3 pb-32">
        {pending.length === 0 && completed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-16 rounded-2xl border-[3px] border-dashed border-ink/40 bg-card flex items-center justify-center mb-3">
              <Plus size={24} className="text-ink/40" strokeWidth={2.5} />
            </div>
            <p className="font-display text-lg font-black text-ink">
              No tasks for {dayLabel(selectedDate).toLowerCase()}
            </p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50 mt-1">
              {isPast ? 'Nothing was planned' : 'Tap + to plan your day'}
            </p>
          </div>
        )}

        {!isPast && pending.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-end justify-between px-1">
              <h2 className="font-display text-xl font-black text-ink">Today's Quests</h2>
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-primary">
                {pending.length} LEFT
              </span>
            </div>
            {pending.map(task => (
              <TaskItem key={task.id} task={task} onComplete={handleComplete} onUncomplete={handleUncomplete} onDelete={onDelete} onUpdate={onUpdate} multiplier={combo ? combo.chainCount : 0} />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div className={isPast ? '' : 'mt-5'}>
            {(!isPast || pending.length > 0) && (
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50 mb-2 px-1">
                Completed
              </p>
            )}
            <div className="space-y-3">
              {completed.map(task => (
                <TaskItem key={task.id} task={task} onComplete={handleComplete} onUncomplete={handleUncomplete} onDelete={onDelete} onUpdate={onUpdate} multiplier={1} locked={isPast} />
              ))}
            </div>
          </div>
        )}

        {isPast && pending.length > 0 && (
          <div className="mt-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-destructive mb-2 px-1">
              Uncompleted
            </p>
            <div className="space-y-3">
              {pending.map(task => (
                <TaskItem key={task.id} task={task} onComplete={handleComplete} onUncomplete={handleUncomplete} onDelete={onDelete} onUpdate={onUpdate} multiplier={1} locked={isPast} />
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* FAB — hidden for past days and timeline view */}
      {!isPast && view === 'tasks' && (
        <button
          onClick={() => setShowModal(true)}
          className="fixed size-14 bg-primary border-[3px] border-ink rounded-full shadow-sticker flex items-center justify-center active:translate-y-0.5 active:shadow-sticker-sm transition-all z-40"
          style={{
            bottom: 'calc(96px + max(14px, env(safe-area-inset-bottom)))',
            right: 'max(20px, calc(50vw - 204px))',
          }}
          aria-label="Add task"
        >
          <Plus size={26} className="text-ink" strokeWidth={3} />
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

      {milestone && createPortal(
        <div
          className="splash-anim fixed top-[38%] left-1/2 z-[9003] pointer-events-none flex flex-col items-center gap-2 rounded-3xl border-[3px] border-ink px-7 py-5 shadow-sticker-lg"
          style={{
            backgroundColor:
              milestone === 'perfect' ? 'oklch(0.85 0.18 95)' :
              milestone === 'bonus'   ? 'oklch(0.72 0.21 25)' :
                                         'oklch(0.86 0.09 145)',
          }}
        >
          <div className="flex items-center gap-2">
            {milestone === 'bonus'   && <Flame  size={36} className="text-ink" strokeWidth={2.5} fill="currentColor" />}
            {milestone === 'perfect' && <Trophy size={36} className="text-ink" strokeWidth={2.5} />}
            {milestone === 'day-done' && <Zap   size={36} className="text-ink" strokeWidth={2.5} fill="currentColor" />}
            <span className="font-display text-5xl font-black text-ink leading-none">
              {milestone === 'perfect' ? 'PERFECT!' : milestone === 'bonus' ? 'BONUS!' : 'DAY DONE!'}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
            {milestone === 'perfect' ? '100% complete'
             : milestone === 'bonus' ? 'over the top'
             : 'all tasks finished'}
          </span>
        </div>,
        document.body
      )}
    </div>
  )
}

function StatChip({ label, value, bg }) {
  return (
    <div className={`rounded-xl border-[3px] border-ink ${bg} px-3 py-2 shadow-sticker-sm`}>
      <div className="font-display text-xl font-black text-ink leading-none">{value}</div>
      <div className="font-mono mt-0.5 text-[9px] font-bold uppercase tracking-widest text-ink/70">{label}</div>
    </div>
  )
}
