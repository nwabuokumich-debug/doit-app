import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  )

  const now = new Date()
  const in30 = new Date(now.getTime() + 31 * 60 * 1000)
  const in29 = new Date(now.getTime() + 29 * 60 * 1000)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('completed', false)
    .eq('has_time_deadline', true)
    .gte('due_at', in29.toISOString())
    .lte('due_at', in30.toISOString())

  if (!tasks || tasks.length === 0) {
    return res.json({ sent: 0 })
  }

  for (const task of tasks) {
    await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: '⏰ Task Due Soon' },
        contents: { en: `"${task.title}" is due in 30 minutes!` },
      })
    })
  }

  res.json({ sent: tasks.length })
}
