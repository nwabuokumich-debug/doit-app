import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Star, Flame } from 'lucide-react'
import { subscribeCelebration } from '../lib/celebrate'

const CONFETTI_COLORS = [
  'oklch(0.72 0.21 25)',
  'oklch(0.78 0.14 275)',
  'oklch(0.85 0.18 95)',
  'oklch(0.86 0.09 145)',
  'oklch(0.15 0 0)',
]

function tierForPoints(pts) {
  if (pts >= 10) return { count: 44, badge: 'text-4xl', star: 26 }
  if (pts >= 4)  return { count: 28, badge: 'text-3xl', star: 22 }
  return            { count: 16, badge: 'text-2xl', star: 18 }
}

function Confetti({ origin, count, delay = 0, seed }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const distance = 80 + Math.random() * 140
    return {
      id: i,
      cx: Math.cos(angle) * distance,
      cy: Math.sin(angle) * distance,
      cr: (Math.random() - 0.5) * 1080,
      color: CONFETTI_COLORS[(i + Math.floor(Math.random() * 2)) % CONFETTI_COLORS.length],
      shape: i % 4,
      size: 8 + Math.random() * 7,
      pDelay: delay + Math.random() * 80,
    }
  }), [count, delay, seed])

  if (!origin) return null
  return (
    <div className="fixed inset-0 z-[9000] pointer-events-none overflow-hidden">
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti-piece absolute"
          style={{
            left: origin.x,
            top: origin.y,
            '--cx': `${p.cx}px`,
            '--cy': `${p.cy}px`,
            '--cr': `${p.cr}deg`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            border: '2px solid oklch(0.15 0 0)',
            borderRadius: p.shape === 0 ? '50%' : p.shape === 1 ? '0' : p.shape === 2 ? '20%' : '50% 0 50% 0',
            transform: 'translate(-50%, -50%)',
            animationDelay: `${p.pDelay}ms`,
          }}
        />
      ))}
    </div>
  )
}

export default function CelebrationRoot() {
  const [event, setEvent] = useState(null)

  useEffect(() => {
    return subscribeCelebration(payload => {
      setEvent({ ...payload, key: Date.now() + Math.random() })
      setTimeout(() => setEvent(prev => (prev && prev.key === payload.key ? null : prev)), 2000)
    })
  }, [])

  if (!event) return null
  const { origin, points, combo, key } = event
  const tier = tierForPoints(points)
  const totalPts = points + (combo || 0)
  const newComboLevel = (combo || 0) + 1
  const showFlash = combo >= 2
  const showWaveTwo = combo >= 4
  const showComboSplash = combo >= 9

  return createPortal(
    <>
      <Confetti seed={key} origin={origin} count={tier.count} />
      {showWaveTwo && <Confetti seed={`${key}-2`} origin={origin} count={24} delay={260} />}

      {showFlash && (
        <div
          className="fixed inset-0 z-[9001] pointer-events-none screen-flash"
          style={{
            boxShadow:
              'inset 0 0 90px 24px oklch(0.85 0.18 95 / 0.55), inset 0 0 0 6px oklch(0.85 0.18 95 / 0.6)',
          }}
        />
      )}

      <div
        key={`badge-${key}`}
        className="float-badge pointer-events-none fixed left-1/2 top-[30%] z-[9999] flex items-center gap-2 rounded-2xl border-[3px] border-ink bg-accent px-4 py-2 shadow-sticker-lg"
      >
        <Star size={tier.star} className="text-ink" strokeWidth={2.75} fill="currentColor" />
        <span className={`font-display ${tier.badge} font-black text-ink leading-none tabular-nums`}>
          +{totalPts}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/70">
          {combo > 0 ? `×${newComboLevel} combo` : 'pts'}
        </span>
      </div>

      {showComboSplash && (
        <div
          key={`splash-${key}`}
          className="splash-anim fixed top-1/2 left-1/2 z-[9002] pointer-events-none flex items-center gap-3 rounded-3xl border-[3px] border-ink bg-primary px-7 py-4 shadow-sticker-lg"
        >
          <Flame size={36} className="text-ink" strokeWidth={2.5} fill="currentColor" />
          <span className="font-display text-5xl font-black text-ink leading-none">
            ×{newComboLevel} COMBO!
          </span>
        </div>
      )}
    </>,
    document.body
  )
}
