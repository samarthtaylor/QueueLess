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
// Use SQLite's rollback journal so transient WAL files are not produced during build/deployment tracing.
db.pragma('journal_mode = DELETE')

db.exec(`
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'CITIZEN' CHECK (role IN ('CITIZEN','ADMIN','STAFF')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, service_id TEXT NOT NULL UNIQUE, service_name TEXT NOT NULL, description TEXT NOT NULL, category TEXT NOT NULL, department TEXT NOT NULL DEFAULT 'Citizen Services', required_documents TEXT NOT NULL DEFAULT '[]', keywords TEXT NOT NULL DEFAULT '', average_service_time INTEGER NOT NULL CHECK (average_service_time > 0), popularity_level TEXT NOT NULL DEFAULT 'MEDIUM', average_daily_visitors INTEGER NOT NULL DEFAULT 40, peak_hours TEXT NOT NULL DEFAULT '10:00-13:00', demand_profile TEXT NOT NULL DEFAULT 'STEADY', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS counters (id INTEGER PRIMARY KEY AUTOINCREMENT, counter_number TEXT NOT NULL, service_id TEXT NOT NULL REFERENCES services(service_id), staff_user_id INTEGER REFERENCES users(id), status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','BUSY','OFFLINE')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(counter_number, service_id));
CREATE TABLE IF NOT EXISTS queue (id INTEGER PRIMARY KEY AUTOINCREMENT, service_id TEXT NOT NULL REFERENCES services(service_id), user_id INTEGER REFERENCES users(id), token_number TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','CALLED','SERVING','COMPLETED','CANCELLED','NO_SHOW')), position INTEGER NOT NULL, joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, called_at TEXT, completed_at TEXT, counter_id INTEGER REFERENCES counters(id), estimated_wait_time INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(service_id, token_number));
CREATE TABLE IF NOT EXISTS queue_history (id INTEGER PRIMARY KEY AUTOINCREMENT, queue_id INTEGER REFERENCES queue(id), service_id TEXT NOT NULL REFERENCES services(service_id), user_id INTEGER REFERENCES users(id), token_number TEXT NOT NULL, counter_id INTEGER REFERENCES counters(id), wait_time INTEGER NOT NULL DEFAULT 0, service_time INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, joined_at TEXT NOT NULL, served_at TEXT, completed_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS predictions (id INTEGER PRIMARY KEY AUTOINCREMENT, service_id TEXT NOT NULL REFERENCES services(service_id), predicted_wait_time INTEGER NOT NULL, min_wait_time INTEGER NOT NULL, max_wait_time INTEGER NOT NULL, confidence REAL NOT NULL, prediction_source TEXT NOT NULL CHECK (prediction_source IN ('DEMO','RULE_BASED','ML_MODEL')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id), action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS saved_services (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, service_id TEXT NOT NULL REFERENCES services(service_id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, service_id));
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, body TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_saved_services_user ON saved_services(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_services_active_category ON services(is_active, category, service_name);
CREATE INDEX IF NOT EXISTS idx_services_service_id_active ON services(service_id, is_active);
CREATE INDEX IF NOT EXISTS idx_queue_service_status ON queue(service_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_user_status ON queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_service_created ON queue(service_id, created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_service_created ON predictions(service_id, created_at);
CREATE INDEX IF NOT EXISTS idx_counters_service_status ON counters(service_id, status);
`)

try { db.exec("ALTER TABLE queue ADD COLUMN served_at TEXT") } catch {}
db.exec('CREATE INDEX IF NOT EXISTS idx_queue_counter_status ON queue(counter_id, status)')

try { db.exec("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1") } catch {}
for (const statement of [
  "ALTER TABLE services ADD COLUMN department TEXT NOT NULL DEFAULT 'Citizen Services'",
  "ALTER TABLE services ADD COLUMN required_documents TEXT NOT NULL DEFAULT '[]'",
  "ALTER TABLE services ADD COLUMN keywords TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE services ADD COLUMN popularity_level TEXT NOT NULL DEFAULT 'MEDIUM'",
  "ALTER TABLE services ADD COLUMN average_daily_visitors INTEGER NOT NULL DEFAULT 40",
  "ALTER TABLE services ADD COLUMN peak_hours TEXT NOT NULL DEFAULT '10:00-13:00'",
  "ALTER TABLE services ADD COLUMN demand_profile TEXT NOT NULL DEFAULT 'STEADY'",
]) { try { db.exec(statement) } catch {} }

