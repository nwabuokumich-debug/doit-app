// Tiny pub/sub so any TaskItem can fire a celebration that survives
// its own unmount (e.g. when a completed task moves to another list).
const listeners = new Set()

export function emitCelebration(payload) {
  listeners.forEach(l => l(payload))
}

export function subscribeCelebration(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
