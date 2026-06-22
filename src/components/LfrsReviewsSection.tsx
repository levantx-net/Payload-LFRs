'use client'

import React, { useCallback, useEffect, useState } from 'react'

import { LfrsComposeReview } from './LfrsComposeReview.js'
import { LfrsReviewCard } from './LfrsReviewCard.js'
import styles from './styles/lfrs.module.css'

export interface LfrsReviewsSectionProps {
  apiBase?: string
  className?: string
  targetCollection: string
  targetDoc: string
}

export const LfrsReviewsSection: React.FC<LfrsReviewsSectionProps> = ({
  apiBase = '/api',
  className = '',
  targetCollection,
  targetDoc,
}) => {
  const [statusLoading, setStatusLoading] = useState(true)
  const [reviewsLoading, setReviewsLoading] = useState(true)

  const [status, setStatus] = useState<any>(null)
  const [reviews, setReviews] = useState<any[]>([])

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [showCompose, setShowCompose] = useState(false)

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
      } catch (e) {
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

  const handleReviewSuccess = () => {
    setShowCompose(false)
    void fetchStatus()
    void fetchReviews(1)
  }

  if (statusLoading && reviewsLoading) {
    return <div className={`${styles.reviewsSection} ${className}`}>Loading reviews...</div>
  }

  const hasMyReview = !!status?.review

  return (
    <div className={`${styles.reviewsSection} ${className}`}>
      <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
        <h2>Reviews</h2>
        {!hasMyReview && !showCompose && status && (
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => setShowCompose(true)}
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
            onReplySuccess={() => fetchReviews(1)}
            ratingConfig={status.ratingConfig}
            repliesEnabled={status.repliesEnabled}
            review={status.review}
          />
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => setShowCompose(true)}
            style={{ marginTop: '12px' }}
            type="button"
          >
            Edit Review
          </button>
        </div>
      )}

      {showCompose && status && (
        <div style={{ marginBottom: '24px' }}>
          <LfrsComposeReview
            apiBase={apiBase}
            initialData={status.review}
            mediaEnabled={status.mediaEnabled}
            onCancel={() => setShowCompose(false)}
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
              key={review.id}
              onReplySuccess={() => fetchReviews(page)}
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
