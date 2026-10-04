'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  async function logout() { await fetch('/api/auth', { method: 'DELETE' }); router.replace('/admin/login') }
  return <button className="nav-secondary" type="button" onClick={logout}>Sign out</button>
}
