import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { Trash2, Timer, Pencil, StickyNote, Check } from 'lucide-react'
import { isLate, isOnTime, earnedPoints, missedPoints } from '../hooks/useTasks'
import { getLevel } from '../lib/levels'
import { emitCelebration } from '../lib/celebrate'
import AddTaskModal from './AddTaskModal'
import NoteModal from './NoteModal'

function vibratePattern(points, combo) {
  if (combo >= 2) return [30, 50, 40, 50, 60]
  if (points >= 10) return [40, 30, 60]
  return [25]
}

export default function TaskItem({ task, onComplete, onUncomplete, onDelete, onUpdate, multiplier = 1, locked = false }) {
  const cardRef = useRef(null)
  const [showEdit, setShowEdit] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [animating, setAnimating] = useState(false)
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

      navigator.vibrate?.(vibratePattern(task.points, multiplier))

      // Fire-and-forget celebration — lives in CelebrationRoot, survives
      // this component's unmount when the task moves into the Completed list.
      emitCelebration({ origin, points: task.points, combo: multiplier })

      setCardPop(true)
      await onComplete(task.id)
      setTimeout(() => setCardPop(false), 700)
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
    </>
  )
}
