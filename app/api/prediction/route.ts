import { NextRequest, NextResponse } from 'next/server'
import { createPrediction } from '@/lib/db'

export const runtime = 'nodejs'
export function GET(request: NextRequest) { const serviceId = request.nextUrl.searchParams.get('service'); if (!serviceId) return NextResponse.json({ error: 'Service is required.' }, { status: 400 }); const prediction = createPrediction(serviceId); return prediction ? NextResponse.json({ prediction }) : NextResponse.json({ error: 'Service not found.' }, { status: 404 }) }
