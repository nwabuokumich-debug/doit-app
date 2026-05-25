import { useState } from 'react'
import { format, isToday, isTomorrow, isPast } from 'date-fns'
import { Plus, Search } from 'lucide-react'
import TaskItem from '../components/TaskItem'
import AddTaskModal from '../components/AddTaskModal'

function groupTasks(tasks) {
  const groups = {}
  tasks.forEach(task => {
    let label = 'No Date'
    if (task.due_at) {
      const d = new Date(task.due_at)
      if (isToday(d)) label = 'Today'
      else if (isTomorrow(d)) label = 'Tomorrow'
      else if (isPast(d)) label = 'Overdue'
      else label = format(d, 'EEEE, MMMM d')
    }
    if (!groups[label]) groups[label] = []
    groups[label].push(task)
  })
  const order = ['Overdue', 'Today', 'Tomorrow']
  return Object.entries(groups).sort(([a], [b]) => {
    const ai = order.indexOf(a)
    const bi = order.indexOf(b)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return a.localeCompare(b)
  })
}

const TONES = { Overdue: 'bg-destructive', Today: 'bg-primary', Tomorrow: 'bg-accent' }

export default function AllTasks({ tasks, onAdd, onComplete, onUncomplete, onDelete, onUpdate }) {
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | pending | done

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || (filter === 'pending' && !t.completed) || (filter === 'done' && t.completed)
    return matchSearch && matchFilter
  })

  const groups = groupTasks(filtered)
  const pendingCount = tasks.filter(t => !t.completed).length
  const overdueCount = tasks.filter(t => !t.completed && t.due_at && new Date(t.due_at) < new Date()).length

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60 font-bold">
              Your Backlog
            </p>
            <h1 className="font-display text-2xl font-black text-ink leading-none">All Tasks</h1>
          </div>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-2xl border-[3px] border-ink bg-card p-3 shadow-sticker-sm">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/60">Active</p>
            <p className="font-display text-3xl font-black text-ink leading-none mt-1">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border-[3px] border-ink bg-accent p-3 shadow-sticker-sm">
            <p className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink">Overdue</p>
            <p className="font-display text-3xl font-black text-ink leading-none mt-1">{overdueCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-card px-3 py-2 mb-3">
          <Search size={16} className="text-ink/60" strokeWidth={2.5} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="bg-transparent text-sm text-ink outline-none flex-1 placeholder:text-ink/40"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {['all', 'pending', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl border-[3px] border-ink font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${
                filter === f ? 'bg-ink text-background shadow-sticker-sm' : 'bg-card text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 space-y-5">
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-display text-lg font-black text-ink">No tasks found</p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50 mt-2">
              Try a different search or filter
            </p>
          </div>
        )}

        {groups.map(([label, groupTasks]) => (
          <div key={label}>
            <div className="flex items-center gap-2 px-1 mb-2">
              <span className={`size-3 rounded-full border-2 border-ink ${TONES[label] || 'bg-sage'}`} />
              <h2 className="font-display text-lg font-black text-ink">{label}</h2>
              <span className="font-mono text-[10px] font-bold text-ink/40">{groupTasks.length}</span>
            </div>
            <div className="space-y-3">
              {groupTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onComplete={onComplete}
                  onUncomplete={onUncomplete}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Add button at bottom */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-primary border-[3px] border-ink rounded-2xl py-4 flex items-center justify-center gap-2 shadow-sticker active:translate-y-0.5 active:shadow-sticker-sm transition-all"
        >
          <Plus size={18} className="text-ink" strokeWidth={3} />
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink">Add Task</span>
        </button>
      </div>

      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onAdd={onAdd}
        />
      )}
    </div>
  )
}
