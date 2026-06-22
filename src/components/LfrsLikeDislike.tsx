'use client'

import React, { useState } from 'react'

import styles from './styles/lfrs.module.css'

export interface LfrsLikeDislikeProps {
  apiBase?: string
  className?: string
  dislikesEnabled?: boolean
  initialDisliked?: boolean
  initialDislikesCount?: number
  initialLiked?: boolean
  initialLikesCount?: number
  onToggle?: (state: { disliked: boolean; dislikesCount: number; liked: boolean; likesCount: number }) => void
  targetCollection: string
  targetDoc: string
}

const ThumbsUpIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
)

const ThumbsDownIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3" />
  </svg>
)

export const LfrsLikeDislike: React.FC<LfrsLikeDislikeProps> = ({
  apiBase = '/api',
  className = '',
  dislikesEnabled = false,
  initialDisliked = false,
  initialDislikesCount = 0,
  initialLiked = false,
  initialLikesCount = 0,
  onToggle,
  targetCollection,
  targetDoc,
}) => {
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(initialLiked)
  const [disliked, setDisliked] = useState(initialDisliked)
  const [likesCount, setLikesCount] = useState(initialLikesCount)
  const [dislikesCount, setDislikesCount] = useState(initialDislikesCount)

  const handleToggle = async (type: 'dislike' | 'like') => {
    if (loading) {return}
    
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
      
      if (!res.ok) {throw new Error('API Error')}
      
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
        likesCount: data.likesCount ?? 0 
      })
      
    } catch (e) {
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
    <div className={`${styles.likeDislikeGroup} ${className}`} style={{ display: 'flex', gap: '8px' }}>
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

      {dislikesEnabled && (
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
