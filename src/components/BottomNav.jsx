import { Home, ListTodo, BarChart2, User } from 'lucide-react'

const TABS = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'profile', label: 'Profile', icon: User },
]

export default function BottomNav({ active, onChange }) {
  return (
    <nav className="flex items-center border-t border-white/5 bg-[#0f0f0f] px-2 pb-safe">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
              isActive ? 'text-indigo-400' : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}
