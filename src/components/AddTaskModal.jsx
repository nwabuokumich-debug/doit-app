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
    <div className="bg-[#252525] rounded-2xl p-3 border border-white/5">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => setViewMonth(m => subMonths(m, 1))} className="text-gray-400 hover:text-white p-1">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-white">{format(viewMonth, 'MMMM yyyy')}</p>
        <button type="button" onClick={() => setViewMonth(m => addMonths(m, 1))} className="text-gray-400 hover:text-white p-1">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] text-gray-600 font-medium py-0.5">{d}</div>
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
              className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                isSelected ? 'bg-indigo-500 text-white' :
                todayFlag  ? 'bg-white/10 text-white' :
                isPast     ? 'text-gray-700 cursor-not-allowed' :
                             'text-gray-400 hover:bg-white/5'
              }`}
            >
              {format(day, 'd')}
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

  const isToday = selectedDate === format(now, 'yyyy-MM-dd')

  const isPastTime = (h24, m) => {
    if (!isToday) return false
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

  // Typing handlers
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
    <div className={`bg-[#252525] rounded-2xl border p-3 flex items-center justify-center gap-3 ${pastWarning ? 'border-red-500/30' : 'border-white/5'}`}>
      {/* Hour */}
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => changeHour(1)} className="text-gray-500 hover:text-white p-1"><ChevronLeft size={14} className="rotate-90" /></button>
        <input
          type="text"
          inputMode="numeric"
          value={hourInput || String(hour12).padStart(2,'0')}
          onChange={handleHourInput}
          onFocus={e => { setHourInput(''); e.target.select() }}
          onBlur={() => setHourInput('')}
          className="text-2xl font-bold text-white w-10 text-center bg-transparent outline-none"
          maxLength={2}
        />
        <button type="button" onClick={() => changeHour(-1)} className="text-gray-500 hover:text-white p-1"><ChevronLeft size={14} className="-rotate-90" /></button>
      </div>

      <span className="text-2xl font-bold text-gray-400">:</span>

      {/* Minute */}
      <div className="flex flex-col items-center gap-1">
        <button type="button" onClick={() => changeMinute(5)} className="text-gray-500 hover:text-white p-1"><ChevronLeft size={14} className="rotate-90" /></button>
        <input
          type="text"
          inputMode="numeric"
          value={minInput || String(minute).padStart(2,'0')}
          onChange={handleMinInput}
          onFocus={e => { setMinInput(''); e.target.select() }}
          onBlur={() => setMinInput('')}
          className="text-2xl font-bold text-white w-10 text-center bg-transparent outline-none"
          maxLength={2}
        />
        <button type="button" onClick={() => changeMinute(-5)} className="text-gray-500 hover:text-white p-1"><ChevronLeft size={14} className="-rotate-90" /></button>
      </div>

      {/* AM/PM */}
      <div className="flex flex-col gap-1 ml-1">
        <button type="button" onClick={() => isPM && toggleAmPm()}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!isPM ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}>AM</button>
        <button type="button" onClick={() => !isPM && toggleAmPm()}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isPM ? 'bg-indigo-500 text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'}`}>PM</button>
      </div>

      {pastWarning && <p className="absolute mt-16 text-[10px] text-red-400">This time has passed</p>}
    </div>
  )
}

// ── Main modal ───────────────────────────────────────────────────
export default function AddTaskModal({ onClose, onAdd, onUpdate, defaultDate, editTask }) {
  const isEdit = !!editTask
  const now = new Date()
  const { templates, saveTemplate, deleteTemplate } = useTemplates()

  // Pre-fill from editTask if editing
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

  // Format selected date nicely
  const displayDate = due_date ? format(new Date(due_date + 'T12:00'), 'EEE, MMM d yyyy') : 'Pick a date'

  // Format time for display
  const displayTime = () => {
    if (!due_time) return ''
    const [h, m] = due_time.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl border border-white/5 p-6 pb-8 max-h-[92dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><X size={20} /></button>
        </div>

        {/* Templates row — only show when adding, not editing */}
        {!isEdit && templates.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Templates</p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {templates.map(t => {
                const level = LEVELS.find(l => l.value === t.priority)
                return (
                  <div key={t.id} className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => { setTitle(t.title); setDescription(t.description); setPriority(t.priority) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all active:scale-95 ${level.badge} ${level.ring}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${level.color}`} />
                      {t.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTemplate(t.id)}
                      className="text-gray-700 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <form onSubmit={handle} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full bg-[#252525] text-white rounded-xl px-4 py-3 pr-10 text-sm outline-none border border-white/5 focus:border-indigo-500 transition-colors"
              placeholder="What do you need to do?"
            />
            {!isEdit && (
              <button
                type="button"
                onClick={() => saveTemplate({ title, description, priority })}
                disabled={!title.trim()}
                className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                  templates.some(t => t.title === title.trim() && t.priority === priority)
                    ? 'text-indigo-400'
                    : title.trim()
                      ? 'text-gray-500 hover:text-indigo-400'
                      : 'text-gray-800'
                }`}
                title="Save as template"
              >
                {templates.some(t => t.title === title.trim() && t.priority === priority)
                  ? <BookmarkCheck size={16} />
                  : <Bookmark size={16} />
                }
              </button>
            )}
          </div>

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full bg-[#252525] text-white rounded-xl px-4 py-3 text-sm outline-none border border-white/5 focus:border-indigo-500 transition-colors resize-none"
            placeholder="Notes (optional)"
          />

          {/* Date */}
          <div>
            <label className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
              <CalendarDays size={12} /> Date — {displayDate}
            </label>
            <InlineCalendar selected={due_date} onSelect={setDueDate} />
          </div>

          {/* Deadline toggle */}
          <div>
            <button
              type="button"
              onClick={handleToggleTime}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${showTime ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Clock size={14} />
              {showTime ? `Deadline set — ${displayTime()}` : 'Add deadline (optional)'}
            </button>

            {showTime && (
              <div className="mt-2">
                <TimePicker value={due_time} onChange={setDueTime} selectedDate={due_date} />
                <p className="text-[10px] text-gray-600 mt-1.5 px-1">
                  Complete before this time for a score bonus · miss it for a penalty
                </p>
              </div>
            )}
          </div>

          {/* Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Class</label>
              <span className={`text-xs font-semibold ${selected.text}`}>
                Level {selected.num} — {selected.label} · {selected.points} pts
              </span>
            </div>
            <div className="flex gap-1.5">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setPriority(l.value)}
                  className={`flex-1 flex flex-col items-center py-2.5 rounded-xl border transition-all ${
                    priority === l.value ? `${l.badge} ${l.ring} border` : 'bg-[#252525] border-white/5 text-gray-600'
                  }`}
                >
                  <span className="text-xs font-bold">{l.num}</span>
                  <span className={`text-[9px] mt-0.5 font-medium ${priority === l.value ? '' : 'text-gray-700'}`}>{l.short}</span>
                </button>
              ))}
            </div>
            <div className="flex justify-between mt-1.5 px-0.5">
              {LEVELS.map(l => (
                <span key={l.value} className={`flex-1 text-center text-[9px] ${priority === l.value ? selected.text : 'text-gray-700'}`}>
                  {l.points}
                </span>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : isEdit ? 'Save Changes' : `Add Task · ${selected.points}${showTime ? ` +${selected.timeBonus} possible` : ''} pts`}
          </button>
        </form>
      </div>
    </div>
  )
}
