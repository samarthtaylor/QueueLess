'use client'

import { FormEvent, useState } from 'react'
import { ArrowRight, Zap } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [register, setRegister] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); const response = await fetch(`/api/auth?action=${register ? `register&name=${encodeURIComponent(name)}` : 'login'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) }); const payload = await response.json(); if (!response.ok) { setError(payload.error || 'Unable to sign in.'); return }; window.location.href = new URLSearchParams(window.location.search).get('next') || '/dashboard' }
  return <main className="route-placeholder"><a className="brand" href="/"><span className="brand-mark"><Zap size={16} fill="currentColor" /></span><span>Queue<span className="brand-accent">Less</span></span></a><p className="eyebrow">CITIZEN ACCESS</p><h1>{register ? 'Create your QueueLess account.' : 'Welcome back to QueueLess.'}</h1><p>{register ? 'Save your visits and keep your queue overview in one place.' : 'Sign in to view your current visit and queue status.'}</p><form onSubmit={submit} style={{ display: 'grid', gap: 12, width: 'min(100%, 360px)', margin: '8px auto 0', textAlign: 'left' }}>{register && <input aria-label="Full name" placeholder="Full name" value={name} onChange={(event) => setName(event.target.value)} required />}<input aria-label="Email" type="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} required /><input aria-label="Password" type="password" placeholder="Password (8+ characters)" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />{error && <p role="alert" style={{ color: '#b44943', fontSize: 12, margin: 0 }}>{error}</p>}<button className="nav-primary" type="submit">{register ? 'Create account' : 'Sign in'} <ArrowRight size={15} /></button></form><button className="text-action" onClick={() => setRegister(!register)}>{register ? 'Already have an account? Sign in' : 'New to QueueLess? Create an account'}</button></main>
}
