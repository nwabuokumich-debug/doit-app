// Planner times use local wall-clock minutes. 1440 means next midnight.
export const MIN_DURATION = 15
export function minuteOfDay(value) {
  const date = new Date(value)
  return date.getHours() * 60 + date.getMinutes()
}
export function atMinute(day, minute) {
  const date = new Date(`${day}T00:00:00`)
  date.setMinutes(minute)
  return date.toISOString()
}
export function hasSchedule(task) {
  return !!(task.scheduled_start && task.scheduled_end &&
    new Date(task.scheduled_end) > new Date(task.scheduled_start))
}
export function scheduleError(start, end) {
  if (start == null && end == null) return ''
  if (!start || !end || !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end))) return 'Choose both planned start and end times.'
  if (new Date(end) <= new Date(start)) return 'Planned end must be after start.'
  return ''
}
export function timeValue(minute) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}
export function scheduleFromInputs(day, start, end) {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start || '') ||
      !/^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/.test(end || '')) {
    throw new Error('Choose both planned start and end times.')
  }
  const minutes = value => value.split(':').reduce((h, m) => Number(h) * 60 + Number(m))
  const a = minutes(start), b = minutes(end)
  if (b - a < MIN_DURATION) throw new Error('Plan at least 15 minutes; end must be after start on this day.')
  const fields = { scheduled_start: atMinute(day, a), scheduled_end: atMinute(day, b) }
  // A spring-forward time can normalize silently. Ask for a real local time.
  if (minuteOfDay(fields.scheduled_start) !== a || (b !== 1440 && minuteOfDay(fields.scheduled_end) !== b)) {
    throw new Error('That time does not exist on this date. Choose another time.')
  }
  const error = scheduleError(fields.scheduled_start, fields.scheduled_end)
  if (error) throw new Error(error)
  return fields
}
export function moveInterval(start, end, delta, resize = false) {
  const snapped = Math.round(delta / 15) * 15
  if (resize) return { start, end: Math.max(start + MIN_DURATION, Math.min(1440, end + snapped)) }
  const next = Math.max(0, Math.min(1440 - (end - start), start + snapped))
  return { start: next, end: next + end - start }
}
// Allocate lanes per connected overlap group, including short blocks' visible height.
export function layoutBlocks(blocks, minMinutes = 30) {
  const sorted = blocks.map(b => ({ ...b, visualEnd: Math.max(b.end, b.start + minMinutes) }))
    .sort((a, b) => a.start - b.start || String(a.task.id).localeCompare(String(b.task.id)))
  let group = [], groupEnd = -1
  const result = []
  const flush = () => {
    const ends = []
    for (const block of group) {
      let lane = ends.findIndex(end => end <= block.start)
      if (lane < 0) lane = ends.length
      ends[lane] = block.visualEnd
      block.lane = lane
    }
    result.push(...group.map(b => ({ ...b, lanes: ends.length })))
  }
  for (const block of sorted) {
    if (block.start >= groupEnd) { flush(); group = []; groupEnd = -1 }
    group.push(block)
    groupEnd = Math.max(groupEnd, block.visualEnd)
  }
  flush()
  return result
}
