import { useState } from 'react'
import { X, StickyNote } from 'lucide-react'

export default function NoteModal({ task, onClose, onUpdate }) {
  const [note, setNote] = useState(task.description || '')
  const [loading, setLoading] = useState(false)

  const handle = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await onUpdate(task.id, { description: note })
    if (!error) onClose()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-[#1a1a1a] rounded-t-3xl sm:rounded-2xl border border-white/5 p-6 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5 flex items-center gap-1.5"><StickyNote size={11} /> Notes for</p>
            <h2 className="text-base font-semibold text-white line-clamp-1">{task.title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 ml-3 flex-shrink-0">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handle} className="space-y-3">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={5}
            autoFocus
            className="w-full bg-[#252525] text-white rounded-xl px-4 py-3 text-sm outline-none border border-white/5 focus:border-indigo-500 transition-colors resize-none"
            placeholder="Add notes, reflections, or anything about this task…"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save Note'}
          </button>
        </form>
      </div>
    </div>
  )
}
