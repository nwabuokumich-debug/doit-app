import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { startOfDay, format } from 'date-fns'

export function useActivities(user) {
  const [activities, setActivities] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (data) setActivities(data)
  }, [user])

  const fetchSessions = useCallback(async () => {
    if (!user) return
    const todayStart = startOfDay(new Date()).toISOString()
    const { data } = await supabase
      .from('activity_sessions')
      .select('*')
      .eq('user_id', user.id)
      .or(`started_at.gte.${todayStart},ended_at.is.null`)
      .order('started_at', { ascending: true })
    if (data) setSessions(data)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchActivities()
    fetchSessions()
  }, [fetchActivities, fetchSessions])

  // Real-time sync
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('activities-realtime')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'activities',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setActivities(prev => {
            if (prev.some(a => a.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        } else if (payload.eventType === 'UPDATE') {
          setActivities(prev => prev.map(a => a.id === payload.new.id ? payload.new : a))
        } else if (payload.eventType === 'DELETE') {
          setActivities(prev => prev.filter(a => a.id !== payload.old.id))
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'activity_sessions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSessions(prev => {
            if (prev.some(s => s.id === payload.new.id)) return prev
            return [...prev, payload.new]
          })
        } else if (payload.eventType === 'UPDATE') {
          setSessions(prev => prev.map(s => s.id === payload.new.id ? payload.new : s))
        } else if (payload.eventType === 'DELETE') {
          setSessions(prev => prev.filter(s => s.id !== payload.old.id))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const activeSessions = sessions.filter(s => !s.ended_at)

  const addActivity = async ({ name, color }) => {
    const tempId = `temp-${Date.now()}`
    const temp = { id: tempId, user_id: user.id, name, color, created_at: new Date().toISOString() }
    setActivities(prev => [...prev, temp])
    const { data, error } = await supabase
      .from('activities')
      .insert({ user_id: user.id, name, color })
      .select().single()
    if (error) {
      setActivities(prev => prev.filter(a => a.id !== tempId))
      return { error }
    }
    setActivities(prev => prev.map(a => a.id === tempId ? data : a))
    return { error: null }
  }

  const deleteActivity = async (id) => {
    const prev = activities.find(a => a.id === id)
    setActivities(p => p.filter(a => a.id !== id))
    setSessions(p => p.filter(s => s.activity_id !== id))
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) {
      setActivities(p => [...p, prev])
      fetchSessions()
    }
    return { error }
  }

  const startSession = async (activityId) => {
    const now = new Date().toISOString()
    // Start new session
    const tempId = `temp-${Date.now()}`
    const temp = { id: tempId, activity_id: activityId, user_id: user.id, started_at: now, ended_at: null }
    setSessions(prev => [...prev, temp])
    const { data, error } = await supabase
      .from('activity_sessions')
      .insert({ activity_id: activityId, user_id: user.id, started_at: now })
      .select().single()
    if (error) {
      setSessions(prev => prev.filter(s => s.id !== tempId))
      return { error }
    }
    setSessions(prev => prev.map(s => s.id === tempId ? data : s))
    return { error: null }
  }

  const stopSession = async (activityId) => {
    const session = sessions.find(s => !s.ended_at && s.activity_id === activityId)
    if (!session) return { error: null }
    const now = new Date().toISOString()
    setSessions(prev => prev.map(s =>
      s.id === session.id ? { ...s, ended_at: now } : s
    ))
    const { error } = await supabase
      .from('activity_sessions')
      .update({ ended_at: now })
      .eq('id', session.id)
    if (error) fetchSessions()
    return { error }
  }

  const getTodaySessions = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    return sessions.filter(s => {
      const start = new Date(s.started_at)
      return format(start, 'yyyy-MM-dd') === todayStr
    })
  }

  const getTodaySummary = () => {
    const todaySessions = getTodaySessions()
    const now = Date.now()
    const byActivity = {}
    for (const s of todaySessions) {
      const end = s.ended_at ? new Date(s.ended_at).getTime() : now
      const start = new Date(s.started_at).getTime()
      const secs = Math.max(0, (end - start) / 1000)
      if (!byActivity[s.activity_id]) {
        const act = activities.find(a => a.id === s.activity_id)
        byActivity[s.activity_id] = {
          activityId: s.activity_id,
          name: act?.name || 'Unknown',
          color: act?.color || '#6366f1',
          totalSeconds: 0,
        }
      }
      byActivity[s.activity_id].totalSeconds += secs
    }
    return Object.values(byActivity).sort((a, b) => b.totalSeconds - a.totalSeconds)
  }

  return {
    activities,
    sessions,
    activeSessions,
    loading,
    addActivity,
    deleteActivity,
    startSession,
    stopSession,
    getTodaySessions,
    getTodaySummary,
  }
}

export function formatDuration(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}
