import { useRef, useEffect, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { GripVertical, ChevronsUpDown, X, Plus, Check } from 'lucide-react'
import TaskItem from '../components/TaskItem'
import ScheduleFields from '../components/ScheduleFields'
import { atMinute, hasSchedule, minuteOfDay, moveInterval, layoutBlocks, scheduleFromInputs, timeValue } from '../lib/schedule'

const HOUR_HEIGHT = 96
const PX_PER_MINUTE = HOUR_HEIGHT / 60
const TOTAL_HEIGHT = HOUR_HEIGHT * 24
const buttonClass = 'rounded-xl border-[3px] border-ink bg-card px-3 py-2 font-mono text-xs font-bold shadow-sticker-sm min-h-11'

function TimeSheet({ task, day, locked, onClose, onUpdate, ...taskActions }) {
  const [enabled, setEnabled] = useState(hasSchedule(task) || !task.completed)
  const [start, setStart] = useState(hasSchedule(task) ? timeValue(minuteOfDay(task.scheduled_start)) : '09:00')
  const [end, setEnd] = useState(hasSchedule(task) ? (minuteOfDay(task.scheduled_end) === 0 ? '24:00' : timeValue(minuteOfDay(task.scheduled_end))) : '10:00')
  const [actual, setActual] = useState(task.completed_at ? format(new Date(task.completed_at), 'HH:mm') : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const save = async e => {
    e.preventDefault()
    if (locked || saving) return
    setSaving(true); setError('')
    try {
      const updates = enabled ? scheduleFromInputs(day, start, end) : { scheduled_start: null, scheduled_end: null }
      const result = await onUpdate(task.id, updates)
      if (result?.error) throw result.error
      onClose()
    } catch (error) { setError(error.message || 'Could not save. Please try again.') }
    finally { setSaving(false) }
  }
  const saveActual = async () => {
    if (locked || !actual || saving) return
    setSaving(true); setError('')
    try {
      const [h, m] = actual.split(':').map(Number)
      const result = await onUpdate(task.id, { completed_at: atMinute(day, h * 60 + m) })
      if (result?.error) throw result.error
      onClose()
    } catch (error) { setError(error.message || 'Could not save completion time.') }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center" onKeyDown={e => { if (e.key === 'Escape' && !saving) onClose() }}>
      <section role="dialog" aria-modal="true" aria-label="Task time" className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border-[3px] border-ink bg-background shadow-sticker-lg p-4 pb-8 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-xl font-black">{locked ? 'Day sealed' : 'Task & time'}</h2>
          <button autoFocus disabled={saving} onClick={onClose} aria-label="Close task time" className={buttonClass}><X size={18} /></button>
        </div>
        <TaskItem task={task} locked={locked || saving} onUpdate={async (id, updates) => {
          const result = await onUpdate(id, updates)
          // Editing the full task can also change its day or plan; reopen fresh next time.
          if (!result?.error && 'scheduled_start' in updates) onClose()
          return result
        }} {...taskActions} />
        {task.completed_at && <p className="text-xs text-ink/60 mt-3">Completed {format(new Date(task.completed_at), 'MMM d, h:mm a')}</p>}
        {!locked && <form onSubmit={save} className="mt-3 space-y-3">
          <ScheduleFields enabled={enabled} onToggle={setEnabled} start={start} end={end} onStart={setStart} onEnd={setEnd} />
          <button disabled={saving} className={`${buttonClass} bg-primary w-full disabled:opacity-50`}>{saving ? 'Saving…' : enabled ? 'Save planned time' : 'Remove planned time'}</button>
        </form>}
        {!locked && task.completed && !hasSchedule(task) && <div className="mt-4 space-y-2">
          <label className="block text-xs font-bold">Actual completion time
            <input type="time" aria-label="Actual completion time" value={actual} onChange={e => setActual(e.target.value)} className="block w-full border-[3px] border-ink rounded-xl bg-card p-2 text-base" />
          </label>
          <button disabled={saving || !actual} onClick={saveActual} className={buttonClass}>Save completion time</button>
        </div>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </section>
    </div>
  )
}

export default function Timeline({ tasks, selectedDate, onUpdate, locked, onAdd, ...taskActions }) {
  const scrollRef = useRef(null)
  const dragRef = useRef(null)
  const suppressClick = useRef(false)
  const [preview, setPreview] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const day = format(selectedDate, 'yyyy-MM-dd')
  const selectedTask = tasks.find(t => t.id === selectedId)
  const unscheduled = tasks.filter(t => !hasSchedule(t))
  const blocks = layoutBlocks(tasks.flatMap(task => {
    if (hasSchedule(task) && isSameDay(new Date(task.scheduled_start), selectedDate)) {
      const start = minuteOfDay(task.scheduled_start)
      const end = isSameDay(new Date(task.scheduled_end), selectedDate) ? minuteOfDay(task.scheduled_end) : 1440
      return [{ task, planned: true, start, end }]
    }
    if (!hasSchedule(task) && task.completed && task.completed_at && isSameDay(new Date(task.completed_at), selectedDate)) {
      const start = minuteOfDay(task.completed_at)
      return [{ task, planned: false, start, end: start + 30 }]
    }
    return []
  }).map(block => preview?.id === block.task.id ? { ...block, start: preview.start, end: preview.end } : block), 34).sort((a, b) => String(a.task.id).localeCompare(String(b.task.id)))
  // Keep DOM order stable while changing lanes, so touch pointer capture survives.
  const maxLanes = Math.max(1, ...blocks.map(b => b.lanes))

  useEffect(() => {
    const hour = isSameDay(new Date(), selectedDate) ? new Date().getHours() : 8
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, hour * HOUR_HEIGHT - 100)
    dragRef.current = null
    setPreview(null); setSelectedId(null); setError('')
  }, [day]) // Only reset when navigating days, not on realtime updates.

  const cancelDrag = () => {
    if (dragRef.current) suppressClick.current = true
    dragRef.current = null; setPreview(null)
  }
  const beginDrag = (e, block, resize) => {
    if (locked || saving || (block.planned && block.task.completed) || !e.isPrimary || e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { ...block, resize, pointerId: e.pointerId, y: e.clientY, scroll: scrollRef.current.scrollTop, moved: false, next: { start: block.start, end: block.end } }
    suppressClick.current = false
  }
  const moveDrag = e => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const scroller = scrollRef.current
    const rect = scroller.getBoundingClientRect()
    if (e.clientY < rect.top + 40) scroller.scrollTop -= 12
    else if (e.clientY > rect.bottom - 40) scroller.scrollTop += 12
    const delta = e.clientY - drag.y + scroller.scrollTop - drag.scroll
    if (Math.abs(delta) < 5 && !drag.moved) return
    drag.moved = true; suppressClick.current = true
    drag.next = drag.planned
      ? moveInterval(drag.start, drag.end, delta / PX_PER_MINUTE, drag.resize)
      : { start: Math.max(0, Math.min(1439, Math.round((drag.start + delta / PX_PER_MINUTE) / 5) * 5)), end: drag.end }
    if (!drag.planned) drag.next.end = drag.next.start + 30
    setPreview({ id: drag.task.id, ...drag.next })
  }
  const finishDrag = async e => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null; setPreview(null)
    if (!drag.moved || locked) return
    setSaving(true); setError('')
    try {
      const updates = drag.planned
        ? scheduleFromInputs(day, timeValue(drag.next.start), timeValue(drag.next.end))
        : { completed_at: atMinute(day, drag.next.start) }
      const result = await onUpdate(drag.task.id, updates)
      if (result?.error) throw result.error
    } catch (error) { setError(error.message || 'Could not save time. Please try again.') }
    finally { setSaving(false) }
  }
  const handleProps = (block, resize = false) => ({
    onPointerDown: e => beginDrag(e, block, resize), onPointerMove: moveDrag,
    onPointerUp: finishDrag, onPointerCancel: cancelDrag, onLostPointerCapture: cancelDrag,
    onClick: () => { if (!suppressClick.current) setSelectedId(block.task.id); suppressClick.current = false },
    style: { touchAction: 'none' }, disabled: saving,
  })
  const now = new Date()
  return (
    <>
      <div className="px-5 py-2 flex items-center justify-between gap-2">
        <p className="text-xs text-ink/60">{locked ? 'Past day · read only' : 'Tap to edit · drag handles to move or resize'}</p>
        {!locked && <button onClick={onAdd} className={buttonClass} aria-label="Add timeline task"><Plus size={16} /></button>}
      </div>
      <details className="mx-5 mb-3 rounded-2xl border-[3px] border-ink bg-card shadow-sticker-sm">
        <summary className="p-3 font-mono text-xs font-bold cursor-pointer">Unscheduled · {unscheduled.length}</summary>
        <div className="px-3 pb-3 max-h-40 overflow-y-auto space-y-2">
          {unscheduled.length === 0 && <p className="text-xs text-ink/60">All tasks have a planned time.</p>}
          {unscheduled.map(task => <button key={task.id} onClick={() => setSelectedId(task.id)} className="w-full flex items-center justify-between gap-2 rounded-xl border-2 border-ink bg-background px-3 py-2 min-h-11 text-left text-sm">
            <span className={`truncate ${task.completed ? 'line-through' : ''}`}>{task.title}</span>
            <span className="shrink-0 text-xs font-bold">{locked ? 'View' : task.completed ? 'Done · edit' : '+ Time'}</span>
          </button>)}
        </div>
      </details>
      {error && <p role="alert" className="px-5 pb-2 text-sm text-destructive">{error}</p>}
      <div aria-live="polite" className="sr-only">{saving ? 'Saving time' : preview ? `${timeValue(preview.start)} to ${timeValue(preview.end)}` : ''}</div>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto pb-32" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="relative mr-3" style={{ height: TOTAL_HEIGHT + 56, marginLeft: 52, minWidth: Math.max(230, maxLanes * 160) }}>
          {Array.from({ length: 25 }, (_, h) => <div key={h} className="absolute left-0 right-0 border-t border-ink/15" style={{ top: h * HOUR_HEIGHT }}>
            <span className="absolute font-mono text-[10px] text-ink/60 -left-12 -top-2 w-10 text-right">{h === 24 ? '12am' : format(new Date(2000, 0, 1, h), 'ha').toLowerCase()}</span>
            {h < 24 && <div className="absolute left-0 right-0 border-t border-dashed border-ink/10" style={{ top: HOUR_HEIGHT / 2 }} />}
          </div>)}
          {blocks.map(block => {
            const { task, start, end, planned, lane, lanes } = block
            const editable = !locked && (!planned || !task.completed)
            return <div key={task.id} className={`absolute flex rounded-xl border-[3px] border-ink shadow-sticker-sm ${task.completed ? 'bg-sage' : 'bg-secondary'} ${preview?.id === task.id ? 'z-30 shadow-sticker-lg' : 'z-10'}`}
              style={{ top: start * PX_PER_MINUTE, height: Math.max(52, (end - start) * PX_PER_MINUTE), left: `calc(${lane * 100 / lanes}% + 2px)`, width: `calc(${100 / lanes}% - 6px)` }}>
              {editable && <button {...handleProps(block)} aria-label={`Move ${task.title}`} className="w-11 shrink-0 flex items-center justify-center cursor-grab active:cursor-grabbing"><GripVertical size={16} /></button>}
              <button onClick={() => setSelectedId(task.id)} className="flex-1 min-w-0 text-left px-1 py-1 overflow-hidden" aria-label={`Open ${task.title}`}>
                <p className="font-display text-xs font-black truncate">{task.completed && <Check size={12} className="inline mr-1" />}{task.title}</p>
                <p className="font-mono text-[9px] font-bold">{timeValue(start)}{planned ? `–${timeValue(end)}` : ' · done'}</p>
                {planned && task.completed && task.completed_at && (end - start) * PX_PER_MINUTE > 72 && <p className="text-[10px] text-ink/60">Done {format(new Date(task.completed_at), 'h:mm a')}</p>}
              </button>
              {editable && planned && <button {...handleProps(block, true)} aria-label={`Resize ${task.title}`} className="w-11 shrink-0 flex items-end justify-center pb-2 cursor-ns-resize"><ChevronsUpDown size={16} /></button>}
            </div>
          })}
          {isSameDay(now, selectedDate) && <div className="absolute left-0 right-0 z-20 border-t-2 border-primary pointer-events-none" style={{ top: minuteOfDay(now) * PX_PER_MINUTE }}><span className="absolute -left-1 -top-1.5 size-2.5 rounded-full bg-primary border-2 border-ink" /></div>}
          {blocks.length === 0 && <p className="absolute top-[768px] left-3 right-3 text-center text-sm text-ink/50">{locked ? 'No timeline entries.' : 'Open Unscheduled to plan a task, or tap + to add one.'}</p>}
        </div>
      </div>
      {selectedTask && <TimeSheet key={selectedTask.id} task={selectedTask} day={day} locked={locked} onClose={() => setSelectedId(null)} onUpdate={onUpdate} {...taskActions} />}
    </>
  )
}
