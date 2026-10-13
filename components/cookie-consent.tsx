'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Check, Cookie, X } from 'lucide-react'

type Consent = { version: number; essential: true; preferences: boolean; analytics: boolean; savedAt: string }
const KEY = 'queueless_cookie_consent_v1'
const initial: Consent = { version: 1, essential: true, preferences: false, analytics: false, savedAt: '' }

export function CookieConsent() {
  const pathname = usePathname()
  const [consent, setConsent] = useState<Consent | null>(null)
  const [open, setOpen] = useState(false)
  const [preferences, setPreferences] = useState(false)
  useEffect(() => { try { const value = JSON.parse(localStorage.getItem(KEY) || 'null'); setConsent(value?.version === 1 ? value : null) } catch { setConsent(null) } }, [])
  useEffect(() => { if (pathname === '/' && !consent) { setOpen(true); setPreferences(false) } }, [pathname, consent])
  useEffect(() => { const handler = () => { setOpen(true); setPreferences(true) }; window.addEventListener('open-cookie-settings', handler); return () => window.removeEventListener('open-cookie-settings', handler) }, [])
  const save = (next: Consent) => { localStorage.setItem(KEY, JSON.stringify(next)); setConsent(next); setOpen(false); setPreferences(false) }
  if (!open || (pathname !== '/' && !preferences)) return null
  const choose = (all: boolean) => save({ ...initial, preferences: all, analytics: all, savedAt: new Date().toISOString() })
  return <div className="cookie-layer" role="presentation"><section className="cookie-card" role="dialog" aria-modal="true" aria-labelledby="cookie-title"><button className="cookie-close" type="button" aria-label="Close cookie dialog" onClick={() => { setOpen(false); setPreferences(false) }}><X size={18} /></button><div className="cookie-heading"><span className="cookie-icon"><Cookie size={20} /></span><div><p className="eyebrow">PRIVACY CONTROLS</p><h2 id="cookie-title">Your privacy matters</h2></div></div>{!preferences ? <><p>QueueLess uses essential cookies to keep the platform secure. With your permission, we can also remember your preferences and measure how the platform is used.</p><div className="cookie-actions"><button type="button" className="nav-primary" onClick={() => choose(true)}>Accept All <Check size={15} /></button><button type="button" className="outline-action" onClick={() => choose(false)}>Reject Non-Essential</button><button type="button" className="cookie-manage" onClick={() => setPreferences(true)}>Manage Preferences</button></div></> : <><p>Choose which optional cookies you are comfortable with. Essential cookies are always enabled.</p><div className="cookie-options"><CookieOption title="Essential Cookies" text="Required for authentication, secure sessions and core platform functionality." checked disabled onChange={() => undefined} /><CookieOption title="Preference Cookies" text="Remember optional interface preferences." checked={consent?.preferences ?? false} onChange={value => setConsent(current => ({ ...(current || initial), preferences: value, savedAt: '' }))} /><CookieOption title="Analytics Cookies" text="Measure platform usage and performance when configured." checked={consent?.analytics ?? false} onChange={value => setConsent(current => ({ ...(current || initial), analytics: value, savedAt: '' }))} /></div><div className="cookie-actions"><button type="button" className="nav-primary" onClick={() => save({ ...(consent || initial), savedAt: new Date().toISOString() })}>Save Preferences</button><button type="button" className="outline-action" onClick={() => choose(true)}>Accept All</button><button type="button" className="cookie-manage" onClick={() => choose(false)}>Reject Non-Essential</button></div></>}</section></div>
}
function CookieOption({ title, text, checked, disabled, onChange }: { title: string; text: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) { return <label className="cookie-option"><span><b>{title}</b><small>{text}</small></span><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><i className={checked ? 'toggle on' : 'toggle'} aria-hidden="true" /></label> }
