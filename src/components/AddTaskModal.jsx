import { useState } from 'react'
import { X, ChevronLeft, ChevronRight, CalendarDays, Clock, Bookmark, BookmarkCheck } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, isToday, isBefore, startOfDay
} from 'date-fns'
import { LEVELS } from '../lib/levels'
import { useTemplates } from '../hooks/useTemplates'

// ── Inline calendar ──────────────────────────────────────────────
function InlineCalendar({ selected, onSelect }) {
  const [viewMonth, setViewMonth] = useState(selected ? new Date(selected + 'T12:00') : new Date())
  const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) })
  const selectedDate = selected ? new Date(selected + 'T12:00') : null

  return (
    <div className="rounded-2xl border-[3px] border-ink bg-background p-3">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setViewMonth(m => subMonths(m, 1))} className="flex size-8 items-center justify-center rounded-lg border-2 border-ink bg-card active:translate-y-0.5 transition-all">
          <ChevronLeft size={14} className="text-ink" strokeWidth={2.5} />
        </button>
        <p className="font-display text-sm font-black text-ink">{format(viewMonth, 'MMMM yyyy')}</p>
        <button type="button" onClick={() => setViewMonth(m => addMonths(m, 1))} className="flex size-8 items-center justify-center rounded-lg border-2 border-ink bg-card active:translate-y-0.5 transition-all">
          <ChevronRight size={14} className="text-ink" strokeWidth={2.5} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center font-mono text-[10px] font-bold text-ink/50 py-0.5">{d}</div>
        ))}
      </div>

      {/* 6-row fixed grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: 42 }).map((_, i) => {
          const dayIndex = i - days[0].getDay()
          const day = dayIndex >= 0 && dayIndex < days.length ? days[dayIndex] : null
          if (!day) return <div key={i} className="aspect-square" />

          const isSelected = selectedDate && isSameDay(day, selectedDate)
          const todayFlag = isToday(day)
          const isPast = isBefore(startOfDay(day), startOfDay(new Date()))

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => !isPast && onSelect(format(day, 'yyyy-MM-dd'))}
              disabled={isPast}
              className={`aspect-square flex items-center justify-center rounded-md font-display text-xs font-black transition-all border ${
                isSelected ? 'bg-primary border-ink' :
                todayFlag  ? 'border-ink/40' :
                isPast     ? 'border-transparent text-ink/25 cursor-not-allowed' :
                             'border-transparent hover:bg-ink/5'
              }`}
            >
              <span className={isPast ? 'text-ink/25' : 'text-ink'}>{format(day, 'd')}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── AM/PM time picker ────────────────────────────────────────────
function TimePicker({ value, onChange, selectedDate }) {
  const now = new Date()
  const initHour = value ? parseInt(value.split(':')[0]) : now.getHours()
  const initMin  = value ? parseInt(value.split(':')[1]) : Math.ceil(now.getMinutes() / 5) * 5 % 60

  const [hour24, setHour24] = useState(initHour)
  const [minute, setMinute] = useState(initMin)
  const [hourInput, setHourInput] = useState('')
  const [minInput, setMinInput]   = useState('')

  const isPM   = hour24 >= 12
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12

  const isTodayDate = selectedDate === format(now, 'yyyy-MM-dd')

  const isPastTime = (h24, m) => {
    if (!isTodayDate) return false
    const t = new Date(); t.setHours(h24, m, 0, 0)
    return t <= now
  }

  const emit = (h24, m) => {
    onChange(`${String(h24).padStart(2,'0')}:${String(m).padStart(2,'0')}`)
  }

  const setTime = (h24, m) => {
    setHour24(h24); setMinute(m); emit(h24, m)
  }

  const changeHour = (delta) => {
    let h = (hour24 + delta + 24) % 24
    if (isPastTime(h, minute)) h = (h + delta + 24) % 24
    setTime(h, minute)
  }
  const changeMinute = (delta) => {
    let m = (minute + delta + 60) % 60
    setTime(hour24, m)
  }
  const toggleAmPm = () => {
    const h = isPM ? hour24 - 12 : hour24 + 12
    if (!isPastTime(h, minute)) setTime(h, minute)
  }

  const handleHourInput = (e) => {
    const raw = e.target.value.replace(/\D/g,'')
    setHourInput(raw)
    const n = parseInt(raw)
    if (raw.length === 2 || n > 1) {
      if (n >= 1 && n <= 12) {
        const h24 = isPM ? (n === 12 ? 12 : n + 12) : (n === 12 ? 0 : n)
        if (!isPastTime(h24, minute)) { setHour24(h24); emit(h24, minute) }
      }
      setHourInput('')
    }
  }
  const handleMinInput = (e) => {
    const raw = e.target.value.replace(/\D/g,'')
    setMinInput(raw)
    const n = parseInt(raw)
    if (raw.length === 2) {
      if (n >= 0 && n <= 59) { setMinute(n); emit(hour24, n) }
      setMinInput('')
    }
  }

  const pastWarning = isPastTime(hour24, minute)

  return (
    <div className={`rounded-2xl border-[3px] p-3 flex items-center justify-center gap-3 ${pastWarning ? 'border-destructive bg-destructive/10' : 'border-ink bg-background'}`}>
      {/* Hour */}
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => changeHour(1)} className="text-ink/50 hover:text-ink p-0.5"><ChevronLeft size={14} className="rotate-90" /></button>
        <input
          type="text"
          inputMode="numeric"
          value={hourInput || String(hour12).padStart(2,'0')}
          onChange={handleHourInput}
          onFocus={e => { setHourInput(''); e.target.select() }}
          onBlur={() => setHourInput('')}
          className="font-display text-2xl font-black text-ink w-10 text-center bg-transparent outline-none"
          maxLength={2}
        />
        <button type="button" onClick={() => changeHour(-1)} className="text-ink/50 hover:text-ink p-0.5"><ChevronLeft size={14} className="-rotate-90" /></button>
      </div>

      <span className="font-display text-2xl font-black text-ink/40">:</span>

      {/* Minute */}
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => changeMinute(5)} className="text-ink/50 hover:text-ink p-0.5"><ChevronLeft size={14} className="rotate-90" /></button>
        <input
          type="text"
          inputMode="numeric"
          value={minInput || String(minute).padStart(2,'0')}
          onChange={handleMinInput}
          onFocus={e => { setMinInput(''); e.target.select() }}
          onBlur={() => setMinInput('')}
          className="font-display text-2xl font-black text-ink w-10 text-center bg-transparent outline-none"
          maxLength={2}
        />
        <button type="button" onClick={() => changeMinute(-5)} className="text-ink/50 hover:text-ink p-0.5"><ChevronLeft size={14} className="-rotate-90" /></button>
      </div>

      {/* AM/PM */}
      <div className="flex flex-col gap-1 ml-1">
        <button type="button" onClick={() => isPM && toggleAmPm()}
          className={`px-3 py-1 rounded-lg border-2 border-ink font-mono text-[10px] font-bold transition-all ${!isPM ? 'bg-primary text-ink' : 'bg-card text-ink/50'}`}>AM</button>
        <button type="button" onClick={() => !isPM && toggleAmPm()}
          className={`px-3 py-1 rounded-lg border-2 border-ink font-mono text-[10px] font-bold transition-all ${isPM ? 'bg-primary text-ink' : 'bg-card text-ink/50'}`}>PM</button>
      </div>
    </div>
  )
}

