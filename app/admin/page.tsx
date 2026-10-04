import { redirect } from 'next/navigation'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { LogoutButton } from './logout-button'

export default async function AdminPage() {
  const user = await getCurrentUser()
  try { requireRole(user, ['ADMIN']) } catch { redirect('/admin/login') }
  return <main className="route-placeholder"><p className="eyebrow">QUEUELESS ADMIN</p><h1>Welcome, {user?.name}.</h1><p>The administration workspace is ready for queue, service and analytics tools.</p><LogoutButton /></main>
}
