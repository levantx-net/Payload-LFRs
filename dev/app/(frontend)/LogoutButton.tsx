'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    try {
      setLoading(true)
      await fetch('/api/users/logout', { method: 'POST' })
      router.push('/posts')
      router.refresh()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className="nav-link"
      disabled={loading}
      onClick={handleLogout}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 'inherit',
      }}
      type="button"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  )
}
