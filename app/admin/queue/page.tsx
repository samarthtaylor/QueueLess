import { redirect } from 'next/navigation'
import { getCurrentUser, requireRole } from '@/lib/auth'

export default async function StaffQueuePage() {
  const user = await getCurrentUser()
  try { requireRole(user, ['ADMIN', 'STAFF']) } catch { redirect('/admin/login') }
  return <main className="route-placeholder"><p className="eyebrow">QUEUELESS STAFF</p><h1>Welcome, {user?.name}.</h1><p>Queue management tools will appear here.</p><a className="nav-primary" href="/">Return home</a></main>
}
