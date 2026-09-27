import test from 'node:test'
import assert from 'node:assert/strict'
import { scheduleFromInputs, scheduleError, minuteOfDay, moveInterval, layoutBlocks, hasSchedule } from '../src/lib/schedule.js'

process.env.TZ = 'Europe/London'
test('a planned interval has independent timestamps and supports next midnight', () => {
  const fields = scheduleFromInputs('2026-09-27', '17:00', '18:00')
  assert.deepEqual(Object.keys(fields), ['scheduled_start', 'scheduled_end'])
  assert.equal(minuteOfDay(fields.scheduled_start), 1020)
  assert.equal(minuteOfDay(fields.scheduled_end), 1080)
  const midnight = scheduleFromInputs('2026-09-27', '23:00', '24:00')
  assert.equal(new Date(midnight.scheduled_end).getDate(), 28)
  assert.equal(minuteOfDay(midnight.scheduled_end), 0)
})
test('rejects incomplete, reversed, too short and nonexistent local times', () => {
  assert.ok(scheduleError('2026-09-27T17:00:00Z', null))
  assert.ok(scheduleError('bad', 'bad'))
  assert.equal(scheduleError(null, null), '')
  for (const [start, end] of [['18:00', '17:00'], ['17:00', '17:00'], ['17:00', '17:10'], ['', '18:00'], ['23:00', '24:15'], ['25:00', '26:00']]) {
    assert.throws(() => scheduleFromInputs('2026-09-27', start, end))
  }
  assert.throws(() => scheduleFromInputs('2026-03-29', '01:15', '03:00'), /does not exist/)
  assert.equal(hasSchedule({ scheduled_start: 'bad', scheduled_end: 'bad' }), false)
})
test('drag snaps, preserves duration, and clamps at both day boundaries', () => {
  assert.deepEqual(moveInterval(600, 660, 22), { start: 615, end: 675 })
  assert.deepEqual(moveInterval(600, 660, -900), { start: 0, end: 60 })
  assert.deepEqual(moveInterval(600, 660, 1000), { start: 1380, end: 1440 })
  assert.deepEqual(moveInterval(600, 660, -100, true), { start: 600, end: 615 })
  assert.deepEqual(moveInterval(600, 660, 1000, true), { start: 600, end: 1440 })
})
test('overlap chains allocate stable distinct lanes, reusing free lanes', () => {
  const blocks = [ [1, 540, 660], [2, 600, 720], [3, 690, 780], [4, 800, 860] ]
    .map(([id, start, end]) => ({ task: { id }, start, end }))
  const result = layoutBlocks(blocks)
  assert.deepEqual(result.map(b => [b.lane, b.lanes]), [[0, 2], [1, 2], [0, 2], [0, 1]])
  const shorts = layoutBlocks([{ task: { id: 1 }, start: 0, end: 15 }, { task: { id: 2 }, start: 15, end: 30 }], 34)
  assert.equal(shorts[1].lanes, 2)
})
