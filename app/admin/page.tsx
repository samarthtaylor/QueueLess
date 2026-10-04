import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { requireRole } from '@/lib/auth'
import DashboardClient from './dashboard-client'

export default async function AdminPage() {
  const user = await getCurrentUser()
  try { requireRole(user, ['ADMIN']) } catch { redirect('/admin/login') }
  return <DashboardClient initialUser={user!} />
}
