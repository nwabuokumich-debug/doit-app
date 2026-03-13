import { Home, ListTodo, Activity, BarChart2, User } from 'lucide-react'

const TABS = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'profile', label: 'Profile', icon: User },
]

export default function BottomNav({ active, onChange }) {
  const activeIndex = TABS.findIndex(t => t.id === active)

  return (
    <div className="px-4 pb-3 pt-1" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <nav
        className="relative flex items-center h-[58px] rounded-[26px] px-1"
        style={{
          background: 'rgba(30, 30, 30, 0.65)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '0.5px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.35), inset 0 0.5px 0 rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Sliding glass pill */}
        <div
          className="absolute h-[42px] rounded-[20px] transition-all duration-300 ease-out"
          style={{
            width: `calc(${100 / TABS.length}% - 4px)`,
            left: `calc(${activeIndex * (100 / TABS.length)}% + 2px)`,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'linear-gradient(to bottom, rgba(99,102,241,0.35), rgba(99,102,241,0.15))',
            border: '0.5px solid rgba(129,140,248,0.3)',
            boxShadow: '0 2px 12px rgba(99,102,241,0.2), inset 0 0.5px 0 rgba(165,180,252,0.2)',
          }}
        />

        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative z-10 py-2"
            >
              <Icon
                size={21}
                strokeWidth={isActive ? 2.2 : 1.5}
                className={`transition-colors duration-200 ${isActive ? 'text-indigo-300' : 'text-[#666]'}`}
              />
              <span
                className={`text-[9px] font-medium transition-colors duration-200 ${isActive ? 'text-indigo-300' : 'text-[#555]'}`}
              >
                {label}
              </span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
