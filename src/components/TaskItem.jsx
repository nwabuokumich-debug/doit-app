import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { Trash2, Timer, Pencil, StickyNote, Check, Star, Flame } from 'lucide-react'
import { isLate, isOnTime, earnedPoints, missedPoints } from '../hooks/useTasks'
import { getLevel } from '../lib/levels'
import AddTaskModal from './AddTaskModal'
import NoteModal from './NoteModal'

const CONFETTI_COLORS = [
  'oklch(0.72 0.21 25)',   // coral
  'oklch(0.78 0.14 275)',  // periwinkle
  'oklch(0.85 0.18 95)',   // mustard
  'oklch(0.86 0.09 145)',  // sage
  'oklch(0.15 0 0)',       // ink
]

function tierForPoints(pts) {
  if (pts >= 10) return { count: 44, vibe: 'heavy',  badge: 'text-4xl', star: 26, vibrate: [40, 30, 60] }
  if (pts >= 4)  return { count: 28, vibe: 'medium', badge: 'text-3xl', star: 22, vibrate: [30] }
  return            { count: 16, vibe: 'light',  badge: 'text-2xl', star: 18, vibrate: [22] }
}

function Confetti({ origin, count, delay = 0 }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const distance = 80 + Math.random() * 140
    return {
      id: i,
      cx: Math.cos(angle) * distance,
      cy: Math.sin(angle) * distance,
      cr: (Math.random() - 0.5) * 1080,
      color: CONFETTI_COLORS[(i + Math.floor(Math.random() * 2)) % CONFETTI_COLORS.length],
      shape: i % 4,
      size: 8 + Math.random() * 7,
      pDelay: delay + Math.random() * 80,
    }
  }), [count, delay])

  if (!origin) return null
  return (
    <div className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti-piece absolute"
          style={{
            left: origin.x,
            top: origin.y,
            '--cx': `${p.cx}px`,
            '--cy': `${p.cy}px`,
            '--cr': `${p.cr}deg`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            border: '2px solid oklch(0.15 0 0)',
            borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? '0' : p.shape === 2 ? '20%' : '50% 0 50% 0',
            transform: 'translate(-50%, -50%)',
            animationDelay: `${p.pDelay}ms`,
          }}
        />
      ))}
    </div>
  )
}

function Celebration({ origin, points, combo }) {
  const tier = tierForPoints(points)
  const totalPts = points + (combo || 0)
  const newComboLevel = (combo || 0) + 1
  const showFlash = combo >= 2
  const showWaveTwo = combo >= 4
  const showComboSplash = combo >= 9

  return createPortal(
    <>
      <Confetti origin={origin} count={tier.count} />
      {showWaveTwo && <Confetti origin={origin} count={24} delay={260} />}

      {showFlash && (
        <div
          className="fixed inset-0 z-[9001] pointer-events-none screen-flash"
          style={{
            boxShadow: 'inset 0 0 90px 24px oklch(0.85 0.18 95 / 0.55), inset 0 0 0 6px oklch(0.85 0.18 95 / 0.6)',
          }}
        />
      )}

      <div className="float-badge pointer-events-none fixed left-1/2 top-[30%] z-[9999] flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-accent px-4 py-2 shadow-sticker-lg">
        <Star size={tier.star} className="text-ink" strokeWidth={2.75} fill="currentColor" />
        <span className={`font-display ${tier.badge} font-black text-ink leading-none tabular-nums`}>
          +{totalPts}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
          {combo > 0 ? `×${newComboLevel} combo` : 'pts'}
        </span>
      </div>

      {showComboSplash && (
        <div className="splash-anim fixed top-1/2 left-1/2 z-[9002] pointer-events-none flex items-center gap-3 rounded-3xl border-[3px] border-ink bg-primary px-7 py-4 shadow-sticker-lg">
          <Flame size={36} className="text-ink" strokeWidth={2.5} fill="currentColor" />
          <span className="font-display text-5xl font-black text-ink leading-none">
            ×{newComboLevel} COMBO!
          </span>
        </div>
      )}
    </>,
    document.body
  )
}

