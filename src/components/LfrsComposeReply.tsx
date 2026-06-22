'use client'

import React, { useState } from 'react'

import styles from './styles/lfrs.module.css'

export interface LfrsComposeReplyProps {
  apiBase?: string
  className?: string
  onCancel?: () => void
  onSuccess?: () => void
  reviewId: string
}

export const LfrsComposeReply: React.FC<LfrsComposeReplyProps> = ({
  apiBase = '/api',
  className = '',
  onCancel,
  onSuccess,
  reviewId,
}) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const [body, setBody] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim()) {
      setError('Please write a reply')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`${apiBase}/lfrs/reply`, {
        body: JSON.stringify({ body, reviewId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to submit reply')
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
      {error && <div style={{ color: 'var(--lfrs-dislike-active)', fontSize: '14px' }}>{error}</div>}

      <textarea
        aria-label="Reply body"
        className={styles.composeTextarea}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply..."
        required
        value={body}
      />

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
          disabled={loading || !body.trim()}
          type="submit"
        >
          {loading ? 'Submitting...' : 'Submit Reply'}
        </button>
      </div>
    </form>
  )
}
