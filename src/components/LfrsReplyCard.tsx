'use client'

import React, { useState } from 'react'

import { LfrsLikeDislike } from './LfrsLikeDislike.js'

import styles from './styles/lfrs.module.css'
import { formatRelativeTime } from '../utilities/formatRelativeTime.js'

/**
 * Props for the `LfrsReplyCard` component.
 */
export interface LfrsReplyCardProps {
  /** Optional CSS class name to apply to the card container */
  className?: string
  /** The reply details object (contains `user` info, `createdAt` timestamp, and `body` text) */
  reply: any
  /** Optional inline styles to apply to the card container */
  style?: React.CSSProperties
  /** The currently logged-in user's ID, to determine ownership */
  currentUserId?: string
  /** Whether moderation is enabled */
  reviewModeration?: boolean
  /** Callback triggered when the edit button is clicked */
  onEdit?: (reply: any) => void
  /** Callback triggered when the delete button is clicked */
  onDelete?: (reply: any) => void
  /** Whether users can like/dislike reviews and replies */
  enableReviewReactions?: boolean
  /** The slug of the replies collection */
  repliesCollectionSlug?: string
  /** The base path of the REST API */
  apiBase?: string
  /** Callback triggered when the API returns a 401 Unauthorized status */
  onAuthError?: () => void
}

/**
 * `LfrsReplyCard` is a presentational card that displays a single reply to a review.
 * 
 * **Component Purpose:**
 * - Formats and renders a reply's metadata (author name or email, relative timestamp).
 * - Displays the text body of the reply.
 * 
 * **User Interaction:**
 * - This component is **read-only** and does not support user interactions.
 */
export const LfrsReplyCard: React.FC<LfrsReplyCardProps> = React.memo(
  ({ className = '', currentUserId, onDelete, onEdit, reply, style, reviewModeration = true, enableReviewReactions, repliesCollectionSlug, apiBase, onAuthError }) => {
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
    const authorName = reply.user?.name || reply.user?.email || 'Anonymous'
    const dateStr = formatRelativeTime(reply.createdAt)
    const replyUserId =
      typeof reply.user === 'object' && reply.user !== null
        ? reply.user.id
        : reply.user
    const isOwner = !!currentUserId && String(replyUserId ?? '') === String(currentUserId)
    const canEdit = isOwner && (!reviewModeration || reply.status !== 'approved')

    return (
      <div className={`${styles.replyCard} ${className}`} style={style}>
        <div className={styles.reviewHeader}>
          <div className={styles.reviewAuthor}>{authorName}</div>
          <div className={styles.reviewDate}>
            {dateStr}
            {reply.status && (
              <span className={`${styles.statusBadge} ${styles[`status_${reply.status}`]}`}>
                {reply.status}
              </span>
            )}
          </div>
        </div>
        <p className={styles.reviewBody}>{reply.body}</p>
        
        {(isOwner || enableReviewReactions) && (
          <div className={styles.reviewActions} style={{ marginTop: '8px' }}>
            {enableReviewReactions && repliesCollectionSlug && (
              <div style={{ display: 'inline-flex', marginRight: '16px' }}>
                <LfrsLikeDislike
                  apiBase={apiBase}
                  onAuthError={onAuthError}
                  targetCollection={repliesCollectionSlug}
                  targetDoc={reply.id}
                />
              </div>
            )}
            {isOwner && canEdit && onEdit && (
              <button
                className={styles.buttonText}
                onClick={() => onEdit(reply)}
                type="button"
              >
                Edit
              </button>
            )}
            {isOwner && onDelete && (
              <button
                className={styles.buttonText}
                onClick={() => setIsConfirmingDelete(true)}
                style={{ color: 'var(--lfrs-dislike-active)' }}
                type="button"
              >
                Delete
              </button>
            )}
          </div>
        )}

        {isConfirmingDelete && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalDialog}>
              <h3 className={styles.modalTitle}>Delete Reply</h3>
              <p className={styles.modalMessage}>Are you sure you want to delete this reply? This action cannot be undone.</p>
              <div className={styles.modalActions}>
                <button
                  className={`${styles.button} ${styles.modalCancelButton}`}
                  onClick={() => setIsConfirmingDelete(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={`${styles.button} ${styles.modalDeleteButton}`}
                  onClick={() => {
                    setIsConfirmingDelete(false)
                    onDelete?.(reply)
                  }}
                  type="button"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  },
)
