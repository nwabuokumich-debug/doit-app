export const LEVELS = [
  { value: 'trivial', label: 'Trivial', short: 'Triv', points: 1,  num: 1, timeBonus: 1, timePenalty: -4, color: 'bg-slate-500',   text: 'text-slate-400',   badge: 'bg-slate-500/20 text-slate-400',   ring: 'border-slate-500/40' },
  { value: 'easy',    label: 'Easy',    short: 'Easy', points: 2,  num: 2, timeBonus: 1, timePenalty: -4, color: 'bg-green-500',   text: 'text-green-400',   badge: 'bg-green-500/20 text-green-400',   ring: 'border-green-500/40' },
  { value: 'simple',  label: 'Simple',  short: 'Simp', points: 4,  num: 3, timeBonus: 1, timePenalty: -4, color: 'bg-teal-500',    text: 'text-teal-400',    badge: 'bg-teal-500/20 text-teal-400',    ring: 'border-teal-500/40' },
  { value: 'medium',  label: 'Medium',  short: 'Med',  points: 7,  num: 4, timeBonus: 2, timePenalty: -3, color: 'bg-yellow-500',  text: 'text-yellow-400',  badge: 'bg-yellow-500/20 text-yellow-400',  ring: 'border-yellow-500/40' },
  { value: 'hard',    label: 'Hard',    short: 'Hard', points: 10, num: 5, timeBonus: 3, timePenalty: -3, color: 'bg-orange-500',  text: 'text-orange-400',  badge: 'bg-orange-500/20 text-orange-400',  ring: 'border-orange-500/40' },
  { value: 'tough',   label: 'Tough',   short: 'Tuff', points: 14, num: 6, timeBonus: 3, timePenalty: -3, color: 'bg-red-500',     text: 'text-red-400',     badge: 'bg-red-500/20 text-red-400',     ring: 'border-red-500/40' },
  { value: 'epic',    label: 'Epic',    short: 'Epic', points: 20, num: 7, timeBonus: 5, timePenalty: -2, color: 'bg-purple-500',  text: 'text-purple-400',  badge: 'bg-purple-500/20 text-purple-400',  ring: 'border-purple-500/40' },
]

export const LEVEL_MAP = Object.fromEntries(LEVELS.map(l => [l.value, l]))

export function getLevel(value) {
  return LEVEL_MAP[value] ?? LEVELS[3] // default medium
}
