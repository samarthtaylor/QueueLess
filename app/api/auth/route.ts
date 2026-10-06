import { NextRequest, NextResponse } from 'next/server'
import { createSession, hashPassword, verifyPassword } from '@/lib/auth'
import db from '@/lib/db'

export const runtime = 'nodejs'
type Role = 'CITIZEN' | 'STAFF' | 'ADMIN'
const genericError = 'The email/mobile number or password is incorrect.'
function bodyValue(body: unknown) { return body && typeof body === 'object' ? body as Record<string, unknown> : {} }
function normalizePhone(value: string) { const digits = value.replace(/\D/g, ''); return digits.length === 10 ? digits : null }
function cookie(response: NextResponse, userId: number, role: Role, remember = true) { response.cookies.set('queueless_session', createSession(userId, role), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: remember ? 60 * 60 * 24 * 7 : 60 * 60 * 8, path: '/' }) }
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>; try { body = bodyValue(await request.json()) } catch { return NextResponse.json({ error: 'Please check the information you entered.' }, { status: 400 }) }
  const action = request.nextUrl.searchParams.get('action') || 'login'
  if (action === 'register') {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const phone = typeof body.phone === 'string' ? normalizePhone(body.phone) : null
    const password = typeof body.password === 'string' ? body.password : ''
    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !phone || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || password !== body.confirmPassword) return NextResponse.json({ error: 'Please complete all fields and use a password with 8 characters, letters, and numbers.' }, { status: 400 })
    try { const result = db.prepare('INSERT INTO users (name, email, phone, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)').run(name.slice(0, 100), email, `+91${phone}`, await hashPassword(password), 'CITIZEN'); const response = NextResponse.json({ user: { id: result.lastInsertRowid, name, email, role: 'CITIZEN' } }, { status: 201 }); cookie(response, Number(result.lastInsertRowid), 'CITIZEN'); return response } catch { return NextResponse.json({ error: 'We could not create that account. Check your details and try again.' }, { status: 409 }) }
  }
  const identifier = typeof body.identifier === 'string' ? body.identifier.trim().toLowerCase() : typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!identifier || password.length < 8) return NextResponse.json({ error: 'Please enter your email or mobile number and password.' }, { status: 400 })
  const phone = normalizePhone(identifier)
  const user = db.prepare('SELECT id, name, email, password_hash, role, is_active FROM users WHERE lower(email) = ? OR phone = ?').get(identifier, phone ? `+91${phone}` : identifier) as { id: number; name: string; email: string; password_hash: string; role: Role; is_active: number } | undefined
  if (!user || !(await verifyPassword(password, user.password_hash))) return NextResponse.json({ error: genericError }, { status: 401 })
  if (!user.is_active) return NextResponse.json({ error: 'Your account is currently inactive. Please contact support.' }, { status: 403 })
  if (action === 'admin-login' && user.role === 'CITIZEN') return NextResponse.json({ error: 'This portal is restricted to authorized staff.' }, { status: 403 })
  const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }); cookie(response, user.id, user.role, body.remember !== false); return response
}
export async function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.set('queueless_session', '', { httpOnly: true, expires: new Date(0), path: '/' }); return response }
