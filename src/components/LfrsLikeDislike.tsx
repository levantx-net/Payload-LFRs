'use client'

import React, { useEffect, useState } from 'react'

import styles from './styles/lfrs.module.css'

/**
 * Props for the `LfrsLikeDislike` component.
 */
export interface LfrsLikeDislikeProps {
  /** The base path of the REST API (defaults to '/api') */
  apiBase?: string
  /** Optional CSS class name to apply to the container */
  className?: string
  /** Initial state for the disliked flag (defaults to undefined) */
  initialDisliked?: boolean
  /** Initial count of dislikes (defaults to undefined) */
  initialDislikesCount?: number
  /** Initial state for the liked flag (defaults to undefined) */
  initialLiked?: boolean
  /** Initial count of likes (defaults to undefined) */
  initialLikesCount?: number
  /** Callback triggered when the API returns a 401 Unauthorized status */
  onAuthError?: () => void
  /** Callback triggered when the like/dislike state changes */
  onToggle?: (state: {
    disliked: boolean
    dislikesCount: number
    liked: boolean
    likesCount: number
  }) => void
  /** Optional inline styles to apply to the container */
  style?: React.CSSProperties
  /** The slug of the Payload CMS collection containing the item being liked/disliked */
  targetCollection: string
  /** The unique ID of the target document */
  targetDoc: string
}

const ThumbsUpIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
)

const ThumbsDownIcon = () => (
  <svg
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
  </svg>
)

/**
 * `LfrsLikeDislike` is a component for liking or disliking items.
 *
 * **Component Purpose:**
 * - Manages and renders a dual-state (Like and Dislike) rating widget.
 * - Dynamically shows/hides likes or dislikes based on the server-provided configuration.
 * - Handles optimistic updates and syncs counts and states with the backend.
 *
 * **User Interaction:**
 * - **Liking:** Clicking the Like thumb button increments the count (or decrements if already liked). If disliked previously, it clears the dislike.
 * - **Disliking:** Clicking the Dislike thumb button toggles the dislike state, resetting the like state if active.
 * - **UI Response:** Updates immediately on click. If the API request (`/api/lfrs/like` or `/api/lfrs/dislike`) fails, it rolls back to the previous state.
 */
export const LfrsLikeDislike: React.FC<LfrsLikeDislikeProps> = ({
  apiBase = '/api',
  className = '',
  initialDisliked,
  initialDislikesCount,
  initialLiked,
  initialLikesCount,
  onAuthError,
  onToggle,
  style,
  targetCollection,
  targetDoc,
}) => {
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(initialLiked ?? false)
  const [disliked, setDisliked] = useState(initialDisliked ?? false)
  const [likesCount, setLikesCount] = useState(initialLikesCount ?? 0)
  const [dislikesCount, setDislikesCount] = useState(initialDislikesCount ?? 0)

  const [likesEnabled, setLikesEnabled] = useState<boolean>(true)
  const [dislikesEnabledState, setDislikesEnabledState] = useState<boolean>(false)

  useEffect(() => {
    fetch(`${apiBase}/lfrs/status?collection=${targetCollection}&id=${targetDoc}`)
      .then((res) => {
        if (res.ok) {
          return res.json()
        }
        return null
      })
      .then((data) => {
        if (data) {
          if (initialLiked === undefined && typeof data.liked === 'boolean') {
            setLiked(data.liked)
          }
          if (initialDisliked === undefined && typeof data.disliked === 'boolean') {
            setDisliked(data.disliked)
          }
          if (typeof data.likesEnabled === 'boolean') {
            setLikesEnabled(data.likesEnabled)
          }
          if (typeof data.dislikesEnabled === 'boolean') {
            setDislikesEnabledState(data.dislikesEnabled)
          }
          if (initialLikesCount === undefined && typeof data.likesCount === 'number') {
            setLikesCount(data.likesCount)
          }
          if (initialDislikesCount === undefined && typeof data.dislikesCount === 'number') {
            setDislikesCount(data.dislikesCount)
          }
        }
      })
      .catch(() => {})
  }, [
    apiBase,
    initialLiked,
    initialDisliked,
    targetCollection,
    targetDoc,
    initialDislikesCount,
    initialLikesCount,
  ])

  const handleToggle = async (type: 'dislike' | 'like') => {
    if (loading) {
      return
    }

    // Optimistic update
    const previousState = { disliked, dislikesCount, liked, likesCount }

    let newLiked = liked
    let newDisliked = disliked
    let newLikesCount = likesCount
    let newDislikesCount = dislikesCount

    if (type === 'like') {
      newLiked = !liked
      newLikesCount += newLiked ? 1 : -1
      if (newLiked && disliked) {
        newDisliked = false
        newDislikesCount -= 1
      }
    } else {
      newDisliked = !disliked
      newDislikesCount += newDisliked ? 1 : -1
      if (newDisliked && liked) {
        newLiked = false
        newLikesCount -= 1
      }
    }

    setLiked(newLiked)
    setDisliked(newDisliked)
    setLikesCount(newLikesCount)
    setDislikesCount(newDislikesCount)

    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/lfrs/${type}`, {
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
      setLiked(data.liked ?? false)
      setDisliked(data.disliked ?? false)
      setLikesCount(data.likesCount ?? 0)
      if (data.dislikesCount !== undefined) {
        setDislikesCount(data.dislikesCount)
      }

      onToggle?.({
        disliked: data.disliked ?? false,
        dislikesCount: data.dislikesCount ?? 0,
        liked: data.liked ?? false,
        likesCount: data.likesCount ?? 0,
      })
    } catch (_e) {
      // Revert on error
      setLiked(previousState.liked)
      setDisliked(previousState.disliked)
      setLikesCount(previousState.likesCount)
      setDislikesCount(previousState.dislikesCount)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`${styles.likeDislikeGroup} ${className}`}
      style={{ display: 'inline-flex', gap: '8px', ...style }}
    >
      {likesEnabled && (
        <button
          aria-label={liked ? 'Unlike' : 'Like'}
          className={`${styles.toggleButton} ${liked ? styles.likeActive : ''}`}
          disabled={loading}
          onClick={() => handleToggle('like')}
          type="button"
        >
          <ThumbsUpIcon />
          <span>{likesCount}</span>
        </button>
      )}

      {dislikesEnabledState && (
        <button
          aria-label={disliked ? 'Remove dislike' : 'Dislike'}
          className={`${styles.toggleButton} ${disliked ? styles.dislikeActive : ''}`}
          disabled={loading}
          onClick={() => handleToggle('dislike')}
          type="button"
        >
          <ThumbsDownIcon />
          <span>{dislikesCount}</span>
        </button>
      )}
    </div>
  )
}
