import { redirect } from 'next/navigation'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { getAdminQueueData } from '@/lib/admin-queue'
import QueueClient from './queue-client'

export default async function StaffQueuePage() {
  const user = await getCurrentUser()
  try { requireRole(user, ['ADMIN', 'STAFF']) } catch { redirect('/admin/login') }
  return <main className="admin-shell"><header className="admin-header"><a className="brand" href="/">Queue<span>Less</span></a><p className="admin-portal">Staff operations portal</p><div className="admin-user"><span>{user?.name}</span><b>{user?.role}</b><a className="nav-secondary" href="/admin">Dashboard</a></div></header><div className="admin-body"><aside className="admin-sidebar"><p className="admin-nav-label">OPERATIONS</p><nav><a href="/admin">Dashboard</a><a className="active" href="/admin/queue">Queue management</a><a href="/admin/analytics">Analytics</a><a href="/admin">Services</a></nav></aside><QueueClient initial={getAdminQueueData()} /></div></main>
}
