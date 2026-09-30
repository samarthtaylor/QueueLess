'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Award, BadgeCheck, FileCheck2, Home, IdCard, Menu, Search, Sparkles, X, Zap } from 'lucide-react'

const services = [
  { id: 'document-verification', name: 'Document Verification', category: 'Documents', icon: FileCheck2, description: 'Verify and submit documents for government services.', time: '~15 min', status: 'Medium' },
  { id: 'certificate-application', name: 'Certificate Application', category: 'Certificates', icon: Award, description: 'Submit and process applications for eligible certificates.', time: '~20 min', status: 'Low' },
  { id: 'address-update', name: 'Address Update', category: 'Applications', icon: Home, description: 'Request an update to your registered address information.', time: '~10 min', status: 'Low' },
  { id: 'id-services', name: 'ID Services', category: 'Identity', icon: IdCard, description: 'Access available identity-related government services.', time: '~25 min', status: 'High' },
  { id: 'application-submission', name: 'Application Submission', category: 'Applications', icon: BadgeCheck, description: 'Submit applications and supporting documents.', time: '~15 min', status: 'Medium' },
]
const categories = ['All Services', ...Array.from(new Set(services.map((service) => service.category)))]

function Logo() { return <a className="brand" href="/" aria-label="QueueLess home"><span className="brand-mark"><Zap size={16} fill="currentColor" /></span><span>Queue<span className="brand-accent">Less</span></span></a> }

export default function ServicesPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All Services')
  const [loading, setLoading] = useState(true)

  useEffect(() => { const timer = window.setTimeout(() => setLoading(false), 240); return () => window.clearTimeout(timer) }, [])
  const filteredServices = useMemo(() => services.filter((service) => (category === 'All Services' || service.category === category) && `${service.name} ${service.description} ${service.category}`.toLowerCase().includes(query.toLowerCase().trim())), [category, query])
  const closeMenu = () => setMenuOpen(false)

  return <div className="services-page">
    <header className="landing-nav services-nav"><Logo /><nav className={menuOpen ? 'nav-open' : ''}><a href="/#home" onClick={closeMenu}>Home</a><a href="/#how-it-works" onClick={closeMenu}>How It Works</a><a href="/#features" onClick={closeMenu}>Features</a><a href="/#about" onClick={closeMenu}>About</a><div className="mobile-actions"><a className="nav-secondary" href="/admin/login">Admin Login</a><a className="nav-primary" href="/services">Check Queue <ArrowRight size={15} /></a></div></nav><div className="nav-actions"><a className="nav-secondary" href="/admin/login">Admin Login</a><a className="nav-primary active" href="/services">Check Queue <ArrowRight size={15} /></a></div><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}>{menuOpen ? <X /> : <Menu />}</button></header>
    <main>
      <section className="services-hero"><div className="hero-pattern" /><div className="services-hero-inner"><p className="eyebrow">CHECK QUEUE</p><h1>Which service do you need?</h1><p>Select a government service to view its current queue status and estimated waiting time.</p></div></section>
      <section className="services-content" aria-label="Available government services">
        <div className="service-tools"><label className="service-search"><Search aria-hidden="true" /><span className="sr-only">Search for a service</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a service..." /></label><div className="filters" aria-label="Filter services">{categories.map((item) => <button key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)} aria-pressed={category === item}>{item}</button>)}</div></div>
        <div className="service-results-heading"><div><p className="eyebrow">AVAILABLE SERVICES</p><h2>Find your place in line</h2></div><span className="demo-pill">DEMO / SAMPLE DATA</span></div>
        {loading ? <div className="service-grid" aria-label="Loading services">{Array.from({ length: 5 }).map((_, index) => <div className="service-skeleton" key={index}><span /><span /><span /><span /></div>)}</div> : filteredServices.length ? <div className="service-grid">{filteredServices.map((service) => { const Icon = service.icon; return <article className="service-card" key={service.id}><div className="service-card-top"><div className="service-icon"><Icon aria-hidden="true" /></div><span className="category-badge">{service.category}</span></div><h3>{service.name}</h3><p>{service.description}</p><div className="service-meta"><div><span>Average service</span><strong>{service.time}</strong></div><div><span>Crowd level</span><strong className={`status-${service.status.toLowerCase()}`}><i aria-hidden="true" />{service.status}</strong></div></div><a className="service-action" href={`/queue?service=${service.id}`}>View Queue <ArrowRight aria-hidden="true" /></a></article> })}</div> : <div className="service-empty"><div className="empty-icon"><Search /></div><h3>No services found</h3><p>Try another search term or browse all available services.</p><button className="outline-action" onClick={() => { setQuery(''); setCategory('All Services') }}>Clear Search</button></div>}
      </section>
      <section className="before-visit"><div><p className="eyebrow">BEFORE YOU VISIT</p><h2>Make a more informed visit.</h2></div><div><p>QueueLess helps you understand queue conditions before you visit. Select a service to see available queue information and estimated waiting time.</p><small>Queue information shown during this prototype is sample/demo data.</small></div></section>
    </main>
    <footer><div className="footer-brand"><Logo /><p>AI-Powered Waiting-Time Prediction<br />&amp; Smart Visit Recommendation System</p></div><div><b>Navigation</b><a href="/">Home</a><a href="/#how-it-works">How It Works</a><a href="/#features">Features</a><a href="/#about">About</a></div><div><b>Platform</b><a href="/services">Citizen</a><a href="/admin/login">Admin</a></div><div className="footer-note"><span>PROTOTYPE / DEMONSTRATION SYSTEM</span><p>© QueueLess</p></div></footer>
  </div>
}

