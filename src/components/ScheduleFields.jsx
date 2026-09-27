export default function ScheduleFields({ enabled, onToggle, start, end, onStart, onEnd }) {
  const inputClass = 'w-full min-w-0 rounded-xl border-[3px] border-ink bg-background px-2 py-2 text-base text-ink'
  return (
    <fieldset className="space-y-2">
      <label className="flex items-center gap-2 font-mono text-xs font-bold text-ink min-h-11">
        <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)} className="size-5 accent-ink" />
        Plan a time (optional)
      </label>
      {enabled && <>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-ink">Planned start
            <input aria-label="Planned start" type="time" required value={start} onChange={e => onStart(e.target.value)} className={inputClass} />
          </label>
          <label className="text-xs font-bold text-ink">Planned end
            {end === '24:00'
              ? <button type="button" onClick={() => onEnd('23:45')} className={inputClass}>Midnight · change</button>
              : <input aria-label="Planned end" type="time" required value={end} onChange={e => onEnd(e.target.value)} className={inputClass} />}
          </label>
        </div>
        <button type="button" onClick={() => onEnd('24:00')} className="text-xs font-bold underline min-h-9">End at midnight</button>
        <p className="text-xs text-ink/60">Reserved time for this day. Deadlines and points stay separate.</p>
      </>}
    </fieldset>
  )
}
