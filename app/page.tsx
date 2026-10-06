'use client'

import { useEffect, useState } from 'react'
import {
  Activity, ArrowRight, BarChart3, BrainCircuit, Building2, Check, ChevronDown,
  Clock3, FileCheck2, Menu, Network, PanelTop, Search, ShieldCheck, Sparkles, Users, X, Zap,
} from 'lucide-react'

const steps = [
  ['01', 'Select a Service', 'Choose the government service you need.'],
  ['02', 'Check the Queue', 'View the current queue condition.'],
  ['03', 'Analyze the Data', 'QueueLess considers available queue and historical information.'],
  ['04', 'Predict Waiting Time', 'Receive an estimated waiting time.'],
  ['05', 'Understand Crowd Level', 'See whether the current queue is Low, Medium or High.'],
  ['06', 'Plan Your Visit', 'Use the suggested time window to plan your visit.'],
]

const features = [
  [Activity, 'Check the Queue', 'View current queue conditions and active counters.', '/services'],
  [Clock3, 'Predict Your Wait', 'See an estimated waiting time before visiting.', '/services'],
  [Users, 'Track Your Visit', 'View your active queue visit and token.', '/dashboard'],
  [Sparkles, 'Find the Best Time', 'Explore suggested visiting windows.', '/services'],
  [BarChart3, 'Plan My Visit', 'Find a service and plan your visit.', '/services'],
]

function Logo() {
  return <a className="brand" href="/" aria-label="QueueLess home"><span className="brand-mark"><Zap size={16} fill="currentColor" /></span><span>Queue<span className="brand-accent">Less</span></span></a>
}

