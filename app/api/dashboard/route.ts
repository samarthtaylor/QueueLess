import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 403 })

  const services = db.prepare(`SELECT s.service_id, s.service_name, s.average_service_time, s.is_active,
    (SELECT COUNT(*) FROM queue q WHERE q.service_id = s.service_id AND q.status = 'WAITING') AS waiting,
    (SELECT COUNT(*) FROM counters c WHERE c.service_id = s.service_id AND c.status != 'OFFLINE') AS active_counters,
    (SELECT COUNT(*) FROM counters c WHERE c.service_id = s.service_id AND c.status = 'BUSY') AS busy_counters
    FROM services s ORDER BY s.is_active DESC, s.service_name`).all() as Array<Record<string, unknown>>
  const counters = db.prepare(`SELECT c.counter_number, c.status, c.service_id, s.service_name, q.token_number, u.name AS staff_name
    FROM counters c JOIN services s ON s.service_id = c.service_id
    LEFT JOIN queue q ON q.counter_id = c.id AND q.status IN ('CALLED','SERVING')
    LEFT JOIN users u ON u.id = c.staff_user_id ORDER BY c.counter_number`).all() as Array<Record<string, unknown>>
  const today = db.prepare(`SELECT
    (SELECT COUNT(*) FROM queue WHERE date(joined_at) = date('now')) AS visitors,
    (SELECT COUNT(*) FROM queue WHERE status = 'WAITING') AS waiting,
    (SELECT COUNT(*) FROM counters WHERE status IN ('AVAILABLE','BUSY')) AS active_counters,
    (SELECT COUNT(*) FROM queue WHERE status = 'COMPLETED' AND date(completed_at) = date('now')) AS completed,
    (SELECT COUNT(*) FROM services WHERE is_active = 1) AS active_services,
    (SELECT AVG(wait_time) FROM queue_history WHERE status = 'COMPLETED' AND date(created_at) = date('now')) AS average_wait`).get() as Record<string, unknown>
  const upcoming = db.prepare(`SELECT q.token_number, q.position, q.estimated_wait_time, q.status, s.service_name
    FROM queue q JOIN services s ON s.service_id = q.service_id WHERE q.status IN ('WAITING','CALLED','SERVING') ORDER BY q.created_at LIMIT 8`).all()
  const activity = db.prepare(`SELECT qh.token_number, qh.status, qh.created_at, s.service_name FROM queue_history qh JOIN services s ON s.service_id = qh.service_id ORDER BY qh.created_at DESC LIMIT 8`).all()
  const trend = db.prepare(`SELECT strftime('%H', created_at) AS hour, COUNT(*) AS count FROM queue WHERE date(created_at) = date('now') GROUP BY hour ORDER BY hour`).all()
  return NextResponse.json({ user, lastUpdated: new Date().toISOString(), kpis: today, services, counters, upcoming, activity, trend })
}
