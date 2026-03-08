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
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center mb-4">
            <CheckSquare size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">DoIt</h1>
          <p className="text-gray-400 mt-1 text-sm">Track tasks. Earn points. Win days.</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
          <h2 className="text-lg font-semibold text-white mb-5">
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </h2>

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#252525] text-white rounded-xl px-4 py-3 text-sm outline-none border border-white/5 focus:border-indigo-500 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#252525] text-white rounded-xl px-4 py-3 text-sm outline-none border border-white/5 focus:border-indigo-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}
            {message && <p className="text-green-400 text-xs">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-5">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('') }}
              className="text-indigo-400 hover:text-indigo-300"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
