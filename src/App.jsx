import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTasks } from './hooks/useTasks'
import Auth from './components/Auth'
import BottomNav from './components/BottomNav'
import Today from './pages/Today'
import AllTasks from './pages/AllTasks'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'
import ActivityPage from './pages/Activity'

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth()
  const {
    tasks,
    addTask, completeTask, uncompleteTask, deleteTask, updateTask,
    getTasksForDate, getDailyScore,
  } = useTasks(user)

  const [tab, setTab] = useState('today')
  const [selectedDate, setSelectedDate] = useState(new Date())

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Auth onSignIn={signIn} onSignUp={signUp} />
  }

  const renderPage = () => {
    switch (tab) {
      case 'today':
        return (
          <Today
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            getTasksForDate={getTasksForDate}
            getDailyScore={getDailyScore}
            onAdd={addTask}
            onComplete={completeTask}
            onUncomplete={uncompleteTask}
            onDelete={deleteTask}
            onUpdate={updateTask}
          />
        )
      case 'tasks':
        return (
          <AllTasks
            tasks={tasks}
            onAdd={addTask}
            onComplete={completeTask}
            onUncomplete={uncompleteTask}
            onDelete={deleteTask}
            onUpdate={updateTask}
          />
        )
      case 'activity':
        return <ActivityPage user={user} />
      case 'analytics':
        return <Analytics tasks={tasks} getDailyScore={getDailyScore} />
      case 'profile':
        return <Profile user={user} tasks={tasks} onSignOut={signOut} />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-dvh max-w-md mx-auto bg-[#0f0f0f] overflow-hidden">
      <main className="flex-1 overflow-hidden flex flex-col">
        {renderPage()}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}
