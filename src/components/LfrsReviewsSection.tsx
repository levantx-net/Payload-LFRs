'use client'

import React, { useCallback, useEffect, useState } from 'react'

import { LfrsComposeReview } from './LfrsComposeReview.js'
import { LfrsReviewCard } from './LfrsReviewCard.js'
import styles from './styles/lfrs.module.css'

/**
 * Props for the `LfrsReviewsSection` component.
 */
export interface LfrsReviewsSectionProps {
  /** The base path of the REST API (defaults to '/api') */
  apiBase?: string
  /** Optional CSS class name to apply to the section container */
  className?: string
  /** Callback triggered when the API returns a 401 Unauthorized status */
  onAuthError?: () => void
  /** Optional inline styles to apply to the section container */
  style?: React.CSSProperties
  /** The slug of the Payload CMS collection containing the reviewed item */
  targetCollection: string
  /** The unique ID of the target document */
  targetDoc: string
}

/**
 * `LfrsReviewsSection` is the primary orchestrator for displaying, writing, and listing reviews for an item.
 *
 * **Component Purpose:**
 * - Fetches user interaction status and existing reviews from the backend.
 * - Separates and highlights the current user's review as "Your Review" with editing options.
 * - Coordinates toggling the `LfrsComposeReview` form for creating/editing reviews.
 * - Handles paginated review list fetching with a "Load More" action.
 * - Dispatches a window-level custom `lfrs-review-added` event when a review is submitted.
 *
 * **User Interaction:**
 * - **Writing/Editing:** Clicking "Write a Review" or "Edit Review" opens the creation/edit form.
 * - **Pagination:** Clicking "Load More" appends the next page of reviews to the list.
 * - **Card Interactions:** Supports opening replies on nested review cards.
 */
