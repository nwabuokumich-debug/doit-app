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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm px-0 sm:px-4">
      <div className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border-[3px] border-ink p-6 pb-8 shadow-sticker-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0 mr-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-1 flex items-center gap-1.5">
              <StickyNote size={11} strokeWidth={2.5} /> Notes for
            </p>
            <h2 className="font-display text-lg font-black text-ink line-clamp-1">{task.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-xl border-[3px] border-ink bg-background active:translate-y-0.5 transition-all flex-shrink-0"
            aria-label="Close"
          >
            <X size={16} className="text-ink" strokeWidth={2.5} />
          </button>
        </div>

        <form onSubmit={handle} className="space-y-3">
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={5}
            autoFocus
            className="w-full bg-background text-ink rounded-xl px-4 py-3 text-sm outline-none border-[3px] border-ink resize-none"
            placeholder="Add notes, reflections, or anything about this task…"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary border-[3px] border-ink text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-xl py-3 shadow-sticker active:translate-y-0.5 active:shadow-sticker-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save Note'}
          </button>
        </form>
      </div>
    </div>
  )
}