function QueuePreview() {
  return <div className="preview-wrap" aria-label="Demo queue dashboard preview">
    <div className="preview-glow" />
    <div className="preview-card">
      <div className="preview-top"><span className="live-label"><i /> LIVE QUEUE PREVIEW</span><span className="demo-pill">DEMO DATA</span></div>
      <div className="preview-service"><div className="service-symbol"><FileCheck2 size={19} /></div><div><span>Selected service</span><strong>Document Verification</strong></div><ChevronDown size={17} /></div>
      <div className="preview-stats"><div><span>People waiting</span><strong>08</strong></div><div><span>Active counters</span><strong>03</strong></div><div className="wait-stat"><span>Estimated wait</span><strong>24 <small>min</small></strong></div></div>
      <div className="queue-visual"><div className="visual-heading"><span>Queue status</span><b>Medium</b></div><div className="queue-dots" aria-label="Eight people waiting"><i /><i /><i /><i /><i /><i /><i /><i className="served" /></div><div className="visual-track"><span style={{ width: '58%' }} /></div><div className="visual-footer"><span>Updated recently</span><span className="pulse-dot" /> <span>Live demo</span></div></div>
      <div className="recommendation"><div className="rec-icon"><Sparkles size={16} /></div><div><span>Recommended visit</span><strong>3:15 – 3:45 PM</strong></div><ArrowRight size={16} /></div>
    </div>
  </div>
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [services, setServices] = useState<Array<{ service_id: string; service_name: string; category: string; description: string }>>([])
  const [serviceQuery, setServiceQuery] = useState('')
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 20); window.addEventListener('scroll', onScroll); fetch('/api/services').then(response => response.json()).then(data => setServices(data.services ?? [])).catch(() => undefined); return () => window.removeEventListener('scroll', onScroll) }, [])
  const serviceMatches = services.filter(service => `${service.service_name} ${service.category} ${service.description}`.toLowerCase().includes(serviceQuery.toLowerCase().trim())).slice(0, 5)
  const closeMenu = () => setMenuOpen(false)
  return <div className="landing" id="home">
    <header className={`landing-nav ${scrolled ? 'compact' : ''}`}><Logo /><nav className={menuOpen ? 'nav-open' : ''}><a href="/#home" onClick={closeMenu}>Home</a><a href="/#how-it-works" onClick={closeMenu}>How It Works</a><a href="#features" onClick={closeMenu}>Features</a><a href="#about" onClick={closeMenu}>About</a><div className="mobile-actions"><a className="nav-secondary" href="/admin/login">Admin Login</a><a className="nav-primary" href="/services">Check Queue <ArrowRight size={15} /></a></div></nav><div className="nav-actions"><a className="nav-secondary" href="/admin/login">Admin Login</a><a className="nav-primary" href="/services">Check Queue <ArrowRight size={15} /></a></div><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button></header>
    <main>
      <section className="hero-section"><div className="hero-pattern" /><div className="hero-inner"><div className="hero-copy"><p className="eyebrow">SMART QUEUE MANAGEMENT</p><h1>Know the Queue.<br /><span>Predict the Wait.</span><br />Plan Your Visit.</h1><p className="hero-lede">QueueLess helps citizens check live queue conditions, understand estimated waiting times, and choose a smarter time to visit government offices.</p><div className="hero-actions"><a className="nav-primary large" href="/services">Check Queue Status <ArrowRight size={17} /></a><a className="outline-action" href="/#how-it-works">See How It Works</a></div><p className="trust-line"><Check size={14} /> Simple. Data-driven. Citizen-focused.</p></div><QueuePreview /></div></section>
      <section className="value-strip"><div><Network /><span><b>Live Queue Status</b><small>Know how many people are waiting before you arrive.</small></span></div><div><BrainCircuit /><span><b>AI Waiting-Time Prediction</b><small>Understand expected waits using queue and historical patterns.</small></span></div><div><Sparkles /><span><b>Smart Visit Recommendation</b><small>Identify a potentially better time window for your visit.</small></span></div></section>
      <section className="content-section process-section" id="how-it-works"><div className="section-intro"><p className="eyebrow">HOW IT WORKS</p><h2>From Queue to Clarity</h2><p>QueueLess turns queue information into a simple decision for your next visit.</p></div><div className="steps-grid">{steps.map(([number, title, text]) => <div className="step" key={number}><div className="step-number">{number}</div><h3>{title}</h3><p>{text}</p></div>)}</div></section>
      <section className="content-section features-section" id="features"><div className="section-intro"><p className="eyebrow">A BETTER VISIT, BY DESIGN</p><h2>Built Around the Citizen</h2><p>Everything you need to make a more informed visit.</p></div><div className="feature-grid">{features.map(([Icon, title, text, href], index) => <a className={`feature-card feature-${index}`} href={href as string} key={title as string}><div className="feature-icon"><Icon /></div><h3>{title as string}</h3><p>{text as string}</p><ArrowRight className="feature-arrow" /></a>)}</div></section>
      <section className="citizen-discovery content-section" aria-labelledby="discover-services"><div className="section-intro"><p className="eyebrow">CITIZEN SERVICE FINDER</p><h2 id="discover-services">What do you need to do today?</h2><p>Find a government service and plan your visit before you arrive.</p></div><label className="service-search homepage-search"><Search/><span className="sr-only">Search for a service, certificate or document</span><input value={serviceQuery} onChange={event=>setServiceQuery(event.target.value)} placeholder="Search for a service, certificate or document..." /></label>{serviceQuery && <div className="homepage-suggestions">{serviceMatches.length ? serviceMatches.map(service=><a href={`/queue?service=${encodeURIComponent(service.service_id)}`} key={service.service_id}><span><b>{service.service_name}</b><small>{service.category} · {service.description}</small></span><ArrowRight size={15}/></a>) : <p>No active services match that search.</p>}</div>}<div className="popular-heading"><div><p className="eyebrow">POPULAR SERVICES</p><h3>Popular Government Services</h3></div><a className="text-action" href="/services">View all services <ArrowRight size={14}/></a></div><div className="popular-grid">{services.filter(service=>['Aadhaar-related Services','Income Certificate','Driving Licence','Birth Certificate','Property Tax','Pension Services'].includes(service.service_name)).slice(0,6).map(service=><a className="popular-card" href={`/queue?service=${encodeURIComponent(service.service_id)}`} key={service.service_id}><span className="category-badge">{service.category}</span><h3>{service.service_name}</h3><p>{service.description}</p><span className="popular-action">Check Queue <ArrowRight size={14}/></span></a>)}</div></section>
      <section className="analysis-section" id="about"><div className="analysis-copy"><p className="eyebrow">THE QUEUELESS APPROACH</p><h2>Turning Queue Data Into a Smarter Visit</h2><p>We bring the signals that shape a queue into one clear view, so citizens can make a more informed choice.</p><a className="outline-action" href="/#how-it-works">Learn how it works <ArrowRight size={15} /></a></div><div className="data-flow"><div><span>CURRENT QUEUE</span><span>HISTORICAL PATTERNS</span><span>SERVICE INFORMATION</span><span>TIME &amp; DAY</span></div><strong><PanelTop size={18} /> QUEUELESS ANALYSIS</strong><div className="flow-output"><span>ESTIMATED WAITING TIME</span><ArrowRight size={16} /><span>SMART VISIT WINDOW</span></div></div></section>
      <section className="final-cta" id="queue"><ShieldCheck /><h2>Don&apos;t Guess the Queue.</h2><p>Check the queue, understand the wait, and plan your visit with QueueLess.</p><a className="nav-primary large" href="#home">Check Queue Status <ArrowRight size={17} /></a><a className="cta-link" href="/#how-it-works">Learn How It Works</a></section>
    </main>
    <footer><div className="footer-brand"><Logo /><p>AI-Powered Waiting-Time Prediction<br />&amp; Smart Visit Recommendation System</p></div><div><b>Navigation</b><a href="#home">Home</a><a href="/#how-it-works">How It Works</a><a href="#features">Features</a><a href="#about">About</a></div><div><b>Platform</b><a href="/services">Citizen</a><a href="/admin/login">Admin</a></div><div className="footer-note"><span>PROTOTYPE / DEMONSTRATION SYSTEM</span><p>© QueueLess</p></div></footer>
  </div>
}
