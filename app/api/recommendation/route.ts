import { NextRequest, NextResponse } from 'next/server'
import { generateRecommendation } from '@/lib/recommendations/recommendation-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get('service')?.trim()
  if (!serviceId || !/^[a-z0-9-]{2,80}$/.test(serviceId)) return NextResponse.json({ error: 'SERVICE_REQUIRED' }, { status: 400 })
  const result = generateRecommendation(serviceId)
  if ('error' in result) {
    if (result.error === 'NO_COUNTERS') return NextResponse.json({ error: result.error, message: 'No active counters are currently available.' }, { status: 503 })
    return NextResponse.json({ error: 'SERVICE_NOT_FOUND' }, { status: 404 })
  }
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
}
