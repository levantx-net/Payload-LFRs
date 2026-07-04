'use client'

import React, { useEffect, useState } from 'react'

import { fetchStatus, invalidateStatus } from '../utilities/statusCache.js'
import styles from './styles/lfrs.module.css'

/**
 * Props for the `LfrsRating` component.
 */
export interface LfrsRatingProps {
  /**
   * The base path of the REST API (defaults to '/api').
   * Required when using the component in interactive/submit mode.
   */
  apiBase?: string
  /** Optional CSS class name to apply to the rating container */
  className?: string
  /** The type of icon to render ('star' | 'heart'; defaults to 'star') */
  icon?: string
  /** The maximum rating value / number of icons (defaults to 5) */
  max?: number
  /**
   * Callback triggered when a rating icon is clicked.
   * - In **controlled** mode (no `targetCollection`): called on every click so the parent can manage state.
   * - In **submit** mode (`targetCollection` + `targetDoc` provided): called after the API responds successfully with the confirmed score.
   */
  onChange?: (value: number) => void
  /** Callback triggered when the API returns a 401 Unauthorized status (submit mode only) */
  onAuthError?: () => void
  /** If true, interactions (hover and click) are disabled (defaults to false) */
  readonly?: boolean
  /** The configuration step value (defaults to 1) */
  step?: number
  /**
   * The slug of the Payload CMS collection for the target document.
   * When provided together with `targetDoc`, the component operates in **submit mode**:
   * clicking a star sends a POST to `${apiBase}/lfrs/review` automatically.
   */
  targetCollection?: string
  /**
   * The unique ID of the document to rate.
   * Required together with `targetCollection` to enable submit mode.
   */
  targetDoc?: string
  /** The current rating value (defaults to 0). In submit mode this is the initial value; the component manages its own state. */
  value?: number
}

const StarIcon = ({ active }: { active?: boolean }) => (
  <svg className={`${styles.ratingIcon} ${active ? styles.active : ''}`} viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const HeartIcon = ({ active }: { active?: boolean }) => (
  <svg className={`${styles.ratingIcon} ${active ? styles.active : ''}`} viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
)

/**
 * `LfrsRating` is a star or heart rating rendering component.
 *
 * **Modes:**
 *
 * 1. **Controlled / display mode** (no `targetCollection` or `targetDoc`):
 *    - Pure presentational. Renders icons for the current `value`.
 *    - When `readonly` is false, clicking fires the `onChange` callback so the parent manages state.
 *
 * 2. **Submit mode** (`targetCollection` + `targetDoc` provided):
 *    - On mount, fetches the user's existing rating via `/api/lfrs/status` (cached).
 *    - On click, immediately submits the new rating to `/api/lfrs/review` with optimistic UI.
 *    - Shows a small success/error message after submission.
 *    - Calls `onAuthError` on 401.
 *
 * **User Interaction:**
 * - **Hovering:** When `readonly` is false, hovering over icons highlights them up to that score.
 * - **Clicking:** Selects the rating. In submit mode this triggers an API call.
 * - **Read-only Mode:** Hover and click are both disabled.
 */
export const LfrsRating: React.FC<LfrsRatingProps> = ({
  apiBase = '/api',
  className = '',
  icon = 'star',
  max = 5,
  onChange,
  onAuthError,
  readonly = false,
  step: _step = 1,
  targetCollection,
  targetDoc,
  value: externalValue = 0,
}) => {
  const isSubmitMode = !!(targetCollection && targetDoc)

  // In submit mode we manage internal state; in controlled mode we rely on the parent.
  const [internalValue, setInternalValue] = useState(externalValue)
  const [hoverValue, setHoverValue] = useState<null | number>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<null | string>(null)

  const displayValue = isSubmitMode ? internalValue : externalValue

  // In submit mode: fetch the user's existing score on mount
  useEffect(() => {
    if (!isSubmitMode) {
      return
    }
    fetchStatus(apiBase, targetCollection, targetDoc)
      .then((data: any) => {
        if (data?.review?.score != null) {
          setInternalValue(data.review.score)
          setSubmitted(true)
        }
      })
      .catch(() => {})
  }, [apiBase, isSubmitMode, targetCollection, targetDoc])

  const handleClick = async (item: number) => {
    if (readonly || loading) {
      return
    }

    if (!isSubmitMode) {
      // Controlled mode — just fire onChange
      onChange?.(item)
      return
    }

    // Submit mode — optimistic update then POST
    const previous = internalValue
    setInternalValue(item)
    setError(null)

    try {
      setLoading(true)
      const res = await fetch(`${apiBase}/lfrs/review`, {
        body: JSON.stringify({
          id: targetDoc,
          collection: targetCollection,
          score: item,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!res.ok) {
        if (res.status === 401) {
          onAuthError?.()
          setInternalValue(previous)
          return
        }
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to submit rating')
      }

      const json = await res.json()
      const confirmedScore = json.score ?? item
      setInternalValue(confirmedScore)
      setSubmitted(true)
      invalidateStatus(apiBase, targetCollection, targetDoc)
      onChange?.(confirmedScore)
      // Notify other components (e.g. LfrsRatingSummary) to refetch
      window.dispatchEvent(new Event('lfrs-review-added'))
    } catch (err: any) {
      setInternalValue(previous)
      setError(err.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const renderIcon = (active: boolean) => {
    switch (icon) {
      case 'heart':
        return <HeartIcon active={active} />
      case 'star':
      default:
        return <StarIcon active={active} />
    }
  }

  const items = Array.from({ length: max }, (_, i) => i + 1)

  return (
    <div style={{ display: 'inline-block' }}>
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        className={`${styles.rating} ${readonly || loading ? styles.ratingReadonly : ''} ${className}`}
        onMouseLeave={() => !readonly && !loading && setHoverValue(null)}
        style={{ opacity: loading ? 0.6 : 1 }}
      >
        {items.map((item) => {
          const isActive = hoverValue !== null ? item <= hoverValue : item <= displayValue
          return (
            <button
              aria-label={`Rate ${item} out of ${max}`}
              disabled={loading}
              key={item}
              onClick={() => handleClick(item)}
              onMouseEnter={() => !readonly && !loading && setHoverValue(item)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: readonly || loading ? 'default' : 'pointer',
                display: 'flex',
                padding: 0,
              }}
              type="button"
            >
              {renderIcon(isActive)}
            </button>
          )
        })}
      </div>

      {isSubmitMode && (
        <div style={{ fontSize: '12px', marginTop: '4px', minHeight: '18px' }}>
          {error && <span style={{ color: 'var(--lfrs-dislike-active)' }}>{error}</span>}
          {!error && submitted && !loading && (
            <span style={{ color: 'var(--lfrs-like-active)' }}>
              {`Rating saved (${displayValue}/${max})`}
            </span>
          )}
          {loading && <span style={{ color: 'var(--lfrs-text-muted)' }}>Saving…</span>}
        </div>
      )}
    </div>
  )
}