export const LfrsReviewsSection: React.FC<LfrsReviewsSectionProps> = ({
  apiBase = '/api',
  className = '',
  onAuthError,
  style,
  targetCollection,
  targetDoc,
}) => {
  const [statusLoading, setStatusLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)

  const [status, setStatus] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [composeMode, setComposeMode] = useState<'create' | 'edit' | null>(null)
  const [editingReview, setEditingReview] = useState<any>(null)
  const showCompose = composeMode !== null

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiBase}/lfrs/status?collection=${targetCollection}&id=${targetDoc}`,
      )
      if (res.ok) {
        const data = await res.json()
        setStatus(data)
      }
    } catch (_) {
      // Ignore
    } finally {
      setStatusLoading(false)
    }
  }, [apiBase, targetCollection, targetDoc])

  const fetchReviews = useCallback(
    async (p = 1) => {
      try {
        setReviewsLoading(true)
        const res = await fetch(
          `${apiBase}/lfrs/interactions?collection=${targetCollection}&id=${targetDoc}&type=reviews&page=${p}&limit=10`,
        )
        if (res.ok) {
          const data = await res.json()
          if (p === 1) {
            setReviews(data.docs)
          } else {
            setReviews((prev) => [...prev, ...data.docs])
          }
          setTotalPages(data.totalPages)
          setPage(data.page)
        }
      } catch (_e) {
        // Ignore
      } finally {
        setReviewsLoading(false)
      }
    },
    [apiBase, targetCollection, targetDoc],
  )

  useEffect(() => {
    void fetchStatus()
    void fetchReviews(1)
  }, [fetchStatus, fetchReviews])

  const handleReviewSuccess = useCallback(() => {
    setComposeMode(null)
    void fetchStatus()
    void fetchReviews(1)
    // Dispatch an event so other components (like LfrsRatingSummary) know to refetch
    window.dispatchEvent(new Event('lfrs-review-added'))
  }, [fetchStatus, fetchReviews])

  const handleCancelCompose = useCallback(() => setComposeMode(null), [])

  const handleReplySuccess = useCallback(async () => {
    await fetchReviews(page)
  }, [fetchReviews, page])

  const handleEditReview = useCallback((review: any) => {
    setEditingReview(review)
    setComposeMode('edit')
  }, [])
  const handleWriteReview = useCallback(() => setComposeMode('create'), [])

  const handleDeleteReview = useCallback(
    async (review: any) => {
      try {
        const res = await fetch(`${apiBase}/lfrs/review`, {
          body: JSON.stringify({ reviewId: review.id }),
          headers: { 'Content-Type': 'application/json' },
          method: 'DELETE',
        })
        if (!res.ok) {
          if (res.status === 401 && onAuthError) {
            onAuthError()
          }
          return
        }
        void fetchStatus()
        void fetchReviews(page)
        window.dispatchEvent(new Event('lfrs-review-added'))
      } catch (_) {
        // Ignore
      }
    },
    [apiBase, fetchStatus, fetchReviews, page, onAuthError],
  )

  const handleDeleteReply = useCallback(
    async (reply: any) => {
      try {
        const res = await fetch(`${apiBase}/lfrs/reply`, {
          body: JSON.stringify({ replyId: reply.id }),
          headers: { 'Content-Type': 'application/json' },
          method: 'DELETE',
        })
        if (!res.ok) {
          if (res.status === 401 && onAuthError) {
            onAuthError()
          }
          return
        }
        void fetchStatus()
        void fetchReviews(page)
      } catch (_) {
        // Ignore
      }
    },
    [apiBase, fetchStatus, fetchReviews, page, onAuthError],
  )

  if (statusLoading && reviewsLoading) {
    return (
      <div className={`${styles.reviewsSection} ${className}`} style={style}>
        Loading reviews...
      </div>
    )
  }

  const hasMyReview = !!status?.review

  if (status && status.reviewsEnabled === false) {
    return null
  }

  return (
    <div className={`${styles.reviewsSection} ${className}`} style={style}>
      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
        <h2>Reviews</h2>
        {(!hasMyReview || status?.allowMultipleReviews) && !showCompose && status && (
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleWriteReview}
            type="button"
          >
            Write a Review
          </button>
        )}
      </div>

      {hasMyReview && !showCompose && (
        <div style={{ marginBottom: '24px' }}>
          <h3>Your Review</h3>
          <LfrsReviewCard
            apiBase={apiBase}
            currentUserId={status.currentUserId}
            onDelete={handleDeleteReview}
            onDeleteReply={handleDeleteReply}
            onEdit={handleEditReview}
            onReplySuccess={handleReplySuccess}
            ratingConfig={status.ratingConfig}
            repliesEnabled={status.repliesEnabled}
            review={status.review}
          />
        </div>
      )}

      {showCompose && status && (
        <div style={{ marginBottom: '24px' }}>
          <LfrsComposeReview
            apiBase={apiBase}
            enableReviewRating={status.enableReviewRating}
            initialData={composeMode === 'edit' ? editingReview : undefined}
            mediaEnabled={status.mediaEnabled}
            onAuthError={onAuthError}
            onCancel={handleCancelCompose}
            onSuccess={handleReviewSuccess}
            ratingConfig={status.ratingConfig}
            targetCollection={targetCollection}
            targetDoc={targetDoc}
          />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reviews
          .filter((r) => r.id !== status?.review?.id) // exclude own review if it's already shown above
          .map((review) => (
            <LfrsReviewCard
              apiBase={apiBase}
              currentUserId={status?.currentUserId}
              key={review.id}
              onAuthError={onAuthError}
              onDelete={handleDeleteReview}
              onDeleteReply={handleDeleteReply}
              onEdit={handleEditReview}
              onReplySuccess={handleReplySuccess}
              ratingConfig={status?.ratingConfig || { icon: 'star', max: 5, step: 1 }}
              repliesEnabled={status?.repliesEnabled}
              review={review}
            />
          ))}

        {reviews.length === 0 && !hasMyReview && (
          <div style={{ color: 'var(--lfrs-text-muted)' }}>No reviews yet.</div>
        )}
      </div>

      {page < totalPages && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            disabled={reviewsLoading}
            onClick={() => fetchReviews(page + 1)}
            type="button"
          >
            {reviewsLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
