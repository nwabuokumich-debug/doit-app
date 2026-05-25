import { useRef, useEffect, useState, useCallback } from 'react'
import { format, isSameDay } from 'date-fns'
import { getLevel } from '../lib/levels'

const HOUR_HEIGHT = 64
const TOTAL_HEIGHT = HOUR_HEIGHT * 24
const LABEL_WIDTH = 52

function timeToY(dateStr) {
  const d = new Date(dateStr)
  return (d.getHours() + d.getMinutes() / 60) * HOUR_HEIGHT
}

function yToDateTime(y, selectedDate) {
  const clamped = Math.max(0, Math.min(TOTAL_HEIGHT - 1, y))
  const totalMins = Math.round((clamped / HOUR_HEIGHT) * 60)
  const hours = Math.floor(totalMins / 60)
  const minutes = Math.floor(totalMins % 60)
  const d = new Date(selectedDate)
  d.setHours(hours, minutes, 0, 0)
  return d.toISOString()
}

function formatHour(h) {
  if (h === 0)  return '12am'
  if (h === 12) return '12pm'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

// Light-theme priority colors
function priorityColor(priority) {
  const map = {
    light:  'oklch(0.70 0.04 95)',
    basic:  'oklch(0.70 0.16 145)',
    normal: 'oklch(0.65 0.13 195)',
    solid:  'oklch(0.78 0.16 75)',
    major:  'oklch(0.72 0.21 25)',
    grand:  'oklch(0.65 0.24 27)',
    epic:   'oklch(0.65 0.20 305)',
  }
  return map[priority] ?? map.light
}

export default function Timeline({ tasks, selectedDate, onUpdate }) {
  const scrollRef = useRef(null)
  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const [draggingId, setDraggingId] = useState(null)
  const [dragY, setDragY] = useState(0)

  const completedTasks = tasks.filter(t =>
    t.completed && t.completed_at && isSameDay(new Date(t.completed_at), selectedDate)
  )

  useEffect(() => {
    if (!scrollRef.current) return
    const now = new Date()
    const isToday = isSameDay(now, selectedDate)
    const targetHour = isToday ? now.getHours() : 8
    const y = targetHour * HOUR_HEIGHT - 120
    scrollRef.current.scrollTop = Math.max(0, y)
  }, [selectedDate])

  const now = new Date()
  const isToday = isSameDay(now, selectedDate)
  const nowY = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT

  const onPointerDown = useCallback((e, task) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const initialY = timeToY(task.completed_at)
    dragRef.current = {
      taskId: task.id,
      startY: initialY,
      startPointerY: e.clientY,
      currentY: initialY,
    }
    setDraggingId(task.id)
    setDragY(initialY)
  }, [])

  const onPointerMove = useCallback((e) => {
    if (!dragRef.current) return
    const delta = e.clientY - dragRef.current.startPointerY
    const newY = Math.max(0, Math.min(TOTAL_HEIGHT - HOUR_HEIGHT, dragRef.current.startY + delta))
    dragRef.current.currentY = newY
    setDragY(newY)
  }, [])

  const onPointerUp = useCallback(async () => {
    if (!dragRef.current) return
    const { taskId, currentY } = dragRef.current
    dragRef.current = null
    setDraggingId(null)
    const newIso = yToDateTime(currentY, selectedDate)
    await onUpdate(taskId, { completed_at: newIso })
  }, [selectedDate, onUpdate])

  const getColumn = (task, allTasks) => {
    const y = timeToY(task.completed_at)
    const overlapping = allTasks.filter(t => {
      if (t.id === task.id) return false
      const ty = timeToY(t.completed_at)
      return Math.abs(ty - y) < HOUR_HEIGHT
    })
    if (overlapping.length === 0) return { col: 0, total: 1 }
    const sorted = [task, ...overlapping].sort((a, b) =>
      new Date(a.completed_at) - new Date(b.completed_at)
    )
    const idx = sorted.findIndex(t => t.id === task.id)
    return { col: idx, total: sorted.length }
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto pb-32"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div
        ref={containerRef}
        className="relative select-none"
        style={{ height: TOTAL_HEIGHT, marginLeft: LABEL_WIDTH }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-ink/15"
            style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            <div className="absolute left-0 right-0 border-t border-ink/8" style={{ top: HOUR_HEIGHT / 2 }} />
            <span
              className="absolute font-mono text-[10px] font-bold text-ink/50"
              style={{ left: -LABEL_WIDTH, top: -8, width: LABEL_WIDTH - 8, textAlign: 'right' }}
            >
              {formatHour(h)}
            </span>
          </div>
        ))}

        {isToday && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
            style={{ top: nowY }}
          >
            <div className="size-2.5 rounded-full bg-primary border-2 border-ink -ml-1 flex-shrink-0" />
            <div className="flex-1 h-0.5 bg-primary" />
          </div>
        )}

        {completedTasks.map(task => {
          const isDragging = draggingId === task.id
          const y = isDragging ? dragY : timeToY(task.completed_at)
          const level = getLevel(task.priority)
          const { col, total } = getColumn(task, completedTasks)
          const blockHeight = 52
          const color = priorityColor(task.priority)

          return (
            <div
              key={task.id}
              onPointerDown={(e) => onPointerDown(e, task)}
              className={`absolute rounded-xl border-[3px] border-ink px-2.5 py-1.5 cursor-grab active:cursor-grabbing transition-shadow ${
                isDragging ? 'shadow-sticker-lg z-20 scale-[1.02]' : 'shadow-sticker-sm z-10'
              }`}
              style={{
                top: y,
                left: `calc(${col} * (100% / ${total}) + ${col > 0 ? 2 : 0}px)`,
                width: `calc((100% - ${total > 1 ? col * 4 : 0}px) / ${total})`,
                height: blockHeight,
                backgroundColor: color,
                touchAction: 'none',
                transition: isDragging ? 'none' : 'top 0.15s ease',
              }}
            >
              <p className="font-display text-xs font-black text-ink truncate leading-tight">{task.title}</p>
              <p className="font-mono text-[9px] font-bold text-ink/70 mt-0.5">
                {format(new Date(task.completed_at), 'h:mm a')} · {level.label}
              </p>
            </div>
          )
        })}

        {completedTasks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-ink/30">No completed tasks</p>
          </div>
        )}
      </div>
    </div>
  )
}
