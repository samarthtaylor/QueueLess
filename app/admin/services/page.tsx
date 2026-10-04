import { redirect } from 'next/navigation'
import { getCurrentUser, requireRole } from '@/lib/auth'
import ServicesClient from './services-client'

export default async function AdminServicesPage() {
  const user = await getCurrentUser()
  try { requireRole(user, ['ADMIN', 'STAFF']) } catch { redirect('/admin/login') }
  return <ServicesClient user={{ name: user!.name, role: user!.role }} />
}
