import bcrypt from 'bcryptjs'
import { createHmac, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import db from '@/lib/db'

type Role = 'CITIZEN' | 'ADMIN' | 'STAFF'
const secret = process.env.AUTH_SECRET || 'development-only-queueless-secret'

function sign(value: string) { return createHmac('sha256', secret).update(value).digest('hex') }
export async function hashPassword(password: string) { return bcrypt.hash(password, 12) }
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash) }
export function createSession(userId: number, role: Role) { const payload = `${userId}.${role}.${Date.now()}.${randomBytes(16).toString('hex')}`; return `${payload}.${sign(payload)}` }
export function readSession(token: string | undefined) { if (!token) return null; const parts = token.split('.'); if (parts.length !== 5) return null; const payload = parts.slice(0, 4).join('.'); if (sign(payload) !== parts[4]) return null; const userId = Number(parts[0]); const createdAt = Number(parts[2]); const role = parts[1]; if (!Number.isInteger(userId) || !['CITIZEN', 'ADMIN', 'STAFF'].includes(role) || !Number.isFinite(createdAt) || Date.now() - createdAt > 1000 * 60 * 60 * 24 * 7) return null; return { userId, role: role as Role } }
export async function getCurrentUser() { const token = (await cookies()).get('queueless_session')?.value; const session = readSession(token); if (!session) return null; return db.prepare('SELECT id, name, email, phone, role FROM users WHERE id = ?').get(session.userId) as { id: number; name: string; email: string; phone: string | null; role: Role } | undefined ?? null }
export function requireRole(user: { role: Role } | null, roles: Role[]) { if (!user || !roles.includes(user.role)) throw new Error('UNAUTHORIZED') }
