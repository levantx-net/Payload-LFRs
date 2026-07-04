'use client'

import React, { useEffect, useState } from 'react'

import { LfrsRating } from './LfrsRating.js'
import styles from './styles/lfrs.module.css'

/**
 * Props for the `LfrsRatingSummary` component.
 */
export interface LfrsRatingSummaryProps {
  /** The base path of the REST API (defaults to '/api') */
  apiBase?: string
  /** Optional CSS class name to apply to the container */
  className?: string
  /** Optional inline styles to apply to the container */
  style?: React.CSSProperties
  /** The slug of the Payload CMS collection containing the reviewed item */
  targetCollection: string
  /** The unique ID of the target document */
  targetDoc: string
}

interface DistributionData {
  averageScore: number
  config: {
    icon: string
    max: number
    step: number
  }
  distribution: {
    count: number
    percentage: number
    score: number
  }[]
  totalRatings: number
}

/**
 * `LfrsRatingSummary` renders the average rating and breakdown of ratings for a specific item.
 * 
 * **Component Purpose:**
 * - Fetches rating breakdown stats from the `${apiBase}/lfrs/distribution` endpoint.
 * - Displays the average score alongside a read-only `LfrsRating` indicator.
 * - Renders a horizontal bar breakdown of rating percentages (e.g. 5-star, 4-star distribution).
 * - Listens for the custom `lfrs-review-added` window event to automatically refetch when reviews update.
 * 
 * **User Interaction:**
 * - This component is **read-only** and does not support direct user interactions.
 */
export const LfrsRatingSummary: React.FC<LfrsRatingSummaryProps> = ({
  apiBase = '/api',
  className = '',
  style,
  targetCollection,
  targetDoc,
}) => {
  const [data, setData] = useState<DistributionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<null | string>(null)

  useEffect(() => {
    const fetchDistribution = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${apiBase}/lfrs/distribution?collection=${targetCollection}&id=${targetDoc}`)
        if (res.status === 404) {
          setData(null)
          setError('Disabled')
          return
        }
        if (!res.ok) {throw new Error('Failed to fetch rating summary')}
        const json = await res.json()
        setData(json)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    void fetchDistribution()

    const handleReviewAdded = () => {
      void fetchDistribution()
    }
    
    window.addEventListener('lfrs-review-added', handleReviewAdded)
    return () => {
      window.removeEventListener('lfrs-review-added', handleReviewAdded)
    }
  }, [apiBase, targetCollection, targetDoc])

  if (loading) {return <div className={`${styles.summary} ${className}`}>Loading...</div>}
  if (error === 'Disabled') {return null}
  if (error || !data) {return <div className={`${styles.summary} ${className}`}>Error: {error}</div>}

  // Sort distribution descending by score
  const sortedDistribution = [...data.distribution].sort((a, b) => b.score - a.score)

  return (
    <div className={`${styles.summary} ${className}`} style={style}>
      <div className={styles.summaryHeader}>
        <div className={styles.summaryAverage}>{data.averageScore.toFixed(1)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <LfrsRating
            icon={data.config.icon}
            max={data.config.max}
            readonly
            step={data.config.step}
            value={data.averageScore}
          />
          <div className={styles.summaryCount}>
            {data.totalRatings} {data.totalRatings === 1 ? 'rating' : 'ratings'}
          </div>
        </div>
      </div>

      <div className={styles.summaryBars}>
        {sortedDistribution.map((row) => (
          <div className={styles.summaryBarRow} key={row.score}>
            <div className={styles.summaryBarLabel}>
              {row.score} {data.config.icon === 'star' ? '★' : ''}
            </div>
            <div className={styles.summaryBarTrack}>
              <div
                className={styles.summaryBarFill}
                style={{ width: `${row.percentage}%` }}
              />
            </div>
            <div className={styles.summaryBarPercent}>
              {Math.round(row.percentage)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