const catalogue = [
  ['aadhaar-services', 'Aadhaar-related Services', 'Identity and Aadhaar enrolment, updates, and support.', 'Identity & Citizen Documents', 'UIDAI Citizen Services', 20, 'Aadhaar card, identity proof, address proof', 'aadhaar identity uidai'],
  ['pan-services', 'PAN-related Services', 'Apply for or update your Permanent Account Number details.', 'Identity & Citizen Documents', 'Income Tax Department', 20, 'Identity proof, address proof, photograph', 'pan tax card'],
  ['birth-certificate', 'Birth Certificate', 'Apply for a new birth certificate or request a certified copy.', 'Identity & Citizen Documents', 'Municipal Corporation', 25, 'Hospital record, parent identity proof, address proof', 'birth registration certificate'],
  ['death-certificate', 'Death Certificate', 'Request an official death certificate for a registered death.', 'Identity & Citizen Documents', 'Municipal Corporation', 25, 'Medical certificate, deceased identity proof, applicant identity proof', 'death registration certificate'],
  ['domicile-certificate', 'Domicile Certificate', 'Apply for proof of residence in the state or district.', 'Identity & Citizen Documents', 'Revenue Department', 25, 'Identity proof, address proof, residence evidence', 'domicile residence'],
  ['caste-certificate', 'Caste Certificate', 'Apply for an official caste or community certificate.', 'Identity & Citizen Documents', 'Revenue Department', 30, 'Identity proof, address proof, supporting caste record', 'caste community certificate'],
  ['income-certificate', 'Income Certificate', 'Obtain an official certificate of annual family income.', 'Identity & Citizen Documents', 'Revenue Department', 25, 'Identity proof, address proof, income declaration', 'income certificate earnings'],
  ['ews-certificate', 'EWS Certificate', 'Apply for an Economically Weaker Section certificate.', 'Identity & Citizen Documents', 'Revenue Department', 30, 'Identity proof, income proof, property declaration', 'ews economic weaker section'],
  ['residence-certificate', 'Residence Certificate', 'Request proof of current residential address.', 'Identity & Citizen Documents', 'Revenue Department', 20, 'Identity proof, address proof, application form', 'residence address'],
  ['driving-licence', 'Driving Licence', 'Apply for a new permanent driving licence.', 'Transport', 'Regional Transport Office', 35, 'Learner licence, age proof, address proof', 'driving license transport rto'],
  ['learners-licence', "Learner's Licence", 'Apply for a learner driving licence and test appointment.', 'Transport', 'Regional Transport Office', 30, 'Age proof, address proof, photograph', 'learner licence driving test'],
  ['driving-licence-renewal', 'Driving Licence Renewal', 'Renew an existing driving licence before or after expiry.', 'Transport', 'Regional Transport Office', 25, 'Existing licence, identity proof, medical certificate where applicable', 'renew driving license'],
  ['vehicle-registration', 'Vehicle Registration', 'Register a new vehicle and receive registration services.', 'Transport', 'Regional Transport Office', 40, 'Sale invoice, insurance, identity proof, address proof', 'vehicle rc registration'],
  ['vehicle-transfer', 'Vehicle Transfer', 'Transfer vehicle ownership to a new registered owner.', 'Transport', 'Regional Transport Office', 35, 'Registration certificate, sale agreement, insurance', 'vehicle ownership transfer'],
  ['land-records', 'Land Records', 'Access and request certified land record extracts.', 'Revenue & Land', 'Land Records Department', 25, 'Identity proof, property details, application form', 'land property records'],
  ['property-tax', 'Property Tax', 'Pay or update municipal property tax records.', 'Municipal Services', 'Municipal Corporation', 20, 'Property ID, identity proof, previous receipt', 'property tax municipal'],
  ['water-connection', 'Water Connection', 'Apply for a new municipal water connection.', 'Municipal Services', 'Water Supply Department', 35, 'Ownership proof, identity proof, address proof', 'water connection supply'],
  ['building-permission', 'Building Permission', 'Submit a building plan and request construction permission.', 'Municipal Services', 'Town Planning Department', 45, 'Site plan, ownership proof, building drawings', 'building construction permission'],
  ['pension-services', 'Pension Services', 'Apply for and manage eligible social security pensions.', 'Social Welfare', 'Social Welfare Department', 30, 'Identity proof, bank details, age or eligibility proof', 'pension senior citizen welfare'],
  ['scholarship-services', 'Scholarship Services', 'Submit an application for eligible government scholarships.', 'Social Welfare', 'Education Welfare Department', 30, 'Student ID, income certificate, bank details', 'scholarship education student'],
  ['senior-citizen-services', 'Senior Citizen Services', 'Access services and support available for senior citizens.', 'Social Welfare', 'Social Welfare Department', 20, 'Identity proof, age proof, address proof', 'senior citizen welfare'],
  ['employment-registration', 'Employment Registration', 'Register as a job seeker with the employment exchange.', 'Employment & Business', 'Employment Department', 20, 'Identity proof, qualification certificates, address proof', 'employment job registration'],
  ['trade-licence', 'Trade Licence', 'Apply for a municipal licence to operate a trade or business.', 'Employment & Business', 'Municipal Corporation', 35, 'Identity proof, premises proof, business details', 'trade business licence'],
  ['shop-establishment-registration', 'Shop & Establishment Registration', 'Register a shop or commercial establishment.', 'Employment & Business', 'Labour Department', 40, 'Identity proof, premises proof, business constitution', 'shop establishment labour business'],
  ['character-certificate', 'Character Certificate', 'Request a character and antecedent verification certificate.', 'Certificates & General Services', 'Citizen Services Department', 25, 'Identity proof, address proof, purpose declaration', 'character police verification'],
  ['legal-heir-certificate', 'Legal Heir Certificate', 'Apply for a certificate identifying legal heirs.', 'Certificates & General Services', 'Revenue Department', 35, 'Death certificate, family records, identity proof', 'legal heir succession'],
  ['solvency-certificate', 'Solvency Certificate', 'Request a certificate confirming financial solvency.', 'Certificates & General Services', 'Revenue Department', 30, 'Identity proof, asset records, income proof', 'solvency finance certificate'],
  ['document-verification', 'Document Verification', 'Verify and submit documents for government services.', 'Certificates & General Services', 'Citizen Services Department', 15, 'Original document, identity proof, application reference', 'document verification'],
  ['application-status', 'Application Status', 'Check the latest status of an existing application.', 'Certificates & General Services', 'Citizen Services Department', 10, 'Application reference number, identity proof', 'application status tracking'],
]
const profileFor = (serviceId: string, category: string, duration: number) => {
  const high = ['aadhaar-services', 'pan-services', 'birth-certificate', 'driving-licence', 'property-tax', 'document-verification', 'application-status']
  const low = ['solvency-certificate', 'building-permission', 'legal-heir-certificate', 'character-certificate']
  const hash = [...serviceId].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const popularity_level = high.includes(serviceId) ? 'HIGH' : low.includes(serviceId) ? 'LOW' : category === 'Identity & Citizen Documents' ? 'MEDIUM_HIGH' : 'MEDIUM'
  const average_daily_visitors = popularity_level === 'HIGH' ? 90 + hash % 51 : popularity_level === 'MEDIUM_HIGH' ? 60 + hash % 31 : popularity_level === 'LOW' ? 12 + hash % 19 : 32 + hash % 29
  const demand_profile = hash % 3 === 0 ? 'MORNING_PEAK' : hash % 3 === 1 ? 'STEADY' : 'AFTERNOON_PEAK'
  const peak_hours = demand_profile === 'MORNING_PEAK' ? '09:00-12:00' : demand_profile === 'AFTERNOON_PEAK' ? '13:00-16:00' : '10:00-14:00'
  return { popularity_level, average_daily_visitors, peak_hours, demand_profile, duration }
}
const upsertService = db.prepare(`INSERT INTO services (service_id, service_name, description, category, department, required_documents, keywords, average_service_time, popularity_level, average_daily_visitors, peak_hours, demand_profile) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(service_id) DO UPDATE SET service_name=excluded.service_name, description=excluded.description, category=excluded.category, department=excluded.department, required_documents=excluded.required_documents, keywords=excluded.keywords, average_service_time=excluded.average_service_time, popularity_level=excluded.popularity_level, average_daily_visitors=excluded.average_daily_visitors, peak_hours=excluded.peak_hours, demand_profile=excluded.demand_profile, updated_at=CURRENT_TIMESTAMP`)
for (const service of catalogue) { const profile = profileFor(String(service[0]), String(service[3]), Number(service[5])); upsertService.run(service[0], service[1], service[2], service[3], service[4], JSON.stringify(String(service[6]).split(', ')), service[7], service[5], profile.popularity_level, profile.average_daily_visitors, profile.peak_hours, profile.demand_profile) }
db.exec(`UPDATE services SET category = CASE category WHEN 'Identity & Citizen Documents' THEN 'Identity & Certificates' WHEN 'Certificates & General Services' THEN 'Other Citizen Services' WHEN 'Documents' THEN 'Identity & Certificates' WHEN 'Certificates' THEN 'Identity & Certificates' WHEN 'Identity' THEN 'Identity & Certificates' WHEN 'Applications' THEN 'Other Citizen Services' ELSE category END`)
const ensureCounter = db.prepare("INSERT OR IGNORE INTO counters (counter_number, service_id, status) VALUES (?, ?, 'AVAILABLE')")
for (const service of db.prepare('SELECT service_id, popularity_level FROM services').all() as { service_id: string; popularity_level: string }[]) {
  ensureCounter.run('01', service.service_id)
  ensureCounter.run('02', service.service_id)
  if (service.popularity_level === 'HIGH' || service.popularity_level === 'MEDIUM_HIGH') ensureCounter.run('03', service.service_id)
}

