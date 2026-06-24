'use client'

import React, { useState } from 'react'

import { LfrsComposeReply } from './LfrsComposeReply.js'
import { LfrsRating } from './LfrsRating.js'
import { LfrsReplyCard } from './LfrsReplyCard.js'
import styles from './styles/lfrs.module.css'

export interface LfrsReviewCardProps {
  apiBase?: string
  className?: string
  onAuthError?: () => void
  onReplySuccess?: () => void
  ratingConfig: { icon: string; max: number; step: number }
  repliesEnabled?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  review: any
}

export const LfrsReviewCard: React.FC<LfrsReviewCardProps> = ({
  apiBase = '/api',
  className = '',
  onAuthError,
  onReplySuccess,
  ratingConfig,
  repliesEnabled = false,
  review,
}) => {
  const [isReplying, setIsReplying] = useState(false)

  const authorName = review.user?.name || review.user?.email || 'Anonymous'
  const dateStr = new Date(review.createdAt).toLocaleDateString()

  const handleReplySuccess = () => {
    setIsReplying(false)
    onReplySuccess?.()
  }

  return (
    <div className={`${styles.reviewCard} ${className}`}>
      <div className={styles.reviewHeader}>
        <div>
          <div className={styles.reviewAuthor}>{authorName}</div>
          {typeof review.score === 'number' && (
            <div style={{ marginTop: '4px' }}>
              <LfrsRating
                icon={ratingConfig.icon}
                max={ratingConfig.max}
                readonly
                step={ratingConfig.step}
                value={review.score}
              />
            </div>
          )}
        </div>
        <div className={styles.reviewDate}>{dateStr}</div>
      </div>

      {review.title && <h4 className={styles.reviewTitle}>{review.title}</h4>}
      <p className={styles.reviewBody}>{review.body}</p>

      {review.media && review.media.length > 0 && (
        <div className={styles.reviewMedia}>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {review.media.map((item: any, idx: number) => {
            if (!item.file?.url) {return null}
            return (
              <img
                alt="Review attachment"
                className={styles.reviewMediaItem}
                key={idx}
                src={item.file.url}
              />
            )
          })}
        </div>
      )}

      {repliesEnabled && (
        <div className={styles.reviewActions}>
          <button
            className={styles.buttonText}
            onClick={() => setIsReplying(!isReplying)}
            type="button"
          >
            Reply
          </button>
        </div>
      )}

      {isReplying && (
        <div style={{ marginTop: '16px' }}>
          <LfrsComposeReply
            apiBase={apiBase}
            onAuthError={onAuthError}
            onCancel={() => setIsReplying(false)}
            onSuccess={handleReplySuccess}
            reviewId={review.id}
          />
        </div>
      )}

      {review.replies && review.replies.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {review.replies.map((reply: any) => (
            <LfrsReplyCard key={reply.id} reply={reply} />
          ))}
        </div>
      )}
    </div>
  )
}
