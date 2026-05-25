import { format } from 'date-fns'
import { LogOut, User, Bell, BellOff, Trophy } from 'lucide-react'
import { useState } from 'react'

export default function Profile({ user, tasks, onSignOut }) {
  const [notifEnabled, setNotifEnabled] = useState(false)
  const [notifStatus, setNotifStatus] = useState('')

  const totalEarned = tasks.filter(t => t.completed).reduce((s, t) => s + t.points, 0)
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.completed).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Simple level calc: every 100 pts = 1 level
  const level = Math.floor(totalEarned / 100) + 1
  const xpInLevel = totalEarned % 100
  const levelTitle = level >= 10 ? 'Master Doer' : level >= 5 ? 'Daily Doer' : level >= 2 ? 'Getting Started' : 'New Recruit'

  const requestNotifications = async () => {
    if (!('Notification' in window)) {
      setNotifStatus('Notifications not supported in this browser')
      return
    }
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      setNotifEnabled(true)
      setNotifStatus('Notifications enabled!')
      new Notification('DoIt', { body: "You're all set! We'll remind you about your tasks.", icon: '/icon-192.png' })
    } else {
      setNotifStatus('Permission denied — enable in browser settings')
    }
  }

  const initial = (user.email || '?').slice(0, 1).toUpperCase()

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="px-5 pt-5 pb-32 space-y-4">
        {/* Header */}
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60 font-bold">
            Member Since {format(new Date(user.created_at), 'MMM yyyy')}
          </p>
          <h1 className="font-display text-2xl font-black text-ink leading-none">{user.email.split('@')[0]}</h1>
        </div>

        {/* Level card */}
        <section className="rounded-3xl border-[3px] border-ink bg-secondary p-5 shadow-sticker-lg">
          <div className="flex items-center gap-4">
            <div className="flex size-20 items-center justify-center rounded-full border-[3px] border-ink bg-accent">
              <span className="font-display text-3xl font-black text-ink">{initial}</span>
            </div>
            <div className="flex-1">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">Level {level}</p>
              <p className="font-display text-xl font-black text-ink leading-none mt-0.5">{levelTitle}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full border-2 border-ink bg-card">
                <div className="h-full bg-ink" style={{ width: `${xpInLevel}%` }} />
              </div>
              <p className="font-mono text-[10px] font-bold text-ink mt-1">{xpInLevel} / 100 XP</p>
            </div>
          </div>
        </section>

        {/* Stats row */}
        <section className="grid grid-cols-3 gap-3">
          <StatChip label="Points" value={totalEarned} bg="bg-primary" />
          <StatChip label="Done" value={completedTasks} bg="bg-accent" />
          <StatChip label="Success" value={`${completionRate}%`} bg="bg-sage" />
        </section>

        {/* Notifications */}
        <section className="rounded-2xl border-[3px] border-ink bg-card p-4 shadow-sticker">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-3">
            Notifications
          </p>
          <button
            onClick={requestNotifications}
            className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl border-[3px] border-ink transition-all ${
              notifEnabled ? 'bg-sage' : 'bg-background'
            }`}
          >
            {notifEnabled ? <Bell size={18} className="text-ink" strokeWidth={2.5} /> : <BellOff size={18} className="text-ink" strokeWidth={2.5} />}
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-ink">
              {notifEnabled ? 'On' : 'Enable'}
            </span>
          </button>
          {notifStatus && <p className="font-mono text-[10px] font-bold text-ink/60 mt-2 px-1">{notifStatus}</p>}
          <p className="text-xs text-ink/60 mt-3 px-1 leading-relaxed">
            Get reminders when tasks are due, and nudges for things you haven't completed yet.
          </p>
        </section>

        {/* Achievements teaser */}
        <section className="rounded-2xl border-[3px] border-ink bg-accent p-4 shadow-sticker flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl border-[3px] border-ink bg-card">
            <Trophy size={20} className="text-ink" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="font-display text-base font-black text-ink leading-tight">Achievements</p>
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70 mt-0.5">
              {completedTasks} tasks completed
            </p>
          </div>
        </section>

        {/* Sign out */}
        <button
          onClick={onSignOut}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-[3px] border-ink bg-card text-destructive font-mono text-xs font-bold uppercase tracking-widest shadow-sticker active:translate-y-0.5 active:shadow-sticker-sm transition-all"
        >
          <LogOut size={16} strokeWidth={2.5} />
          Sign Out
        </button>
      </div>
    </div>
  )
}

function StatChip({ label, value, bg }) {
  return (
    <div className={`rounded-2xl border-[3px] border-ink ${bg} p-3 shadow-sticker-sm`}>
      <div className="font-display text-2xl font-black text-ink leading-none">{value}</div>
      <div className="font-mono mt-1 text-[9px] font-bold uppercase tracking-widest text-ink/70">{label}</div>
    </div>
  )
}
