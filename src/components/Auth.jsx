import { useState } from 'react'
import { CheckSquare } from 'lucide-react'

export default function Auth({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState('')
  const [message, setMessage] = useState('')

  const handle = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const fn = mode === 'signin' ? onSignIn : onSignUp
    const { error } = await fn(email, password)

    if (error) {
      setError(error.message)
    } else if (mode === 'signup') {
      setMessage('Check your email to confirm your account!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 rounded-2xl border-[3px] border-ink bg-primary flex items-center justify-center shadow-sticker mb-4">
            <CheckSquare size={28} className="text-ink" strokeWidth={2.75} />
          </div>
          <h1 className="font-display text-4xl font-black text-ink">DoIt</h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/60 font-bold mt-2">
            Track · Earn · Win the Day
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border-[3px] border-ink bg-card p-6 shadow-sticker-lg">
          <h2 className="font-display text-xl font-black text-ink mb-5">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>

          <form onSubmit={handle} className="space-y-3">
            <div>
              <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-background text-ink rounded-xl px-4 py-3 text-sm outline-none border-[3px] border-ink"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/60 mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-background text-ink rounded-xl px-4 py-3 text-sm outline-none border-[3px] border-ink"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="font-mono text-xs font-bold text-destructive">{error}</p>}
            {message && <p className="font-mono text-xs font-bold text-ink bg-sage rounded-lg px-3 py-2 border-2 border-ink">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary border-[3px] border-ink text-ink font-mono text-xs font-bold uppercase tracking-widest rounded-xl py-3 shadow-sticker active:translate-y-0.5 active:shadow-sticker-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-ink/60 mt-5">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('') }}
              className="font-bold text-ink underline underline-offset-2"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
