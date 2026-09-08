import { useEffect, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, LogOut, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import './AuthGate.css'

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <AuthLoading />
  if (!supabase) return <AuthConfigurationError />
  if (!session) return <AuthScreen />

  return <>
    <AccountControl session={session} />
    {children}
  </>
}

function AuthLoading() {
  return <main className="auth-shell"><section className="auth-loading"><span className="auth-mark">FL</span><b>Preparing FitLife</b><small>Checking your secure session...</small></section></main>
}

function AuthConfigurationError() {
  return <main className="auth-shell"><section className="auth-card"><div className="auth-brand"><span className="auth-mark">FL</span><div><small>FITLIFE</small><h1>Configuration required</h1></div></div><p>Supabase is not configured in this build. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then rebuild FitLife.</p></section></main>
}

function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function clearMessages() { setMessage(''); setError('') }
  function changeMode(next) { clearMessages(); setMode(next); setPassword(''); setConfirmPassword('') }

  async function submit(event) {
    event.preventDefault()
    clearMessages()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return setError('Enter your email address.')
    if (mode !== 'reset' && password.length < 8) return setError('Use at least 8 characters for your password.')
    if (mode === 'signup' && password !== confirmPassword) return setError('The passwords do not match.')
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        if (authError) throw authError
      } else if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: window.location.origin }
        })
        if (authError) throw authError
        if (!data.session) setMessage('Account created. Check your email and confirm the account, then return to FitLife and sign in.')
      } else {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: `${window.location.origin}/#reset-password` })
        if (authError) throw authError
        setMessage('If an account exists for this email, a password reset link has been sent.')
      }
    } catch (authError) {
      setError(authError.message || 'Authentication could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your FitLife account' : 'Reset your password'
  const subtitle = mode === 'signin' ? 'Sign in to keep your fasting, habits, health data and photos synchronised across devices.' : mode === 'signup' ? 'One secure account connects FitLife on desktop, iPad and mobile.' : 'Enter your account email and FitLife will send a secure reset link.'

  return <main className="auth-shell">
    <section className="auth-visual">
      <div className="auth-orb"><Sparkles/><b>Your life, in sync.</b></div>
      <div className="auth-benefits">
        <article><ShieldCheck/><div><b>Private by default</b><span>Your records are scoped to your account.</span></div></article>
        <article><LockKeyhole/><div><b>Cross-device continuity</b><span>Start on one device and continue on another.</span></div></article>
      </div>
    </section>
    <section className="auth-card">
      <div className="auth-brand"><span className="auth-mark">FL</span><div><small>FITLIFE</small><h1>{title}</h1></div></div>
      <p>{subtitle}</p>
      {mode === 'reset' && <button className="auth-back" onClick={() => changeMode('signin')}><ArrowLeft/>Back to sign in</button>}
      <form onSubmit={submit}>
        <label>Email address<div className="auth-field"><Mail/><input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com"/></div></label>
        {mode !== 'reset' && <label>Password<div className="auth-field"><LockKeyhole/><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters"/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff/> : <Eye/>}</button></div></label>}
        {mode === 'signup' && <label>Confirm password<div className="auth-field"><LockKeyhole/><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat your password"/></div></label>}
        {error && <div className="auth-message error">{error}</div>}
        {message && <div className="auth-message success">{message}</div>}
        <button className="auth-submit" disabled={busy}>{busy ? 'Please wait...' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</button>
      </form>
      {mode === 'signin' && <><button className="auth-link" onClick={() => changeMode('reset')}>Forgot password?</button><div className="auth-switch">New to FitLife? <button onClick={() => changeMode('signup')}>Create account</button></div></>}
      {mode === 'signup' && <div className="auth-switch">Already have an account? <button onClick={() => changeMode('signin')}>Sign in</button></div>}
    </section>
  </main>
}

function AccountControl({ session }) {
  const [open, setOpen] = useState(false)
  const email = session.user.email || 'FitLife account'
  async function signOut() { await supabase.auth.signOut(); window.location.reload() }
  return <div className="auth-account"><button onClick={() => setOpen(!open)} title={email}>{email.slice(0, 1).toUpperCase()}</button>{open && <aside><small>SIGNED IN AS</small><b>{email}</b><span>Cross-device sync is active for this account.</span><button onClick={signOut}><LogOut/>Sign out</button></aside>}</div>
}
