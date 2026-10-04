import { NextResponse } from 'next/server'
import { listServices } from '@/lib/db'

export const runtime = 'nodejs'
export function GET() { return NextResponse.json({ services: listServices() }) }
