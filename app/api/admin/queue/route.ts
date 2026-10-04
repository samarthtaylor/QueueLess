import { NextResponse } from 'next/server'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { callNext, getAdminQueueData, transition } from '@/lib/admin-queue'

function errorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : 'OPERATION_FAILED'
  const messages: Record<string,string> = { UNAUTHORIZED:'You are not authorized to operate queues.', QUEUE_EMPTY:'There are currently no citizens waiting for this service.', NO_AVAILABLE_COUNTER:'No available counter is assigned to this service.', COUNTER_BUSY:'This counter is already serving a citizen.', INVALID_TRANSITION:'That queue action is no longer available.', QUEUE_NOT_FOUND:'Queue entry not found.' }
  const status = code === 'UNAUTHORIZED' ? 403 : code === 'QUEUE_EMPTY' ? 409 : 400
  return NextResponse.json({ error: messages[code] || 'Unable to update the queue.' }, { status })
}
export async function GET(request: Request) {
  try { const user = await getCurrentUser(); requireRole(user, ['ADMIN','STAFF']); const url = new URL(request.url); const data = getAdminQueueData(url.searchParams.get('service') || undefined, Number(url.searchParams.get('counter')) || undefined, url.searchParams.get('status') || undefined, url.searchParams.get('search') || undefined); return NextResponse.json(data) } catch (error) { return errorResponse(error) }
}
export async function POST(request: Request) {
  try { const user = await getCurrentUser(); requireRole(user, ['ADMIN','STAFF']); const body = await request.json(); const result = body.action === 'call-next' ? callNext(String(body.serviceId), Number(body.counterId)) : transition(Number(body.queueId), body.action); return NextResponse.json({ result }) } catch (error) { return errorResponse(error) }
}
