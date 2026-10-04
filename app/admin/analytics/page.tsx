import { redirect } from 'next/navigation'
import { getCurrentUser, requireRole } from '@/lib/auth'

export default async function AdminAnalyticsPage() {
  const user = await getCurrentUser()
  try { requireRole(user, ['ADMIN']) } catch { redirect('/admin/login') }
  return <main className="route-placeholder"><p className="eyebrow">QUEUELESS ANALYTICS</p><h1>Analytics are coming next.</h1><p>This protected area is reserved for authorized administrators.</p><a className="nav-primary" href="/admin">Return to admin</a></main>
}
