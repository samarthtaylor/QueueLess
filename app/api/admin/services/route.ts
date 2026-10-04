import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import db from '@/lib/db'

function accessDenied() { return NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }
function slugify(value: string) { return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'service' }
function validate(body: Record<string, unknown>) {
  const name = typeof body.service_name === 'string' ? body.service_name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const category = typeof body.category === 'string' ? body.category.trim() : ''
  const average = Number(body.average_service_time)
  if (!name || name.length > 120) return 'Service name is required and must be under 120 characters.'
  if (description.length > 500) return 'Description must be under 500 characters.'
  if (!category || category.length > 80) return 'Category is required and must be under 80 characters.'
  if (!Number.isInteger(average) || average < 1 || average > 480) return 'Average service time must be a whole number from 1 to 480 minutes.'
  return null
}
function shape(row: Record<string, unknown>) { return { ...row, is_active: Boolean(row.is_active), waiting: Number(row.waiting ?? 0), active_counters: Number(row.active_counters ?? 0) } }

export async function GET(request: Request) {
  const user = await getCurrentUser(); if (!user || !['ADMIN', 'STAFF'].includes(user.role)) return accessDenied()
  const url = new URL(request.url); const search = url.searchParams.get('search')?.trim() ?? ''; const status = url.searchParams.get('status') ?? 'all'; const category = url.searchParams.get('category') ?? ''
  const conditions = ['1 = 1']; const params: unknown[] = []
  if (search) { conditions.push('(s.service_name LIKE ? OR s.service_id LIKE ? OR s.category LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`) }
  if (status === 'active' || status === 'inactive') { conditions.push('s.is_active = ?'); params.push(status === 'active' ? 1 : 0) }
  if (category) { conditions.push('s.category = ?'); params.push(category) }
  const rows = db.prepare(`SELECT s.*, (SELECT COUNT(*) FROM queue q WHERE q.service_id=s.service_id AND q.status IN ('WAITING','CALLED','SERVING')) AS waiting, (SELECT COUNT(*) FROM counters c WHERE c.service_id=s.service_id AND c.status != 'OFFLINE') AS active_counters FROM services s WHERE ${conditions.join(' AND ')} ORDER BY s.service_name`).all(...params) as Record<string, unknown>[]
  const categories = db.prepare('SELECT DISTINCT category FROM services ORDER BY category').all() as Array<{ category: string }>
  return NextResponse.json({ services: rows.map(shape), categories: categories.map((item) => item.category) })
}

export async function POST(request: Request) {
  const user = await getCurrentUser(); if (!user || user.role !== 'ADMIN') return accessDenied()
  const body = await request.json().catch(() => ({})); const error = validate(body); if (error) return NextResponse.json({ error }, { status: 400 })
  const name = String(body.service_name).trim(); const base = slugify(name); let serviceId = base; let suffix = 2
  while (db.prepare('SELECT 1 FROM services WHERE service_id = ?').get(serviceId)) serviceId = `${base}-${suffix++}`
  try {
    const result = db.prepare('INSERT INTO services (service_id, service_name, description, category, average_service_time, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(serviceId, name, String(body.description).trim(), String(body.category).trim(), Number(body.average_service_time), body.is_active === false ? 0 : 1)
    db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)').run(user.id, 'SERVICE_CREATED', 'SERVICE', serviceId)
    return NextResponse.json(shape(db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid) as Record<string, unknown>), { status: 201 })
  } catch { return NextResponse.json({ error: 'A service with these details already exists.' }, { status: 409 }) }
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser(); if (!user || user.role !== 'ADMIN') return accessDenied()
  const body = await request.json().catch(() => ({})); const serviceId = typeof body.service_id === 'string' ? body.service_id : ''
  const existing = db.prepare('SELECT * FROM services WHERE service_id = ?').get(serviceId) as Record<string, unknown> | undefined
  if (!existing) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })
  const error = validate(body); if (error) return NextResponse.json({ error }, { status: 400 })
  db.prepare('UPDATE services SET service_name=?, description=?, category=?, average_service_time=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE service_id=?').run(String(body.service_name).trim(), String(body.description).trim(), String(body.category).trim(), Number(body.average_service_time), body.is_active ? 1 : 0, serviceId)
  db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)').run(user.id, 'SERVICE_UPDATED', 'SERVICE', serviceId)
  return NextResponse.json(shape(db.prepare('SELECT * FROM services WHERE service_id = ?').get(serviceId) as Record<string, unknown>))
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser(); if (!user || user.role !== 'ADMIN') return accessDenied()
  const { service_id: serviceId } = await request.json().catch(() => ({})); const existing = db.prepare('SELECT 1 FROM services WHERE service_id = ?').get(serviceId)
  if (!existing) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })
  db.prepare('UPDATE services SET is_active=0, updated_at=CURRENT_TIMESTAMP WHERE service_id=?').run(serviceId)
  db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)').run(user.id, 'SERVICE_DEACTIVATED', 'SERVICE', serviceId)
  return NextResponse.json({ ok: true })
}

export async function PUT(request: Request) {
  const user = await getCurrentUser(); if (!user || user.role !== 'ADMIN') return accessDenied()
  const { service_id: serviceId, is_active: isActive } = await request.json().catch(() => ({}))
  if (!db.prepare('SELECT 1 FROM services WHERE service_id = ?').get(serviceId)) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })
  db.prepare('UPDATE services SET is_active=?, updated_at=CURRENT_TIMESTAMP WHERE service_id=?').run(isActive ? 1 : 0, serviceId)
  db.prepare('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)').run(user.id, isActive ? 'SERVICE_ACTIVATED' : 'SERVICE_DEACTIVATED', 'SERVICE', serviceId)
  return NextResponse.json({ ok: true })
}

export const runtime = 'nodejs'
