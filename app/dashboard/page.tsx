import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import DashboardClient from './dashboard-client'

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'CITIZEN') redirect(`/login?next=${encodeURIComponent('/dashboard')}`)
  const params = await searchParams
  return <DashboardClient serviceId={params.service ?? null} />
}
