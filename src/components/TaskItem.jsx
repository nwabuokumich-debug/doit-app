import { useState } from 'react'
import { format } from 'date-fns'
import { Trash2, Timer, Pencil, StickyNote } from 'lucide-react'
import { isLate, isOnTime, earnedPoints } from '../hooks/useTasks'
import { getLevel } from '../lib/levels'
import AddTaskModal from './AddTaskModal'
import NoteModal from './NoteModal'

export default function TaskItem({ task, onComplete, onUncomplete, onDelete, onUpdate, multiplier = 1 }) {
  const [showEdit, setShowEdit] = useState(false)
  const [showNote, setShowNote] = useState(false)
  const [animating, setAnimating] = useState(false)
  const [showFloat, setShowFloat] = useState(false)

  const handleToggle = async () => {
    if (animating) return
    setAnimating(true)
    if (task.completed) {
      await onUncomplete(task.id)
    } else {
      setShowFloat(true)
      await onComplete(task.id)
      setTimeout(() => setShowFloat(false), 900)
    }
    setTimeout(() => setAnimating(false), 400)
  }

  const level = getLevel(task.priority)
  const isOverdue = !task.completed && task.due_at && task.has_time_deadline && new Date(task.due_at) < new Date()
  const late = isLate(task)
  const onTime = isOnTime(task)
  const pts = earnedPoints(task)

  return (
    <>
    <div className={`task-enter flex items-start gap-3 p-4 md:p-2.5 rounded-2xl border transition-all ${
      task.completed
        ? 'bg-[#1a1a1a] border-white/5 opacity-60'
        : isOverdue
        ? 'bg-red-500/5 border-red-500/20'
        : 'bg-[#1a1a1a] border-white/5'
    }`}>
      {/* Checkbox */}
      <button
        onClick={handleToggle}
        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
          animating ? 'pop-anim' : ''
        } ${
          task.completed
            ? 'bg-indigo-500 border-indigo-500'
            : 'border-gray-600 hover:border-indigo-400'
        }`}
      >
        {task.completed && (
          <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
            <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${level.color}`} />
          <p className={`text-sm font-medium text-white truncate ${task.completed ? 'line-through text-gray-500' : ''}`}>
            {task.title}
          </p>
        </div>

        {task.description && (
          <p className="text-xs text-gray-500 mt-1 ml-4 line-clamp-1">{task.description}</p>
        )}

        {task.due_at && task.has_time_deadline && (
          <div className={`flex items-center gap-1 mt-1 ml-4 text-xs ${
            isOverdue ? 'text-red-400' : late ? 'text-orange-400' : onTime ? 'text-green-400' : 'text-gray-500'
          }`}>
            <Timer size={10} />
            <span>Deadline: {format(new Date(task.due_at), 'h:mm a')}</span>
            {isOverdue && <span className="font-semibold">· OVERDUE</span>}
            {late    && <span className="font-semibold">· LATE ({level.timePenalty} pts)</span>}
            {onTime  && <span className="font-semibold">· ON TIME (+{level.timeBonus} pts)</span>}
          </div>
        )}
      </div>

      {/* Points badge */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="flex flex-col items-end">
          {(late || onTime) ? (
            <>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                onTime ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
              }`}>
                +{pts}
              </span>
              <span className="text-[10px] text-gray-600 line-through mt-0.5">+{task.points}</span>
            </>
          ) : (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              task.completed ? level.badge : 'bg-white/5 text-gray-400'
            }`}>
              +{task.points}
            </span>
          )}
        </div>
        {!task.completed && (
          <button onClick={() => setShowEdit(true)} className="text-gray-600 hover:text-indigo-400 transition-colors">
            <Pencil size={14} />
          </button>
        )}
        {task.completed && (
          <button onClick={() => setShowNote(true)} className={`transition-colors ${task.description ? 'text-indigo-400' : 'text-gray-600 hover:text-indigo-400'}`}>
            <StickyNote size={14} />
          </button>
        )}
        <button onClick={() => onDelete(task.id)} className="text-gray-600 hover:text-red-400 transition-colors">
          <Trash2 size={14} />
        </button>
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
    {showFloat && (
      <div className="float-points pointer-events-none fixed left-1/2 top-1/3 -translate-x-1/2 z-[9999]">
        <span className="text-lg font-extrabold text-yellow-400 drop-shadow-lg">
          +{task.points + multiplier} pts{multiplier > 0 ? ` (+${multiplier} combo)` : ''}
        </span>
      </div>
    )}
    </>
  )
}
