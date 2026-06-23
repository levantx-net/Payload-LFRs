'use client'

import React, { useEffect, useState } from 'react'

import styles from './styles/lfrs.module.css'

export interface LfrsFavouriteProps {
  apiBase?: string
  className?: string
  initialFavourited?: boolean
  onAuthError?: () => void
  onToggle?: (favourited: boolean) => void
  targetCollection: string
  targetDoc: string
}

const BookmarkIcon = ({ active }: { active?: boolean }) => (
  <svg fill={active ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

export const LfrsFavourite: React.FC<LfrsFavouriteProps> = ({
  apiBase = '/api',
  className = '',
  initialFavourited,
  onAuthError,
  onToggle,
  targetCollection,
  targetDoc,
}) => {
  const [loading, setLoading] = useState(false)
  const [favourited, setFavourited] = useState(initialFavourited ?? false)

  useEffect(() => {
    if (initialFavourited === undefined) {
      fetch(`${apiBase}/lfrs/status?collection=${targetCollection}&id=${targetDoc}`)
        .then((res) => {
          if (res.ok) {return res.json()}
          return null
        })
        .then((data) => {
          if (data && typeof data.favourited === 'boolean') {
            setFavourited(data.favourited)
          }
        })
        .catch(() => {})
    }
  }, [apiBase, initialFavourited, targetCollection, targetDoc])

  const handleToggle = async () => {
    if (loading) {return}
    
    // Optimistic update
    const previousState = favourited
    setFavourited(!favourited)
    
    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/lfrs/favourite`, {
        body: JSON.stringify({ id: targetDoc, collection: targetCollection }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      
      if (!res.ok) {
        if (res.status === 401 && onAuthError) {
          onAuthError()
        }
        throw new Error('API Error')
      }
      
      const data = await res.json()
      
      // Sync with real data
      setFavourited(data.favourited ?? false)
      onToggle?.(data.favourited ?? false)
      
    } catch (_e) {
      // Revert on error
      setFavourited(previousState)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`${styles.toggleButton} ${favourited ? styles.favouriteActive : ''} ${className}`}
      disabled={loading}
      onClick={handleToggle}
      title={favourited ? 'Remove from favourites' : 'Add to favourites'}
      type="button"
    >
      <BookmarkIcon active={favourited} />
      <span>{favourited ? 'Favourited' : 'Favourite'}</span>
    </button>
  )
}
