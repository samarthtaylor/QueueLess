'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Menu, X, Zap } from 'lucide-react'

export function Brand() {
  return <a className="brand" href="/" aria-label="QueueLess home"><span className="brand-mark"><Zap size={16} fill="currentColor" /></span><span>Queue<span className="brand-accent">Less</span></span></a>
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const [account, setAccount] = useState<{ name: string; role: string } | null>(null)
  useEffect(() => { fetch('/api/auth/me').then(response => response.ok ? response.json() : null).then(data => setAccount(data?.user ?? null)).catch(() => undefined) }, [])
  const close = () => setOpen(false)
  return <header className="site-header"><Brand /><nav className={open ? 'site-nav open' : 'site-nav'} aria-label="Primary navigation"><a href="/">Home</a><a href="/services">Services</a><a href="/how-it-works">How It Works</a><a href="/features">Features</a><a href="/about">About</a><div className="mobile-nav-actions">{account?.role === 'CITIZEN' ? <a className="nav-primary" href="/account">My Account</a> : <><a className="nav-secondary" href="/login">Sign In</a><a className="nav-primary" href="/register">Create Account</a></>}</div></nav><div className="site-actions">{account?.role === 'CITIZEN' ? <a className="nav-primary" href="/account">My Account</a> : <><a className="nav-secondary" href="/login">Sign In</a><a className="nav-primary" href="/register">Create Account</a></>}</div><button className="site-menu-button" type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X /> : <Menu />}</button></header>
}

export function SiteFooter() {
  return <footer className="site-footer"><div><Brand /><p>Smarter civic visits through clearer queue information.</p></div><div><b>Explore</b><a href="/services">Services</a><a href="/how-it-works">How It Works</a><a href="/features">Features</a><a href="/about">About</a></div><div><b>Account</b><a href="/login">Sign In</a><a href="/register">Create Account</a><a href="/admin/login">Admin Portal</a></div><div><b>Privacy</b><button type="button" className="footer-link cookie-settings-trigger" onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}>Cookie Settings</button><p className="footer-note">Prototype / demonstration system. Not affiliated with a government agency.</p></div></footer>
}

export function SiteShell({ children }: { children: React.ReactNode }) { return <><SiteHeader />{children}<SiteFooter /></> }