// ── Main modal ───────────────────────────────────────────────────
export default function AddTaskModal({ onClose, onAdd, onUpdate, defaultDate, editTask }) {
  const isEdit = !!editTask
  const now = new Date()
  const { templates, saveTemplate, deleteTemplate } = useTemplates()

  const initDate = isEdit && editTask.due_at
    ? format(new Date(editTask.due_at), 'yyyy-MM-dd')
    : defaultDate || format(now, 'yyyy-MM-dd')

  const initTime = isEdit && editTask.due_at && editTask.has_time_deadline
    ? format(new Date(editTask.due_at), 'HH:mm')
    : ''

  const [title, setTitle] = useState(isEdit ? editTask.title : '')
  const [description, setDescription] = useState(isEdit ? (editTask.description || '') : '')
  const [due_date, setDueDate] = useState(initDate)
  const [due_time, setDueTime] = useState(initTime)
  const [showTime, setShowTime] = useState(isEdit && editTask.has_time_deadline)
  const [priority, setPriority] = useState(isEdit ? editTask.priority : 'normal')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selected = LEVELS.find(l => l.value === priority)

  const handleToggleTime = () => {
    if (!showTime && !due_time) {
      const h = String(now.getHours()).padStart(2, '0')
      const m = String(Math.ceil(now.getMinutes() / 5) * 5 % 60).padStart(2, '0')
      setDueTime(`${h}:${m}`)
    }
    setShowTime(t => !t)
    if (showTime) setDueTime('')
  }

  const handle = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    setError('')

    if (isEdit) {
      const { error } = await onUpdate(editTask.id, {
        title: title.trim(),
        description,
        due_date,
        due_time: showTime ? due_time : '',
        priority,
        has_time_deadline: showTime,
      })
      if (error) { setError(error.message); setLoading(false) }
      else onClose()
    } else {
      const { error } = await onAdd({ title: title.trim(), description, due_date, due_time: showTime ? due_time : '', priority })
      if (error) { setError(error.message); setLoading(false) }
      else onClose()
    }
  }

  const displayDate = due_date ? format(new Date(due_date + 'T12:00'), 'EEE, MMM d yyyy') : 'Pick a date'

  const displayTime = () => {
    if (!due_time) return ''
    const [h, m] = due_time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border-[3px] border-ink p-6 pb-8 max-h-[92dvh] overflow-y-auto shadow-sticker-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-xl font-black text-ink">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border-[3px] border-ink bg-background active:translate-y-0.5 transition-all"
            aria-label="Close"
          >
            <X size={16} className="text-ink" strokeWidth={2.5} />
          </button>
        </div>

        {/* Templates row */}
        {!isEdit && templates.length > 0 && (
          <div className="mb-4">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50 mb-2">Templates</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {templates.map(t => {
                const level = LEVELS.find(l => l.value === t.priority)
                return (
                  <div key={t.id} className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => { setTitle(t.title); setDescription(t.description); setPriority(t.priority) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-ink bg-card font-bold text-xs text-ink transition-all active:scale-95 shadow-sticker-sm"
                    >
                      <span className={`w-2 h-2 rounded-full border border-ink ${level.color}`} />
                      {t.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      className="text-ink/30 hover:text-destructive transition-colors flex-shrink-0"
                      aria-label="Delete template"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <form onSubmit={handle} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full bg-background text-ink rounded-xl px-4 py-3 pr-10 text-sm font-medium outline-none border-[3px] border-ink"
              placeholder="What do you need to do?"
            />
            {!isEdit && (
              <button
                type="button"
                onClick={() => saveTemplate({ title, description, priority })}
                disabled={!title.trim()}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                  templates.some(t => t.title === title.trim() && t.priority === priority)
                    ? 'text-ink'
                    : title.trim()
                      ? 'text-ink/50 hover:text-ink'
                      : 'text-ink/20'
                }`}
                title="Save as template"
              >
                {templates.some(t => t.title === title.trim() && t.priority === priority)
                  ? <BookmarkCheck size={16} strokeWidth={2.5} />
                  : <Bookmark size={16} strokeWidth={2.5} />
                }
              </button>
            )}
          </div>

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-background text-ink rounded-xl px-4 py-3 text-sm outline-none border-[3px] border-ink resize-none"
            placeholder="Notes (optional)"
          />

          {/* Date */}
          <div>
            <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-2 flex items-center gap-1.5">
              <CalendarDays size={11} strokeWidth={2.5} /> Date · {displayDate}
            </label>
            <InlineCalendar selected={due_date} onSelect={setDueDate} />
          </div>

          {/* Deadline toggle */}
          <div>
            <button
              type="button"
              onClick={handleToggleTime}
              className={`flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest transition-colors ${showTime ? 'text-ink' : 'text-ink/50 hover:text-ink'}`}
            >
              <Clock size={12} strokeWidth={2.5} />
              {showTime ? `Deadline · ${displayTime()}` : 'Add deadline (optional)'}
            </button>

            {showTime && (
              <div className="mt-2">
                <TimePicker value={due_time} onChange={setDueTime} selectedDate={due_date} />
                <p className="font-mono text-[10px] font-bold text-ink/50 mt-1.5 px-1">
                  Complete before this time for a bonus · miss it for a penalty
                </p>
              </div>
            )}
          </div>

          {/* Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60">Class</label>
              <span className="font-display text-xs font-black text-ink">
                L{selected.num} · {selected.label} · {selected.points}pt
              </span>
            </div>
            <div className="flex gap-1.5">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setPriority(l.value)}
                  className={`flex-1 flex flex-col items-center py-2 rounded-xl border-[3px] transition-all ${
                    priority === l.value
                      ? `border-ink ${l.color} shadow-sticker-sm`
                      : 'border-ink/20 bg-card'
                  }`}
                >
                  <span className={`font-display text-sm font-black ${priority === l.value ? 'text-ink' : 'text-ink/60'}`}>
                    {l.num}
                  </span>
                  <span className={`font-mono text-[9px] font-bold mt-0.5 ${priority === l.value ? 'text-ink' : 'text-ink/40'}`}>
                    {l.short}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="font-mono text-xs font-bold text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full bg-primary border-[3px] border-ink text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-xl py-3 shadow-sticker active:translate-y-0.5 active:shadow-sticker-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : `Add Task · ${selected.points}${showTime ? `+${selected.timeBonus}` : ''} pts`}
          </button>
        </form>
      </div>
    </div>
  )
}
