'use client'

import React, { useState } from 'react'

import { LfrsRating } from './LfrsRating.js'
import styles from './styles/lfrs.module.css'

export interface LfrsComposeReviewProps {
  apiBase?: string
  className?: string
  initialData?: {
    body?: string
    id?: string
    score?: number
    title?: string
  }
  mediaEnabled?: boolean
  onCancel?: () => void
  onSuccess?: () => void
  ratingConfig?: { icon: string; max: number; step: number }
  targetCollection: string
  targetDoc: string
}

export const LfrsComposeReview: React.FC<LfrsComposeReviewProps> = ({
  apiBase = '/api',
  className = '',
  initialData,
  mediaEnabled = false,
  onCancel,
  onSuccess,
  ratingConfig = { icon: 'star', max: 5, step: 1 },
  targetCollection,
  targetDoc,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)

  const [score, setScore] = useState(initialData?.score ?? 0)
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [body, setBody] = useState(initialData?.body ?? '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (score === 0) {
      setError('Please select a rating')
      return
    }
    if (!body.trim()) {
      setError('Please write a review')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${apiBase}/lfrs/review`, {
        body: JSON.stringify({
          id: targetDoc,
          body,
          collection: targetCollection,
          score,
          title,
          // media arrays would go here if we implemented the upload flow
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit review')
      }

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={`${styles.composeForm} ${className}`} onSubmit={handleSubmit}>
      <h3 style={{ margin: 0 }}>{initialData?.id ? 'Edit your review' : 'Write a review'}</h3>
      
      {error && <div style={{ color: 'var(--lfrs-dislike-active)', fontSize: '14px' }}>{error}</div>}

      <div style={{ alignItems: 'center', display: 'flex', gap: '8px' }}>
        <span>Rating:</span>
        <LfrsRating
          icon={ratingConfig.icon}
          max={ratingConfig.max}
          onChange={setScore}
          step={ratingConfig.step}
          value={score}
        />
      </div>

      <input
        aria-label="Review title"
        className={styles.composeInput}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Review title (optional)"
        type="text"
        value={title}
      />

      <textarea
        aria-label="Review body"
        className={styles.composeTextarea}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think?"
        required
        value={body}
      />

      {mediaEnabled && (
        <div style={{ color: 'var(--lfrs-text-muted)', fontSize: '12px' }}>
          (Media upload placeholder - requires integration with Payload upload endpoint)
        </div>
      )}

      <div className={styles.composeActions}>
        {onCancel && (
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            disabled={loading}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        )}
        <button
          className={`${styles.button} ${styles.buttonPrimary}`}
          disabled={loading || score === 0 || !body.trim()}
          type="submit"
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  )
}
