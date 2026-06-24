'use client'

import React from 'react'

import styles from './styles/lfrs.module.css'
import { formatRelativeTime } from '../utilities/formatRelativeTime.js'

export interface LfrsReplyCardProps {
  className?: string
  reply: any
}

export const LfrsReplyCard: React.FC<LfrsReplyCardProps> = React.memo(
  ({ className = '', reply }) => {
    const authorName = reply.user?.name || reply.user?.email || 'Anonymous'
    const dateStr = formatRelativeTime(reply.createdAt)

    return (
      <div className={`${styles.replyCard} ${className}`}>
        <div className={styles.reviewHeader}>
          <div className={styles.reviewAuthor}>{authorName}</div>
          <div className={styles.reviewDate}>{dateStr}</div>
        </div>
        <p className={styles.reviewBody}>{reply.body}</p>
      </div>
    )
  },
)
