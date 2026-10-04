import db from '@/lib/db'

export type QueueStatus = 'WAITING' | 'CALLED' | 'SERVING' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'

function now() { return new Date().toISOString() }
function history(queue: any, status: string, counterId: number | null, servedAt: string | null = null) {
  db.prepare(`INSERT INTO queue_history (queue_id, service_id, user_id, token_number, counter_id, wait_time, service_time, status, joined_at, served_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(queue.id, queue.service_id, queue.user_id, queue.token_number, counterId, queue.served_at ? Math.max(0, Math.round((Date.parse(queue.served_at) - Date.parse(queue.joined_at)) / 60000)) : 0, queue.completed_at && queue.served_at ? Math.max(0, Math.round((Date.parse(queue.completed_at) - Date.parse(queue.served_at)) / 60000)) : 0, status, queue.joined_at, servedAt, queue.completed_at)
}
function getQueue(id: number) { return db.prepare('SELECT q.*, s.service_name, c.counter_number FROM queue q JOIN services s ON s.service_id = q.service_id LEFT JOIN counters c ON c.id = q.counter_id WHERE q.id = ?').get(id) as any }

export function getAdminQueueData(serviceId?: string, counterId?: number, status?: string, search?: string) {
  const services = db.prepare('SELECT service_id, service_name, is_active FROM services ORDER BY service_name').all()
  const counters = db.prepare(`SELECT c.id, c.counter_number, c.service_id, c.status, c.staff_user_id, s.service_name, q.token_number AS serving_token FROM counters c JOIN services s ON s.service_id=c.service_id LEFT JOIN queue q ON q.counter_id=c.id AND q.status IN ('CALLED','SERVING') ORDER BY c.counter_number`).all()
  const where: string[] = []; const args: any[] = []
  if (serviceId) { where.push('q.service_id = ?'); args.push(serviceId) }
  if (counterId) { where.push('q.counter_id = ?'); args.push(counterId) }
  if (status) { where.push('q.status = ?'); args.push(status) }
  if (search) { where.push('q.token_number LIKE ?'); args.push(`%${search.slice(0, 40)}%`) }
  const rows = db.prepare(`SELECT q.*, s.service_name, c.counter_number FROM queue q JOIN services s ON s.service_id=q.service_id LEFT JOIN counters c ON c.id=q.counter_id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY CASE q.status WHEN 'SERVING' THEN 1 WHEN 'CALLED' THEN 2 WHEN 'WAITING' THEN 3 ELSE 4 END, q.joined_at ASC LIMIT 200`).all(...args) as any[]
  const active = serviceId ? ` AND service_id = '${serviceId.replaceAll("'", "''")}'` : ''
  const summary = db.prepare(`SELECT SUM(status='WAITING') waiting, SUM(status='CALLED') called, SUM(status='SERVING') serving, SUM(status='COMPLETED' AND date(completed_at)=date('now')) completed, AVG(CASE WHEN served_at IS NOT NULL THEN (julianday(served_at)-julianday(joined_at))*1440 END) average_wait FROM queue WHERE 1=1${active}`).get() as any
  const waiting = Number(summary.waiting || 0)
  const service = serviceId ? db.prepare('SELECT average_service_time FROM services WHERE service_id=?').get(serviceId) as any : null
  return { services, counters, rows: rows.map((row, index) => ({ ...row, position: row.status === 'WAITING' ? index + 1 : null, estimated_wait_time: row.estimated_wait_time ?? (service ? index * service.average_service_time : 0) })), summary: { waiting, called: Number(summary.called || 0), serving: Number(summary.serving || 0), completed: Number(summary.completed || 0), averageWait: Math.round(Number(summary.average_wait || 0)) } }
}

export function callNext(serviceId: string, counterId: number) {
  const tx = db.transaction(() => {
    const counter = db.prepare("SELECT * FROM counters WHERE id=? AND status != 'OFFLINE'").get(counterId) as any
    if (!counter || counter.service_id !== serviceId) throw new Error('NO_AVAILABLE_COUNTER')
    if (db.prepare("SELECT 1 FROM queue WHERE counter_id=? AND status IN ('CALLED','SERVING')").get(counterId)) throw new Error('COUNTER_BUSY')
    const row = db.prepare("SELECT * FROM queue WHERE service_id=? AND status='WAITING' ORDER BY joined_at ASC, id ASC LIMIT 1").get(serviceId) as any
    if (!row) throw new Error('QUEUE_EMPTY')
    const timestamp = now(); db.prepare("UPDATE queue SET status='CALLED', called_at=?, counter_id=?, updated_at=? WHERE id=? AND status='WAITING'").run(timestamp, counterId, timestamp, row.id)
    const updated = getQueue(row.id); history(updated, 'CALLED', counterId); return updated
  }); return tx()
}
export function transition(id: number, action: 'start'|'complete'|'no-show'|'cancel') {
  const tx = db.transaction(() => {
    const row = getQueue(id); if (!row) throw new Error('QUEUE_NOT_FOUND'); const timestamp = now()
    if (action === 'start') { if (row.status !== 'CALLED') throw new Error('INVALID_TRANSITION'); db.prepare("UPDATE queue SET status='SERVING', served_at=?, updated_at=? WHERE id=? AND status='CALLED'").run(timestamp, timestamp, id); const updated=getQueue(id); history(updated,'SERVING',updated.counter_id,timestamp); return updated }
    if (action === 'complete') { if (row.status !== 'SERVING') throw new Error('INVALID_TRANSITION'); db.prepare("UPDATE queue SET status='COMPLETED', completed_at=?, updated_at=? WHERE id=? AND status='SERVING'").run(timestamp,timestamp,id); const updated=getQueue(id); history(updated,'COMPLETED',updated.counter_id,updated.served_at); return updated }
    if (action === 'no-show') { if (row.status !== 'CALLED') throw new Error('INVALID_TRANSITION'); db.prepare("UPDATE queue SET status='NO_SHOW', updated_at=? WHERE id=? AND status='CALLED'").run(timestamp,id); const updated=getQueue(id); history(updated,'NO_SHOW',updated.counter_id); return updated }
    if (!['WAITING','CALLED','SERVING'].includes(row.status)) throw new Error('INVALID_TRANSITION'); db.prepare("UPDATE queue SET status='CANCELLED', updated_at=? WHERE id=?").run(timestamp,id); const updated=getQueue(id); history(updated,'CANCELLED',updated.counter_id); return updated
  }); return tx()
}
