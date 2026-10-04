import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createPrediction, db, findService, getQueueSnapshot } from '@/lib/db'
import { generateRecommendation, activeStatuses } from '@/lib/recommendations/recommendation-service'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'CITIZEN') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const requestedService = request.nextUrl.searchParams.get('service')
  const active = db.prepare(`SELECT q.*, s.service_name, s.category, s.average_service_time FROM queue q JOIN services s ON s.service_id = q.service_id WHERE q.user_id = ? AND q.status IN (${activeStatuses.map(() => '?').join(',')}) ORDER BY q.created_at DESC`).all(user.id, ...activeStatuses) as Array<Record<string, unknown>>
  const activeVisit = active.find((entry) => !requestedService || entry.service_id === requestedService) ?? active[0] ?? null
  const serviceId = String(activeVisit?.service_id ?? requestedService ?? '')
  const service = serviceId ? findService(serviceId) : null
  const snapshot = service ? getQueueSnapshot(service.service_id) : null
  let prediction: Record<string, unknown> | null = null
  let recommendation: ReturnType<typeof generateRecommendation> | null = null
  if (service) {
    prediction = (db.prepare('SELECT * FROM predictions WHERE service_id = ? ORDER BY created_at DESC, id DESC LIMIT 1').get(service.service_id) as Record<string, unknown> | undefined) ?? (createPrediction(service.service_id) as Record<string, unknown> | null)
    recommendation = generateRecommendation(service.service_id)
  }
  let position = null
  if (activeVisit && snapshot) {
    position = (db.prepare("SELECT COUNT(*) AS count FROM queue WHERE service_id = ? AND status IN ('WAITING','CALLED','SERVING') AND (position < ? OR (position = ? AND id < ?))").get(activeVisit.service_id, activeVisit.position, activeVisit.position, activeVisit.id) as { count: number }).count
  }
  const recentVisits = db.prepare('SELECT qh.*, s.service_name FROM queue_history qh JOIN services s ON s.service_id = qh.service_id WHERE qh.user_id = ? ORDER BY qh.created_at DESC LIMIT 5').all(user.id)
  return NextResponse.json({ user, activeVisits: active, activeVisit, service, snapshot, position, prediction, recommendation, recentVisits })
}

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'CITIZEN') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  const visit = db.prepare("SELECT * FROM queue WHERE user_id = ? AND status IN ('WAITING','CALLED','SERVING') ORDER BY created_at DESC LIMIT 1").get(user.id) as { id: number; service_id: string; token_number: string; joined_at: string } | undefined
  if (!visit) return NextResponse.json({ error: 'NO_ACTIVE_VISIT' }, { status: 404 })
  const cancel = db.transaction(() => {
    db.prepare("UPDATE queue SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?").run(visit.id, user.id)
    db.prepare('INSERT INTO queue_history (queue_id, service_id, user_id, token_number, status, joined_at, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').run(visit.id, visit.service_id, user.id, visit.token_number, 'CANCELLED', visit.joined_at)
  })
  cancel()
  return NextResponse.json({ ok: true })
}

export async function POST() { return DELETE() }

export function OPTIONS() { return NextResponse.json({}, { status: 204 }) }

// Dashboard data is aggregated server-side so the browser never supplies a user id.
