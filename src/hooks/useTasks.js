import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { getLevel } from '../lib/levels'

const LATE_PENALTY = 2

export function isLate(task) {
  if (!task.completed || !task.due_at || !task.completed_at || !task.has_time_deadline) return false
  return new Date(task.completed_at) > new Date(task.due_at)
}

export function isOnTime(task) {
  if (!task.completed || !task.due_at || !task.completed_at || !task.has_time_deadline) return false
  return new Date(task.completed_at) <= new Date(task.due_at)
}

export function earnedPoints(task) {
  if (!task.completed) return 0
  const level = getLevel(task.priority)
  let pts = task.points + (task.bonus_points || 0)
  if (isOnTime(task)) pts += level.timeBonus
  if (isLate(task))   pts += level.timePenalty
  return Math.max(0, pts)
}

export function useTasks(user) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTasks = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('due_at', { ascending: true })
    if (!error) setTasks(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const addTask = async ({ title, description, due_date, due_time, priority }) => {
    const level = getLevel(priority)
    const hasTime = !!due_time
    const due_at = due_date
      ? new Date(`${due_date}T${due_time || '23:59'}:00`).toISOString()
      : null

    // Optimistic: add a temporary task immediately
    const tempId = `temp-${Date.now()}`
    const tempTask = {
      id: tempId,
      user_id: user.id,
      title,
      description,
      due_at,
      has_time_deadline: hasTime,
      priority,
      points: level.points,
      completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
    }
    setTasks(prev => [...prev, tempTask].sort((a, b) => (a.due_at ?? '') > (b.due_at ?? '') ? 1 : -1))

    const { data, error } = await supabase.from('tasks').insert({
      user_id: user.id,
      title,
      description,
      due_at,
      has_time_deadline: hasTime,
      priority,
      points: level.points,
      completed: false,
    }).select().single()

    if (error) {
      // Revert
      setTasks(prev => prev.filter(t => t.id !== tempId))
      return { error }
    }
    // Replace temp with real
    setTasks(prev => prev.map(t => t.id === tempId ? data : t))
    return { error: null }
  }

  const completeTask = async (taskId, multiplier = 1) => {
    const now = new Date().toISOString()
    const task = tasks.find(t => t.id === taskId)
    const bonusPoints = multiplier
    // Optimistic
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: true, completed_at: now, bonus_points: bonusPoints } : t
    ))
    const { error } = await supabase
      .from('tasks')
      .update({ completed: true, completed_at: now, bonus_points: bonusPoints })
      .eq('id', taskId)
    if (error) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, completed: false, completed_at: null, bonus_points: 0 } : t
      ))
    }
    return { error }
  }

  const uncompleteTask = async (taskId) => {
    // Optimistic
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: false, completed_at: null, bonus_points: 0 } : t
    ))
    const { error } = await supabase
      .from('tasks')
      .update({ completed: false, completed_at: null, bonus_points: 0 })
      .eq('id', taskId)
    if (error) fetchTasks()
    return { error }
  }

  const deleteTask = async (taskId) => {
    // Optimistic
    const prev = tasks.find(t => t.id === taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) {
      setTasks(p => [...p, prev].sort((a, b) => (a.due_at ?? '') > (b.due_at ?? '') ? 1 : -1))
    }
    return { error }
  }

  const updateTask = async (taskId, updates) => {
    if (updates.priority) updates.points = getLevel(updates.priority).points
    if (updates.due_date) {
      updates.due_at = new Date(`${updates.due_date}T${updates.due_time || '23:59'}:00`).toISOString()
      delete updates.due_date
      delete updates.due_time
    }
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
    const { error } = await supabase.from('tasks').update(updates).eq('id', taskId)
    if (error) fetchTasks()
    return { error }
  }

  const getTasksForDate = (dateStr) => {
    return tasks.filter(t => {
      if (!t.due_at) return false
      return format(new Date(t.due_at), 'yyyy-MM-dd') === dateStr
    })
  }

  const getDailyScore = (dateStr) => {
    const dayTasks = getTasksForDate(dateStr)
    const earned = dayTasks.reduce((s, t) => s + earnedPoints(t), 0)
    const possible = dayTasks.reduce((s, t) => s + t.points, 0)
    return { earned, possible, tasks: dayTasks }
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayTasks = getTasksForDate(todayStr)
  const todayScore = getDailyScore(todayStr)

  return {
    tasks,
    loading,
    todayTasks,
    todayScore,
    addTask,
    completeTask,
    uncompleteTask,
    deleteTask,
    updateTask,
    getTasksForDate,
    getDailyScore,
    refetch: fetchTasks,
  }
}
