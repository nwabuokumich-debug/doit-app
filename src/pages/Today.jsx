import { useRef, useState } from 'react'
import {
  format, addDays, subDays, isToday, isTomorrow, isYesterday, isBefore, startOfDay,
  startOfWeek, eachDayOfInterval, endOfWeek, isSameDay
} from 'date-fns'
import { Plus, Zap, ChevronLeft, ChevronRight, CalendarDays, LayoutList, Clock3 } from 'lucide-react'
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

  const isPast = isBefore(startOfDay(selectedDate), startOfDay(new Date()))
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const dayTasks = getTasksForDate(dateStr)
  const score = getDailyScore(dateStr)

  const pct = score.possible > 0 ? Math.round((score.earned / score.possible) * 100) : 0
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

        {/* Score bar — compact */}
        <div className="mt-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/10 rounded-xl px-4 py-2.5 border border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1 flex-shrink-0">
              <span className="text-xl font-bold text-white">{score.earned}</span>
              <span className="text-gray-500 text-xs">/ {score.possible}</span>
            </div>
            <div className="flex-1 h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Zap size={12} className="text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">{pct}%</span>
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-gray-600 mt-1">
            <span>{completed.length} done · {isPast ? 'sealed' : `${pending.length} left`}</span>
            <span>{isToday(selectedDate) ? "Today's Score" : isPast ? 'Final Score' : 'Day Score'}</span>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 mt-3 bg-[#141414] rounded-xl p-1">
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

        {pending.length > 0 && (
          <div className="space-y-2">
            {pending.map(task => (
              <TaskItem key={task.id} task={task} onComplete={onComplete} onUncomplete={onUncomplete} onDelete={onDelete} onUpdate={onUpdate} />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-2 px-1">Completed</p>
            <div className="space-y-2">
              {completed.map(task => (
                <TaskItem key={task.id} task={task} onComplete={onComplete} onUncomplete={onUncomplete} onDelete={onDelete} onUpdate={onUpdate} />
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
          className="absolute bottom-5 right-5 w-14 h-14 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 flex items-center justify-center transition-all z-10"
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