export default function TaskItem({ task, onComplete, onUncomplete, onDelete, onUpdate, multiplier = 1, locked = false }) {
  const cardRef = useRef(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [celebrate, setCelebrate] = useState(null) // { origin, points, combo } | null
  const [cardPop, setCardPop] = useState(false)

  const handleToggle = async () => {
    if (animating || locked) return
    setAnimating(true)
    if (task.completed) {
      await onUncomplete(task.id)
    } else {
      const rect = cardRef.current?.getBoundingClientRect()
      const origin = rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 }

      const tier = tierForPoints(task.points)
      const pattern = multiplier >= 2 ? [30, 50, 40, 50, 60] : tier.vibrate
      navigator.vibrate?.(pattern)

      setCardPop(true)
      setCelebrate({ origin, points: task.points, combo: multiplier })
      await onComplete(task.id)
      setTimeout(() => setCardPop(false), 700)
      setTimeout(() => setCelebrate(null), 1800)
    }
    setTimeout(() => setAnimating(false), 400)
  }

  const level = getLevel(task.priority)
  const isOverdue = !task.completed && task.due_at && task.has_time_deadline && new Date(task.due_at) < new Date()
  const late = isLate(task)
  const onTime = isOnTime(task)
  const pts = earnedPoints(task)
  const deduction = missedPoints(task)

  const cardClass = task.completed
    ? 'border-dashed border-ink/30 bg-ink/5'
    : isOverdue
      ? 'border-ink bg-destructive/15 shadow-sticker'
      : 'border-ink bg-card shadow-sticker'

  return (
    <>
    <div ref={cardRef} className={`task-enter relative flex items-start gap-3 p-3.5 rounded-2xl border-[3px] transition-all ${cardClass} ${cardPop ? 'card-celebrate' : ''}`}>
      {cardPop && <span className="ring-burst" />}

      {/* Checkbox tile — also shows priority color */}
      <button
        onClick={handleToggle}
        disabled={locked}
        className={`mt-0.5 size-10 flex-shrink-0 flex items-center justify-center rounded-xl border-[3px] border-ink transition-all ${
          animating ? 'pop-anim' : ''
        } ${
          task.completed
            ? 'bg-ink'
            : locked
              ? `${level.color} opacity-40 cursor-default`
              : level.color
        } active:translate-y-0.5`}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed && <Check size={18} className="text-background" strokeWidth={3.5} />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-[15px] font-bold leading-tight text-ink ${task.completed ? 'line-through text-ink/40' : ''}`}>
          {task.title}
        </p>

        {task.description && (
          <p className="text-xs text-ink/55 mt-1 line-clamp-1">{task.description}</p>
        )}

        {task.due_at && task.has_time_deadline && (
          <div className="flex items-center gap-1 mt-1.5">
            <span className={`inline-flex items-center gap-1 rounded-full border-2 border-ink px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
              isOverdue ? 'bg-destructive text-background'
                : late    ? 'bg-accent text-ink'
                : onTime  ? 'bg-sage text-ink'
                : 'bg-card text-ink'
            }`}>
              <Timer size={9} strokeWidth={3} />
              {format(new Date(task.due_at), 'h:mm a')}
              {isOverdue && ' · OVERDUE'}
              {late    && ` · −${Math.abs(level.timePenalty)}`}
              {onTime  && ` · +${level.timeBonus}`}
            </span>
          </div>
        )}
      </div>

      {/* Points + actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="flex flex-col items-end gap-0.5">
          {(late || onTime) ? (
            <>
              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border-2 border-ink ${
                onTime ? 'bg-sage text-ink' : 'bg-accent text-ink'
              }`}>
                +{pts}
              </span>
              <span className="font-mono text-[9px] font-bold text-ink/40 line-through">+{task.points}</span>
            </>
          ) : deduction > 0 ? (
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full border-2 border-ink bg-destructive text-background">
              −{deduction}
            </span>
          ) : (
            <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-full border-2 border-ink ${
              task.completed ? `${level.color} text-ink` : 'bg-card text-ink'
            }`}>
              +{task.points}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!locked && !task.completed && (
            <button onClick={() => setShowEdit(true)} className="text-ink/40 hover:text-ink transition-colors" aria-label="Edit">
              <Pencil size={14} strokeWidth={2.5} />
            </button>
          )}
          {!locked && task.completed && (
            <button onClick={() => setShowNote(true)} className={`transition-colors ${task.description ? 'text-ink' : 'text-ink/40 hover:text-ink'}`} aria-label="Note">
              <StickyNote size={14} strokeWidth={2.5} />
            </button>
          )}
          {!locked && (
            <button onClick={() => onDelete(task.id)} className="text-ink/40 hover:text-destructive transition-colors" aria-label="Delete">
              <Trash2 size={14} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>

    {showEdit && (
      <AddTaskModal
        onClose={() => setShowEdit(false)}
        onAdd={null}
        onUpdate={onUpdate}
        editTask={task}
      />
    )}
    {showNote && (
      <NoteModal
        task={task}
        onClose={() => setShowNote(false)}
        onUpdate={onUpdate}
      />
    )}
    {celebrate && <Celebration origin={celebrate.origin} points={celebrate.points} combo={celebrate.combo} />}
    </>
  )
}
