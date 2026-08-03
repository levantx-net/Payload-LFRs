import '../globals.css'
import Link from 'next/link'
import React from 'react'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { LogoutButton } from './LogoutButton'

export const metadata = {
  title: 'Test LFRs Plugin',
  description: 'Testing the LFRs Payload CMS Plugin',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: await headers() })

  return (
    <html lang="en">
      <body>
        <header className="header">
          <Link href="/" className="header-logo">
            LFRs Demo
          </Link>
          <nav className="header-nav">
            <Link href="/" className="nav-link">
              Home
            </Link>
            <Link href="/posts" className="nav-link">
              All Posts
            </Link>
            {user ? (
              <>
                <span className="nav-link" style={{ color: 'var(--lfrs-star-active)' }}>
                  Hello {user.email}
                </span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="nav-link">
                  Login
                </Link>
                <Link href="/register" className="nav-link">
                  Register
                </Link>
              </>
            )}
            <Link href="/favs" className="btn-fav">
              My Favs
            </Link>
          </nav>
        </header>
        <main className="main-content">{children}</main>
      </body>
    </html>
  )
}