const sampleQueueCount = db.prepare("SELECT COUNT(*) as count FROM queue WHERE token_number LIKE 'DEMO-%'").get() as { count: number }
if (sampleQueueCount.count === 0) {
  const seedSampleData = db.transaction(() => {
    const services = db.prepare('SELECT service_id, average_service_time, popularity_level FROM services WHERE is_active = 1 ORDER BY service_id').all() as Array<{ service_id: string; average_service_time: number; popularity_level: string }>
    const insert = db.prepare("INSERT INTO queue (service_id, user_id, token_number, status, position, joined_at, estimated_wait_time) VALUES (?, NULL, ?, ?, ?, datetime('now', ?), ?)")
    const counts: Record<string, number> = { HIGH: 9, MEDIUM_HIGH: 6, MEDIUM: 4, LOW: 2 }
    for (const service of services) {
      const total = counts[service.popularity_level] ?? 4
      const seed = [...service.service_id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
      let busyAssigned = false
      for (let index = 0; index < total; index += 1) {
        const status = index === 0 && seed % 2 === 0 ? 'SERVING' : index === 1 && seed % 3 === 0 ? 'CALLED' : 'WAITING'
        const offset = `-${Math.max(1, total - index) * 7} minutes`
        insert.run(service.service_id, `DEMO-${service.service_id.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`, status, index + 1, offset, Math.ceil((index + (status === 'SERVING' ? 0 : 1)) * service.average_service_time / 2))
        if (status === 'SERVING' && !busyAssigned) { db.prepare("UPDATE counters SET status = 'BUSY' WHERE service_id = ? AND status = 'AVAILABLE' ORDER BY id LIMIT 1").run(service.service_id); busyAssigned = true }
      }
    }
  })
  seedSampleData()
}
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

export type ServiceRow = { service_id: string; service_name: string; description: string; category: string; department: string; required_documents: string; keywords: string; average_service_time: number; popularity_level: string; average_daily_visitors: number; peak_hours: string; demand_profile: string; is_active?: number }
const serviceColumns = 'service_id, service_name, description, category, department, required_documents, keywords, average_service_time, popularity_level, average_daily_visitors, peak_hours, demand_profile, is_active'
export type ServiceMenuRow = Pick<ServiceRow, 'service_id' | 'service_name' | 'category' | 'description' | 'department'>
export function listServices() { return db.prepare(`SELECT ${serviceColumns} FROM services WHERE is_active = 1 ORDER BY service_name`).all() as ServiceRow[] }
export function listServiceMenu() { return db.prepare(`SELECT service_id, service_name, CASE category WHEN 'Identity & Citizen Documents' THEN 'Identity & Certificates' WHEN 'Documents' THEN 'Identity & Certificates' WHEN 'Certificates' THEN 'Identity & Certificates' WHEN 'Identity' THEN 'Identity & Certificates' WHEN 'Applications' THEN 'Other Citizen Services' ELSE category END AS category, description, department FROM services WHERE is_active = 1 ORDER BY category, service_name`).all() as ServiceMenuRow[] }
export function findService(serviceId: string) { return db.prepare(`SELECT ${serviceColumns} FROM services WHERE service_id = ? AND is_active = 1`).get(serviceId) as ServiceRow | undefined }
export function getQueueSnapshot(serviceId: string) {
  const service = findService(serviceId)
  if (!service) return null
  const waiting = db.prepare("SELECT token_number, status, position FROM queue WHERE service_id = ? AND status IN ('WAITING','CALLED','SERVING') ORDER BY position, id").all(serviceId) as Array<Record<string, unknown>>
  const counters = db.prepare('SELECT counter_number, status FROM counters WHERE service_id = ? ORDER BY counter_number').all(serviceId) as Array<{ counter_number: string; status: string }>
  const waitingCount = waiting.filter((entry) => entry.status === 'WAITING').length
  const servingCount = waiting.filter((entry) => entry.status === 'SERVING' || entry.status === 'CALLED').length
  const activeCounters = counters.filter((counter) => counter.status !== 'OFFLINE').length
  const totalCounters = counters.length
  const completedToday = db.prepare("SELECT COUNT(*) as count FROM queue WHERE service_id = ? AND status = 'COMPLETED' AND date(COALESCE(completed_at, updated_at)) = date('now')").get(serviceId) as { count: number }
  const effectiveCounters = counters.filter((counter) => counter.status === 'AVAILABLE' || counter.status === 'BUSY').length
  const estimatedWait = effectiveCounters > 0 ? Math.max(0, Math.ceil(((waitingCount + servingCount * 0.5) * service.average_service_time) / effectiveCounters)) : null
  const utilization = totalCounters > 0 ? Math.round((counters.filter((counter) => counter.status === 'BUSY').length / totalCounters) * 100) : 0
  return { service, people_waiting: waitingCount, people_serving: servingCount, active_counters: activeCounters, total_counters: totalCounters, completed_today: completedToday.count, average_service_duration: service.average_service_time, estimated_wait: estimatedWait, counter_utilization: utilization, operational_status: effectiveCounters > 0 ? 'operational' : 'delayed', crowd_level: waiting.length > 12 ? 'high' : waiting.length > 5 ? 'medium' : 'low', current_token: waiting.find((entry) => entry.status === 'SERVING' || entry.status === 'CALLED')?.token_number ?? '—', queue_tokens: waiting.filter((entry) => entry.status === 'WAITING').map((entry) => entry.token_number), counters, queue_history: [] }
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
export function createPrediction(serviceId: string) { const snapshot = getQueueSnapshot(serviceId); if (!snapshot || snapshot.estimated_wait === null) return null; const predicted = snapshot.estimated_wait; const result = db.prepare('INSERT INTO predictions (service_id, predicted_wait_time, min_wait_time, max_wait_time, confidence, prediction_source) VALUES (?, ?, ?, ?, ?, ?)').run(serviceId, predicted, Math.max(0, predicted - 5), predicted + 10, 0.78, 'RULE_BASED'); return db.prepare('SELECT * FROM predictions WHERE id = ?').get(result.lastInsertRowid) }

export default db

process.on('exit', () => db.close())
process.on('SIGINT', () => { db.close(); process.exit(0) })
process.on('SIGTERM', () => { db.close(); process.exit(0) })

// The prediction functions intentionally stay in this module's server-only boundary so a future ML service can replace them without changing route consumers.
