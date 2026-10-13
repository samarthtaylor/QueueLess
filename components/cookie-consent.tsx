'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Check, Cookie, X } from 'lucide-react'

type Consent = {
  version: 1
  essential: true
  preferences: boolean
  analytics: boolean
  savedAt: string
  decision: 'accepted' | 'rejected' | 'custom'
}

const KEY = 'queueless_cookie_consent_v1'
const VERSION = 1
const initial: Consent = {
  version: VERSION,
  essential: true,
  preferences: false,
  analytics: false,
  savedAt: '',
  decision: 'rejected',
}

function readConsent(): Consent | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<Consent>
    if (
      value.version !== VERSION ||
      value.essential !== true ||
      typeof value.preferences !== 'boolean' ||
      typeof value.analytics !== 'boolean' ||
      typeof value.savedAt !== 'string' ||
      !value.savedAt
    ) return null
    return {
      version: VERSION,
      essential: true,
      preferences: value.preferences,
      analytics: value.analytics,
      savedAt: value.savedAt,
      decision: value.decision === 'accepted' || value.decision === 'custom' ? value.decision : 'rejected',
    }
  } catch {
    return null
  }
}

export function CookieConsent() {
  const pathname = usePathname()
  const [loaded, setLoaded] = useState(false)
  const [consent, setConsent] = useState<Consent | null>(null)
  const [open, setOpen] = useState(false)
  const [preferences, setPreferences] = useState(false)
  const [draft, setDraft] = useState({ preferences: false, analytics: false })
  const dismissedThisSession = useRef(false)

  useEffect(() => {
    setConsent(readConsent())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded && pathname === '/' && !consent && !dismissedThisSession.current) {
      setPreferences(false)
      setOpen(true)
    }
  }, [loaded, pathname, consent])

  useEffect(() => {
    const handler = () => {
      const current = consent ?? readConsent() ?? initial
      setDraft({ preferences: current.preferences, analytics: current.analytics })
      setPreferences(true)
      setOpen(true)
    }
    window.addEventListener('open-cookie-settings', handler)
    return () => window.removeEventListener('open-cookie-settings', handler)
  }, [consent])

  const save = (next: Consent) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next))
      setConsent(next)
      dismissedThisSession.current = false
      setOpen(false)
      setPreferences(false)
    } catch {
      // Keep the dialog open when storage is unavailable so consent is not falsely acknowledged.
    }
  }

  const choose = (all: boolean) => save({
    ...initial,
    preferences: all,
    analytics: all,
    decision: all ? 'accepted' : 'rejected',
    savedAt: new Date().toISOString(),
  })

  const close = () => {
    setOpen(false)
    setPreferences(false)
    if (pathname === '/' && !consent) dismissedThisSession.current = true
  }

  if (!loaded || !open || (pathname !== '/' && !preferences)) return null

  return <div className="cookie-layer" role="presentation">
    <section className="cookie-card" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
      <button className="cookie-close" type="button" aria-label="Close cookie dialog" onClick={close}><X size={18} /></button>
      <div className="cookie-heading"><span className="cookie-icon"><Cookie size={20} /></span><div><p className="eyebrow">PRIVACY CONTROLS</p><h2 id="cookie-title">Your privacy matters</h2></div></div>
      {!preferences ? <>
        <p>QueueLess uses essential cookies to keep the platform secure. With your permission, we can also remember your preferences and measure how the platform is used.</p>
        <div className="cookie-actions"><button type="button" className="nav-primary" onClick={() => choose(true)}>Accept All <Check size={15} /></button><button type="button" className="outline-action" onClick={() => choose(false)}>Reject Non-Essential</button><button type="button" className="cookie-manage" onClick={() => { const current = consent ?? initial; setDraft({ preferences: current.preferences, analytics: current.analytics }); setPreferences(true) }}>Manage Preferences</button></div>
      </> : <>
        <p>Choose which optional cookies you are comfortable with. Essential cookies are always enabled.</p>
        <div className="cookie-options"><CookieOption title="Essential Cookies" text="Required for authentication, secure sessions and core platform functionality." checked disabled onChange={() => undefined} /><CookieOption title="Preference Cookies" text="Remember optional interface preferences." checked={draft.preferences} onChange={value => setDraft(current => ({ ...current, preferences: value }))} /><CookieOption title="Analytics Cookies" text="Measure platform usage and performance when configured." checked={draft.analytics} onChange={value => setDraft(current => ({ ...current, analytics: value }))} /></div>
        <div className="cookie-actions"><button type="button" className="nav-primary" onClick={() => save({ ...initial, ...draft, decision: draft.preferences && draft.analytics ? 'accepted' : 'custom', savedAt: new Date().toISOString() })}>Save Preferences</button><button type="button" className="outline-action" onClick={() => choose(true)}>Accept All</button><button type="button" className="cookie-manage" onClick={close}>Cancel</button></div>
      </>}
    </section>
  </div>
}

function CookieOption({ title, text, checked, disabled, onChange }: { title: string; text: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) { return <label className="cookie-option"><span><b>{title}</b><small>{text}</small></span><input type="checkbox" checked={checked} disabled={disabled} onChange={event => onChange(event.target.checked)} /><i className={checked ? 'toggle on' : 'toggle'} aria-hidden="true" /></label> }
