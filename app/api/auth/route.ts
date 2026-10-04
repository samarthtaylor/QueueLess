import { NextRequest, NextResponse } from 'next/server'
import { createSession, hashPassword, verifyPassword } from '@/lib/auth'
import db from '@/lib/db'

export const runtime = 'nodejs'
const credentials = (body: unknown) => { if (!body || typeof body !== 'object') return null; const value = body as Record<string, unknown>; return typeof value.email === 'string' && typeof value.password === 'string' ? { email: value.email.trim().toLowerCase(), password: value.password } : null }
export async function POST(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'login'; const input = credentials(await request.json()); if (!input || input.password.length < 8) return NextResponse.json({ error: 'Enter a valid email and password of at least 8 characters.' }, { status: 400 })
  if (action === 'register') { const name = request.nextUrl.searchParams.get('name') || 'QueueLess Citizen'; try { const result = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)').run(name.slice(0, 100), input.email, await hashPassword(input.password), 'CITIZEN'); const response = NextResponse.json({ user: { id: result.lastInsertRowid, name, email: input.email, role: 'CITIZEN' } }, { status: 201 }); response.cookies.set('queueless_session', createSession(Number(result.lastInsertRowid), 'CITIZEN'), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/' }); return response } catch { return NextResponse.json({ error: 'That email is already registered.' }, { status: 409 }) }
  }
  const user = db.prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ?').get(input.email) as { id: number; name: string; email: string; password_hash: string; role: 'CITIZEN' | 'ADMIN' | 'STAFF' } | undefined
  if (!user || !(await verifyPassword(input.password, user.password_hash))) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 })
  if (action === 'admin-login' && user.role === 'CITIZEN') return NextResponse.json({ error: 'This portal is restricted to authorized staff.' }, { status: 403 })
  const response = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }); response.cookies.set('queueless_session', createSession(user.id, user.role), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/' }); return response
}
export async function DELETE() { const response = NextResponse.json({ ok: true }); response.cookies.delete('queueless_session'); return response }
