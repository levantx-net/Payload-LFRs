'use client'

import React, { useEffect, useState } from 'react'

import { fetchStatus, invalidateStatus } from '../utilities/statusCache.js'
import styles from './styles/lfrs.module.css'

/**
 * Props for the `LfrsFavourite` component.
 */
export interface LfrsFavouriteProps {
  /** The base path of the REST API (defaults to '/api') */
  apiBase?: string
  /** Optional CSS class name to apply to the toggle button */
  className?: string
  /** The initial favourited state. If undefined, it will fetch from the server. */
  initialFavourited?: boolean
  /** Callback triggered when the API returns a 401 Unauthorized status */
  onAuthError?: () => void
  /** Callback triggered after a toggle operation completes on the server */
  onToggle?: (favourited: boolean) => void
  /** Optional inline styles to apply to the button */
  style?: React.CSSProperties
  /** The slug of the Payload CMS collection for the target document */
  targetCollection: string
  /** The unique ID of the target document */
  targetDoc: string
}

const BookmarkIcon = ({ active }: { active?: boolean }) => (
  <svg fill={active ? "currentColor" : "none"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

/**
 * `LfrsFavourite` is an interactive toggle button for bookmarking or favouriting items.
 * 
 * **Component Purpose:**
 * - Tracks and displays whether a document is added to the user's favourites.
 * - Auto-fetches current status if no initial value is provided.
 * - Handles API interactions to toggle the state.
 * 
 * **User Interaction:**
 * - **Toggling:** Clicking the button triggers an optimistic UI change and makes a POST request to `${apiBase}/lfrs/favourite`.
 * - **Error Handling:** If the API request fails, the component automatically reverts to its previous favourited state.
 */
export const LfrsFavourite: React.FC<LfrsFavouriteProps> = ({
  apiBase = '/api',
  className = '',
  initialFavourited,
  onAuthError,
  onToggle,
  style,
  targetCollection,
  targetDoc,
}) => {
  const [loading, setLoading] = useState(false)
  const [favourited, setFavourited] = useState(initialFavourited ?? false)
  const [favouritesEnabled, setFavouritesEnabled] = useState<boolean>(true)

  useEffect(() => {
    if (initialFavourited === undefined) {
      fetchStatus(apiBase, targetCollection, targetDoc)
        .then((data: any) => {
          if (data) {
            if (typeof data.favourited === 'boolean') {
              setFavourited(data.favourited)
            }
            if (typeof data.favouritesEnabled === 'boolean') {
              setFavouritesEnabled(data.favouritesEnabled)
            }
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
      
      // Invalidate the status cache so any re-fetch gets fresh data
      invalidateStatus(apiBase, targetCollection, targetDoc)

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

  if (!favouritesEnabled) {
    return null
  }

  return (
    <button
      className={`${styles.toggleButton} ${favourited ? styles.favouriteActive : ''} ${className}`}
      disabled={loading}
      onClick={handleToggle}
      style={style}
      title={favourited ? 'Remove from favourites' : 'Add to favourites'}
      type="button"
    >
      <BookmarkIcon active={favourited} />
      <span>{favourited ? 'Favourited' : 'Favourite'}</span>
    </button>
  )
}
