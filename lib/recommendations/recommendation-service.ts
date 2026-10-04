import { db, findService, getQueueSnapshot } from '@/lib/db'

type CrowdLevel = 'Low' | 'Medium' | 'High'
export type RecommendationWindow = { start: string; end: string; expected_wait_min: number; expected_wait_max: number; crowd_level: CrowdLevel; score: number }

const OPERATING_HOURS = { start: 9, end: 18, windowMinutes: 30 }
const activeStatuses = ['WAITING', 'CALLED', 'SERVING']
const average = (values: number[], fallback: number) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback
const hourLabel = (totalMinutes: number) => { const hour = Math.floor(totalMinutes / 60); const minute = totalMinutes % 60; const suffix = hour >= 12 ? 'PM' : 'AM'; const display = hour % 12 || 12; return `${display}:${String(minute).padStart(2, '0')} ${suffix}` }
const crowdFor = (wait: number, dailyAverage: number): CrowdLevel => wait > dailyAverage * 1.35 ? 'High' : wait > dailyAverage * 0.8 ? 'Medium' : 'Low'

export function generateRecommendation(serviceId: string) {
  const service = findService(serviceId)
  if (!service) return { error: 'NOT_FOUND' as const }
  const snapshot = getQueueSnapshot(serviceId)
  if (!snapshot) return { error: 'NOT_FOUND' as const }
  if (snapshot.active_counters === 0) return { error: 'NO_COUNTERS' as const, service_name: service.service_name }

  const history = db.prepare(`SELECT wait_time, service_time, created_at FROM queue_history WHERE service_id = ? ORDER BY created_at DESC LIMIT 500`).all(serviceId) as Array<{ wait_time: number; service_time: number; created_at: string }>
  const historicalWait = average(history.map((row) => row.wait_time).filter((value) => value > 0), snapshot.estimated_wait)
  const serviceTime = average(history.map((row) => row.service_time).filter((value) => value > 0), service.average_service_time)
  const currentWaiting = snapshot.people_waiting
  const dailyBaseline = Math.max(serviceTime, historicalWait, 1)
  const now = new Date()
  const currentHour = now.getHours() + now.getMinutes() / 60
  const candidates: RecommendationWindow[] = []

  for (let hour = OPERATING_HOURS.start; hour < OPERATING_HOURS.end; hour += 0.5) {
    const minute = hour % 1 ? 30 : 0
    const startMinutes = Math.round(hour * 60)
    const endMinutes = startMinutes + OPERATING_HOURS.windowMinutes
    const distance = Math.max(0, hour - currentHour)
    const decay = Math.max(0.25, 1 - distance * 0.08)
    const historicalFactor = history.length ? 1 + ((hour % 3) - 1) * 0.08 : 1
    const queueWait = Math.ceil((currentWaiting * serviceTime * decay * historicalFactor) / snapshot.active_counters)
    const expected = Math.max(0, Math.round(queueWait))
    const spread = Math.max(5, Math.round(serviceTime * 0.45))
    const crowd = crowdFor(expected, dailyBaseline)
    const score = Math.round(100 - expected * 1.5 - (crowd === 'High' ? 20 : crowd === 'Medium' ? 8 : 0) + snapshot.active_counters * 4 + (history.length ? 8 : 0) - (hour < currentHour ? 30 : 0))
    candidates.push({ start: hourLabel(startMinutes), end: hourLabel(endMinutes), expected_wait_min: Math.max(0, expected - spread), expected_wait_max: expected + spread, crowd_level: crowd, score })
  }

  const ranked = candidates.sort((a, b) => b.score - a.score)
  const recommended = ranked[0]
  const reasons = [`${recommended.crowd_level === 'Low' ? 'Lower' : 'Manageable'} expected wait during this window.`]
  if (recommended.crowd_level === 'Low') reasons.push('Expected visitor volume is below the daily average.')
  if (snapshot.active_counters > 1) reasons.push(`${snapshot.active_counters} active counters are available for this service.`)
  if (history.length) reasons.push('Historical queue records were included in the estimate.')
  const confidence = Math.min(96, Math.max(45, Math.round(52 + Math.min(history.length, 100) * 0.25 + (snapshot.active_counters > 1 ? 10 : 0) + (currentWaiting >= 0 ? 8 : 0))))
  return { service_id: service.service_id, service_name: service.service_name, recommended_window: recommended, expected_wait_min: recommended.expected_wait_min, expected_wait_max: recommended.expected_wait_max, crowd_level: recommended.crowd_level, confidence, reasons, alternatives: ranked.slice(1, 4), current: { people_waiting: snapshot.people_waiting, active_counters: snapshot.active_counters, expected_wait: snapshot.estimated_wait, crowd_level: snapshot.crowd_level }, timeline: candidates, generated_at: new Date().toISOString(), source: 'RULE_BASED', data_points: history.length }
}

export { OPERATING_HOURS, activeStatuses }
