'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      return setError('Please enter both email and password.')
    }

    try {
      setLoading(true)
      setError('')
      const res = await fetch('/api/users/login', {
        body: JSON.stringify({ email, password }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (res.ok) {
        router.push('/posts')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.message || 'Failed to login.')
      }
    } catch (e) {
      setError('An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ margin: '4rem auto', maxWidth: '400px', textAlign: 'center' }}>
      <h1 className="page-title">Login</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Welcome back. Please login to your account.
      </p>

      {error && (
        <div
          style={{
            background: 'rgba(244, 63, 94, 0.1)',
            borderRadius: '8px',
            color: 'var(--accent)',
            marginBottom: '1rem',
            padding: '1rem',
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleLogin}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}
      >
        <div>
          <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
            Email
          </label>
          <input
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'white',
              fontFamily: 'inherit',
              padding: '0.75rem',
              width: '100%',
            }}
            type="email"
            value={email}
          />
        </div>
        <div>
          <label style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
            Password
          </label>
          <input
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'white',
              fontFamily: 'inherit',
              padding: '0.75rem',
              width: '100%',
            }}
            type="password"
            value={password}
          />
        </div>
        <button
          className="btn-fav"
          disabled={loading}
          style={{ justifyContent: 'center', marginTop: '1rem' }}
          type="submit"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <div style={{ color: 'var(--text-muted)', marginTop: '2rem' }}>
        Don&apos;t have an account?{' '}
        <Link href="/register" style={{ color: 'var(--primary)' }}>
          Register here
        </Link>
      </div>
    </div>
  )
}
