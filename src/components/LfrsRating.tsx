'use client'

import React from 'react'
import { Rating } from 'react-rating'

import styles from './styles/lfrs.module.css'

export interface LfrsRatingProps {
  /** Optional class name to override styles */
  className?: string
  /** The icon hint from config (e.g. 'star', 'heart') - used for future theming */
  icon?: string
  /** The maximum rating value (default: 5) */
  max?: number
  /** Callback when rating changes (only fired if not readonly) */
  onChange?: (value: number) => void
  /** Whether the rating is interactive or read-only */
  readonly?: boolean
  /** The step increment (default: 1) */
  step?: number
  /** The current numeric rating value */
  value?: number
}

const StarIcon = ({ active }: { active?: boolean }) => (
  <svg
    className={`${styles.ratingIcon} ${active ? styles.active : ''}`}
    viewBox="0 0 24 24"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
)

const HeartIcon = ({ active }: { active?: boolean }) => (
  <svg
    className={`${styles.ratingIcon} ${active ? styles.active : ''}`}
    viewBox="0 0 24 24"
  >
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
)

/**
 * Interactive star/icon rating component.
 * Supports half-stars, read-only mode, and custom icons.
 */
export const LfrsRating: React.FC<LfrsRatingProps> = ({
  className = '',
  icon = 'star',
  max = 5,
  onChange,
  readonly = false,
  step = 1,
  value = 0,
}) => {
  // Determine number of segments for react-rating
  // e.g. max 5, step 0.5 -> 10 fractions
  const fractions = step < 1 ? Math.round(1 / step) : 1

  const renderIcon = (active: boolean) => {
    switch (icon) {
      case 'heart':
        return <HeartIcon active={active} />
      case 'star':
      default:
        return <StarIcon active={active} />
    }
  }

  return (
    <div className={`${styles.rating} ${readonly ? styles.ratingReadonly : ''} ${className}`}>
      {/* react-rating takes initialRating, readonly, fractions, quiet (hover tracking) */}
      <Rating
        emptySymbol={renderIcon(false)}
        fractions={fractions}
        fullSymbol={renderIcon(true)}
        initialRating={value}
        onChange={onChange}
        readonly={readonly}
        stop={max}
      />
    </div>
  )
}
