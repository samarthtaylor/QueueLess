import { NextRequest, NextResponse } from 'next/server'
import { listServices } from '@/lib/db'

export const runtime = 'nodejs'
export function GET(request: NextRequest) { const category = request.nextUrl.searchParams.get('category')?.toLowerCase(); const services = listServices(); const recommendations = category ? services.filter((service) => service.category.toLowerCase() === category || service.service_name.toLowerCase().includes(category)) : services.slice(0, 3); return NextResponse.json({ recommendations }) }
