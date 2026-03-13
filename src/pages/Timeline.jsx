import { useRef, useEffect, useState, useCallback } from 'react'
import { format, isSameDay } from 'date-fns'
import { getLevel } from '../lib/levels'

const HOUR_HEIGHT = 64  // px per hour
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

export default function Timeline({ tasks, selectedDate, onUpdate }) {
  const scrollRef = useRef(null)
  const containerRef = useRef(null)
  const dragRef = useRef(null) // { taskId, startY, startPointerY, currentY }
  const [draggingId, setDraggingId] = useState(null)
  const [dragY, setDragY] = useState(0)

  // Only show completed tasks with a completed_at time on this date
  const completedTasks = tasks.filter(t =>
    t.completed && t.completed_at && isSameDay(new Date(t.completed_at), selectedDate)
  )

  // Scroll to current time on mount / date change
  useEffect(() => {
    if (!scrollRef.current) return
    const now = new Date()
    const isToday = isSameDay(now, selectedDate)
    const targetHour = isToday ? now.getHours() : 8
    const y = targetHour * HOUR_HEIGHT - 120
    scrollRef.current.scrollTop = Math.max(0, y)
  }, [selectedDate])

  // Current time line position
  const now = new Date()
  const isToday = isSameDay(now, selectedDate)
  const nowY = (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT

  // ── Drag logic ──────────────────────────────────────────────────
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

  const onPointerUp = useCallback(async (e) => {
    if (!dragRef.current) return
    const { taskId, currentY } = dragRef.current
    dragRef.current = null
    setDraggingId(null)
    const newIso = yToDateTime(currentY, selectedDate)
    await onUpdate(taskId, { completed_at: newIso })
  }, [selectedDate, onUpdate])

  // Group overlapping tasks by proximity
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
      className="flex-1 overflow-y-auto"
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
        {/* Hour rows */}
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-white/5"
            style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
          >
            {/* Half-hour line */}
            <div className="absolute left-0 right-0 border-t border-white/3" style={{ top: HOUR_HEIGHT / 2 }} />
            {/* Hour label */}
            <span
              className="absolute text-[10px] text-gray-600 font-medium"
              style={{ left: -LABEL_WIDTH, top: -8, width: LABEL_WIDTH - 8, textAlign: 'right' }}
            >
              {formatHour(h)}
            </span>
          </div>
        ))}

        {/* Current time indicator */}
        {isToday && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
            style={{ top: nowY }}
          >
            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
            <div className="flex-1 h-px bg-red-500" />
          </div>
        )}

        {/* Task blocks */}
        {completedTasks.map(task => {
          const isDragging = draggingId === task.id
          const y = isDragging ? dragY : timeToY(task.completed_at)
          const level = getLevel(task.priority)
          const { col, total } = getColumn(task, completedTasks)
          const blockHeight = 52
          const colWidth = `calc((100% - ${total > 1 ? col * 4 : 0}px) / ${total})`

          return (
            <div
              key={task.id}
              onPointerDown={(e) => onPointerDown(e, task)}
              className={`absolute rounded-xl px-2.5 py-1.5 cursor-grab active:cursor-grabbing transition-shadow ${
                isDragging ? 'shadow-2xl shadow-black/50 z-20 scale-[1.02]' : 'z-10'
              }`}
              style={{
                top: y,
                left: `calc(${col} * (100% / ${total}) + ${col > 0 ? 2 : 0}px)`,
                width: colWidth,
                height: blockHeight,
                backgroundColor: getColorHex(task.priority) + '25',
                borderLeft: `3px solid ${getColorHex(task.priority)}`,
                touchAction: 'none',
                transition: isDragging ? 'none' : 'top 0.15s ease',
              }}
            >
              <p className="text-xs font-semibold text-white truncate leading-tight">{task.title}</p>
              <p className="text-[10px] mt-0.5" style={{ color: getColorHex(task.priority) }}>
                {format(new Date(task.completed_at), 'h:mm a')} · {level.label}
              </p>
            </div>
          )
        })}

        {/* Empty state */}
        {completedTasks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-700 text-sm">No completed tasks to show</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getColorHex(priority) {
  const map = {
    light:    '#94a3b8',
    basic:    '#22c55e',
    normal:   '#14b8a6',
    solid:    '#eab308',
    major:    '#f97316',
    grand:    '#ef4444',
    epic:     '#a855f7',
  }
  return map[priority] ?? '#94a3b8'
}
