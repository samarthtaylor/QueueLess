'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X, Zap } from 'lucide-react'

export function Brand() {
  return <Link className="brand" href="/" aria-label="QueueLess home"><span className="brand-mark"><Zap size={16} fill="currentColor" /></span><span>Queue<span className="brand-accent">Less</span></span></Link>
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState<{ name: string; role: string } | null>(null)
  useEffect(() => { fetch('/api/auth/me').then(response => response.ok ? response.json() : null).then(data => setAccount(data?.user ?? null)).catch(() => undefined) }, [])
  return <header className="site-header"><Brand /><nav className={open ? 'site-nav open' : 'site-nav'} aria-label="Primary navigation"><Link href="/" onClick={() => setOpen(false)}>Home</Link><Link href="/services" onClick={() => setOpen(false)}>Services</Link><Link href="/how-it-works" onClick={() => setOpen(false)}>How It Works</Link><Link href="/features" onClick={() => setOpen(false)}>Features</Link><Link href="/about" onClick={() => setOpen(false)}>About</Link><div className="mobile-nav-actions">{account?.role === 'CITIZEN' ? <Link className="nav-primary" href="/account" onClick={() => setOpen(false)}>My Account</Link> : <><Link className="nav-secondary" href="/login" onClick={() => setOpen(false)}>Sign In</Link><Link className="nav-primary" href="/register" onClick={() => setOpen(false)}>Create Account</Link></>}</div></nav><div className="site-actions">{account?.role === 'CITIZEN' ? <Link className="nav-primary" href="/account">My Account</Link> : <><Link className="nav-secondary" href="/login">Sign In</Link><Link className="nav-primary" href="/register">Create Account</Link></>}</div><button className="site-menu-button" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X /> : <Menu />}</button></header>
}

export function SiteFooter() {
  return <footer className="site-footer"><div><Brand /><p>Smarter civic visits through clearer queue information.</p></div><div><b>Explore</b><Link href="/services">Services</Link><Link href="/how-it-works">How It Works</Link><Link href="/features">Features</Link><Link href="/about">About</Link></div><div><b>Account</b><Link href="/login">Sign In</Link><Link href="/register">Create Account</Link><Link href="/admin/login">Admin Portal</Link></div><div><b>Privacy</b><button type="button" className="footer-link cookie-settings-trigger" onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}>Cookie Settings</button><p className="footer-note">Prototype / demonstration system. Not affiliated with a government agency.</p></div></footer>
}

export function SiteShell({ children }: { children: React.ReactNode }) { return <><SiteHeader />{children}<SiteFooter /></> }

