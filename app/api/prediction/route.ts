import { NextRequest, NextResponse } from 'next/server'
import { createPrediction, findService, getQueueSnapshot } from '@/lib/db'

export const runtime = 'nodejs'
export function GET(request: NextRequest) { const serviceId = request.nextUrl.searchParams.get('service'); if (!serviceId) return NextResponse.json({ error: 'Service is required.' }, { status: 400 }); const prediction = createPrediction(serviceId); const service = findService(serviceId); const queue = getQueueSnapshot(serviceId); return prediction && service && queue ? NextResponse.json({ prediction, service, queue }) : NextResponse.json({ error: 'Service not found.' }, { status: 404 }) }
