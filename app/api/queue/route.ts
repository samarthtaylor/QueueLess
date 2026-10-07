import { NextRequest, NextResponse } from 'next/server'
import { getQueueSnapshot, joinQueue } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'
export function GET(request: NextRequest) { const serviceId = request.nextUrl.searchParams.get('service'); if (!serviceId) return NextResponse.json({ error: 'Service is required.' }, { status: 400 }); const snapshot = getQueueSnapshot(serviceId); return snapshot ? NextResponse.json(snapshot) : NextResponse.json({ error: 'Service not found.' }, { status: 404 }) }
export async function POST(request: NextRequest) { try { const user = await getCurrentUser(); if (!user || user.role !== 'CITIZEN') return NextResponse.json({ error: 'AUTHENTICATION_REQUIRED' }, { status: 401 }); const body = await request.json(); const serviceId = typeof body.service_id === 'string' ? body.service_id.trim() : ''; if (!serviceId) return NextResponse.json({ error: 'Service is required.' }, { status: 400 }); return NextResponse.json({ queue: joinQueue(serviceId, user.id) }, { status: 201 }) } catch (error) { const code = error instanceof Error ? error.message : 'UNKNOWN'; const status = code === 'SERVICE_NOT_FOUND' ? 404 : code === 'DUPLICATE_QUEUE_ENTRY' ? 409 : 500; return NextResponse.json({ error: status === 500 ? 'Unable to join queue.' : code }, { status }) } }
