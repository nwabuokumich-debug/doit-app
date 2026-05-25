import { Home, ListTodo, Activity, BarChart2, User } from 'lucide-react'

const TABS = [
  { id: 'today',     label: 'Today',  icon: Home },
  { id: 'tasks',     label: 'Tasks',  icon: ListTodo },
  { id: 'activity',  label: 'Active', icon: Activity },
  { id: 'analytics', label: 'Graph',  icon: BarChart2 },
  { id: 'profile',   label: 'Me',     icon: User },
]

export default function BottomNav({ active, onChange }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 z-50 flex justify-center px-4"
      style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
    >
      <nav className="flex h-16 w-full max-w-[400px] items-center justify-between rounded-full border-[3px] border-ink bg-ink px-3 shadow-sticker-lg">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex flex-1 items-center justify-center"
              aria-label={label}
            >
              {isActive ? (
                <div className="flex items-center gap-1.5 rounded-full border-[3px] border-ink bg-accent px-3 py-1.5 shadow-sticker-sm">
                  <Icon className="size-4 text-ink" strokeWidth={2.75} />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">
                    {label}
                  </span>
                </div>
              ) : (
                <Icon className="size-5 text-white/55" strokeWidth={2.25} />
              )}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
