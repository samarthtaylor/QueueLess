import { NextResponse } from 'next/server'
import { listServiceMenu, listServices } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export function GET(request: Request) {
  const menu = new URL(request.url).searchParams.get('menu') === '1'
  const rawServices = menu ? listServiceMenu() : listServices()
  const normalizeCategory = (category: string) => ({ 'Identity & Citizen Documents': 'Identity & Certificates', Documents: 'Identity & Certificates', Certificates: 'Identity & Certificates', Identity: 'Identity & Certificates', Applications: 'Other Citizen Services' }[category] ?? category)
  const services = rawServices.map(service => ({ ...service, category: normalizeCategory(service.category) }))
  const categories = [...new Set(services.map((service) => service.category))].sort()
  return NextResponse.json({ services, categories }, { headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' } })
}
