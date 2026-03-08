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
  // Sort: Overdue first, then Today, Tomorrow, future
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-bold text-white mb-4">All Tasks</h1>

        {/* Search */}
        <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl px-3 py-2 border border-white/5 mb-3">
          <Search size={16} className="text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="bg-transparent text-sm text-white outline-none flex-1 placeholder-gray-600"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {['all', 'pending', 'done'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-indigo-500 text-white'
                  : 'bg-[#1a1a1a] text-gray-400 border border-white/5'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        {groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-400 font-medium">No tasks found</p>
            <p className="text-gray-600 text-sm mt-1">Try a different search or filter</p>
          </div>
        )}

        {groups.map(([label, groupTasks]) => (
          <div key={label}>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${
              label === 'Overdue' ? 'text-red-400' : 'text-gray-500'
            }`}>
              {label}
            </p>
            <div className="space-y-2">
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
      </div>

      {/* FAB */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setShowModal(true)}
          className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add Task
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
