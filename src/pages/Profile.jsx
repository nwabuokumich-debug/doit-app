import { format } from 'date-fns'
import { LogOut, User, Bell, BellOff } from 'lucide-react'
import { useState } from 'react'

export default function Profile({ user, tasks, onSignOut }) {
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifStatus, setNotifStatus] = useState('')

  const totalEarned = tasks.filter(t => t.completed).reduce((s, t) => s + t.points, 0)
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('Notifications not supported in this browser')
      return
    }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotifEnabled(true)
      setNotifStatus('Notifications enabled!')
      // Schedule a test nudge
      new Notification('DoIt', { body: "You're all set! We'll remind you about your tasks.", icon: '/icon-192.png' })
    } else {
      setNotifStatus('Permission denied — enable in browser settings')
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 pt-6 pb-6 space-y-5">
        <h1 className="text-2xl font-bold text-white">Profile</h1>

        {/* Avatar & email */}
        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
            <User size={24} className="text-indigo-400" />
          </div>
          <div>
            <p className="text-white font-semibold">{user.email}</p>
            <p className="text-xs text-gray-500 mt-0.5">Member since {format(new Date(user.created_at), 'MMM yyyy')}</p>
          </div>
        </div>

        {/* All-time stats */}
        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">All-Time Stats</p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-400">{totalEarned}</p>
              <p className="text-xs text-gray-500 mt-1">Total Points</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{completedTasks}</p>
              <p className="text-xs text-gray-500 mt-1">Tasks Done</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-400">{completionRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Success Rate</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-4">Notifications</p>
          <button
            onClick={requestNotifications}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl transition-colors ${
              notifEnabled
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-[#252525] border border-white/5 text-gray-300'
            }`}
          >
            {notifEnabled ? <Bell size={18} /> : <BellOff size={18} />}
            <span className="text-sm font-medium">
              {notifEnabled ? 'Notifications on' : 'Enable Notifications'}
            </span>
          </button>
          {notifStatus && <p className="text-xs text-gray-500 mt-2 px-1">{notifStatus}</p>}
          <p className="text-xs text-gray-600 mt-3 px-1">
            Get reminders when tasks are due, and nudges for things you haven't completed yet.
          </p>
        </div>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  )
}
