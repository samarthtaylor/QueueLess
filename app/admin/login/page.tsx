'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!email.trim()) return setError('Please enter your email address.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email address.')
    if (!password) return setError('Please enter your password.')
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/auth?action=admin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const result = await response.json()
      if (!response.ok) throw new Error(response.status === 403 ? 'This portal is restricted to authorized staff.' : 'Unable to sign in. Please check your credentials and try again.')
      router.replace(result.user.role === 'ADMIN' ? '/admin' : '/admin/queue')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in. Please check your credentials and try again.')
      setIsSubmitting(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-panel" aria-labelledby="admin-login-title">
        <a className="brand admin-login-brand" href="/" aria-label="QueueLess home"><span className="brand-mark">Q</span><span>Queue<span className="brand-accent">Less</span></span></a>
        <div className="admin-login-card">
          <div className="admin-login-heading"><div className="admin-login-icon"><LockKeyhole aria-hidden="true" /></div><p className="eyebrow">QUEUELESS ADMINISTRATION PORTAL</p><h1 id="admin-login-title">Admin &amp; Staff Portal</h1><p>Securely manage queues, counters and citizen visits from one place.</p></div>
          <form onSubmit={handleSubmit} noValidate>
            <div className="admin-field"><label htmlFor="admin-email">Email address</label><input id="admin-email" name="email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(error && !email)} /></div>
            <div className="admin-field"><label htmlFor="admin-password">Password</label><div className="admin-password-field"><input id="admin-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div></div>
            {error && <p className="admin-login-error" role="alert">{error}</p>}
            <button className="admin-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in...' : <>Sign in <ArrowRight aria-hidden="true" /></>}</button>
          </form>
        </div>
        <div className="admin-security-note"><ShieldCheck aria-hidden="true" /><span><strong>Secure staff access</strong><small>Protected by QueueLess authentication</small></span></div>
      </section>
      <aside className="admin-login-aside" aria-label="Administration portal information"><div><p className="eyebrow">BUILT FOR BETTER SERVICE</p><h2>Keep every visit moving forward.</h2><p>QueueLess gives public service teams a clear view of today&apos;s demand, so staff can focus on helping people.</p></div><div className="admin-aside-stat"><strong>One secure workspace</strong><span>For queues, counters and service teams</span></div></aside>
    </main>
  )
}

export const dynamic = 'force-dynamic'
