import { useState, useEffect } from 'react'

export default function AuthScreen({ notConfigured, onAuth }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  // Reset form on mode switch
  useEffect(() => {
    setError('')
    setSuccessMsg('')
  }, [isSignUp])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)
    try {
      const result = await onAuth(email, password, isSignUp)
      if (result?.needsConfirmation) {
        setSuccessMsg('✓ Check your email to confirm your account.')
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen auth-screen--visible">
      <div className="auth-card">
        <div className="auth-card__logo">
          <span className="material-symbols-rounded">account_balance_wallet</span>
        </div>

        {notConfigured && (
          <div className="config-error">
            <p>Supabase is not configured. Set <code>supabaseUrl</code> and <code>supabaseKey</code> in <code>config.js</code>.</p>
          </div>
        )}

        <h1 className="auth-card__title">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
        <p className="auth-card__subtitle">{isSignUp ? 'Sign up with your email' : 'Sign in to your account'}</p>

        {!notConfigured && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field__label" htmlFor="authEmail">Email</label>
              <input
                className="field__input"
                id="authEmail"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="authPassword">Password</label>
              <input
                className="field__input"
                id="authPassword"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}
            {successMsg && <p className="auth-error" style={{ color: 'var(--md-success)' }}>{successMsg}</p>}

            <button type="submit" className="btn btn--filled auth-card__submit" disabled={loading}>
              {loading ? (isSignUp ? 'Creating…' : 'Signing in…') : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>
        )}

        {!notConfigured && (
          <button type="button" className="btn btn--text auth-card__toggle" onClick={() => setIsSignUp(v => !v)}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        )}
      </div>
    </div>
  )
}
