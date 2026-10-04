import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'

const databaseDirectory = path.join(process.cwd(), 'database')
const databasePath = process.env.QUEUELESS_DATABASE_PATH || path.join(databaseDirectory, 'queueless.sqlite')

fs.mkdirSync(path.dirname(databasePath), { recursive: true })

const globalForDatabase = globalThis as unknown as { queuelessDatabase?: Database.Database }
export const db = globalForDatabase.queuelessDatabase ?? new Database(databasePath)
if (process.env.NODE_ENV !== 'production') globalForDatabase.queuelessDatabase = db

db.pragma('foreign_keys = ON')
db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'CITIZEN' CHECK (role IN ('CITIZEN','ADMIN','STAFF')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, service_id TEXT NOT NULL UNIQUE, service_name TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, average_service_time INTEGER NOT NULL CHECK (average_service_time > 0), is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS counters (id INTEGER PRIMARY KEY AUTOINCREMENT, counter_number TEXT NOT NULL, service_id TEXT NOT NULL REFERENCES services(service_id), staff_user_id INTEGER REFERENCES users(id), status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','BUSY','OFFLINE')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(counter_number, service_id));
CREATE TABLE IF NOT EXISTS queue (id INTEGER PRIMARY KEY AUTOINCREMENT, service_id TEXT NOT NULL REFERENCES services(service_id), user_id INTEGER REFERENCES users(id), token_number TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','CALLED','SERVING','COMPLETED','CANCELLED','NO_SHOW')), position INTEGER NOT NULL, joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, called_at TEXT, completed_at TEXT, counter_id INTEGER REFERENCES counters(id), estimated_wait_time INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(service_id, token_number));
CREATE TABLE IF NOT EXISTS queue_history (id INTEGER PRIMARY KEY AUTOINCREMENT, queue_id INTEGER REFERENCES queue(id), service_id TEXT NOT NULL REFERENCES services(service_id), user_id INTEGER REFERENCES users(id), token_number TEXT NOT NULL, counter_id INTEGER REFERENCES counters(id), wait_time INTEGER NOT NULL DEFAULT 0, service_time INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, joined_at TEXT NOT NULL, served_at TEXT, completed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS predictions (id INTEGER PRIMARY KEY AUTOINCREMENT, service_id TEXT NOT NULL REFERENCES services(service_id), predicted_wait_time INTEGER NOT NULL, min_wait_time INTEGER NOT NULL, max_wait_time INTEGER NOT NULL, confidence REAL NOT NULL, prediction_source TEXT NOT NULL CHECK (prediction_source IN ('DEMO','RULE_BASED','ML_MODEL')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_queue_service_status ON queue(service_id, status);
`)

try { db.exec("ALTER TABLE queue ADD COLUMN served_at TEXT") } catch {}
db.exec('CREATE INDEX IF NOT EXISTS idx_queue_counter_status ON queue(counter_id, status)')

const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number }
if (serviceCount.count === 0) {
  const insert = db.prepare('INSERT INTO services (service_id, service_name, description, category, average_service_time) VALUES (?, ?, ?, ?, ?)')
  const seed = db.transaction(() => {
    insert.run('document-verification', 'Document Verification', 'Verify and submit documents for government services.', 'Documents', 15)
    insert.run('certificate-application', 'Certificate Application', 'Submit and process applications for eligible certificates.', 'Certificates', 20)
    insert.run('address-update', 'Address Update', 'Request an update to your registered address information.', 'Applications', 10)
    insert.run('id-services', 'ID Services', 'Access available identity-related government services.', 'Identity', 25)
    insert.run('application-submission', 'Application Submission', 'Submit applications and supporting documents.', 'Applications', 15)
  })
  seed()
  const addCounter = db.prepare('INSERT INTO counters (counter_number, service_id, status) VALUES (?, ?, ?)')
  for (const service of db.prepare('SELECT service_id FROM services').all() as { service_id: string }[]) {
    addCounter.run('01', service.service_id, 'AVAILABLE')
    addCounter.run('02', service.service_id, 'BUSY')
  }
}

export type ServiceRow = { service_id: string; service_name: string; description: string; category: string; average_service_time: number }
export function listServices() { return db.prepare('SELECT service_id, service_name, description, category, average_service_time FROM services WHERE is_active = 1 ORDER BY service_name').all() as ServiceRow[] }
export function findService(serviceId: string) { return db.prepare('SELECT service_id, service_name, description, category, average_service_time FROM services WHERE service_id = ? AND is_active = 1').get(serviceId) as ServiceRow | undefined }
export function getQueueSnapshot(serviceId: string) {
  const service = findService(serviceId)
  if (!service) return null
  const waiting = db.prepare("SELECT * FROM queue WHERE service_id = ? AND status IN ('WAITING','CALLED','SERVING') ORDER BY position, id").all(serviceId) as Array<Record<string, unknown>>
  const counters = db.prepare('SELECT counter_number, status FROM counters WHERE service_id = ? ORDER BY counter_number').all(serviceId) as Array<{ counter_number: string; status: string }>
  const activeCounters = counters.filter((counter) => counter.status !== 'OFFLINE').length
  const estimatedWait = Math.ceil((waiting.filter((entry) => entry.status === 'WAITING').length * service.average_service_time) / Math.max(activeCounters, 1))
  return { service, people_waiting: waiting.filter((entry) => entry.status === 'WAITING').length, active_counters: activeCounters, estimated_wait: estimatedWait, crowd_level: waiting.length > 12 ? 'high' : waiting.length > 5 ? 'medium' : 'low', current_token: waiting.find((entry) => entry.status === 'SERVING' || entry.status === 'CALLED')?.token_number ?? '—', queue_tokens: waiting.filter((entry) => entry.status === 'WAITING').map((entry) => entry.token_number), counters, queue_history: [] }
}
export function joinQueue(serviceId: string, userId?: number) {
  const service = findService(serviceId)
  if (!service) throw new Error('SERVICE_NOT_FOUND')
  if (userId && db.prepare("SELECT 1 FROM queue WHERE service_id = ? AND user_id = ? AND status IN ('WAITING','CALLED','SERVING')").get(serviceId, userId)) throw new Error('DUPLICATE_QUEUE_ENTRY')
  const next = db.prepare('SELECT COUNT(*) as count FROM queue WHERE service_id = ?').get(serviceId) as { count: number }
  const token = `${serviceId.split('-').map((part) => part[0]).join('').toUpperCase()}-${String(next.count + 1).padStart(3, '0')}`
  const position = (db.prepare("SELECT COUNT(*) as count FROM queue WHERE service_id = ? AND status = 'WAITING'").get(serviceId) as { count: number }).count + 1
  const result = db.prepare('INSERT INTO queue (service_id, user_id, token_number, position, estimated_wait_time) VALUES (?, ?, ?, ?, ?)').run(serviceId, userId ?? null, token, position, position * service.average_service_time)
  return db.prepare('SELECT * FROM queue WHERE id = ?').get(result.lastInsertRowid)
}
export function createPrediction(serviceId: string) { const snapshot = getQueueSnapshot(serviceId); if (!snapshot) return null; const predicted = snapshot.estimated_wait; const result = db.prepare('INSERT INTO predictions (service_id, predicted_wait_time, min_wait_time, max_wait_time, confidence, prediction_source) VALUES (?, ?, ?, ?, ?, ?)').run(serviceId, predicted, Math.max(0, predicted - 5), predicted + 10, 0.78, 'RULE_BASED'); return db.prepare('SELECT * FROM predictions WHERE id = ?').get(result.lastInsertRowid) }

export default db

process.on('exit', () => db.close())
process.on('SIGINT', () => { db.close(); process.exit(0) })
process.on('SIGTERM', () => { db.close(); process.exit(0) })

// The prediction functions intentionally stay in this module's server-only boundary so a future ML service can replace them without changing route consumers.
