declare module 'react-rating' {
  import type React from 'react'

  export interface RatingProps {
    className?: string
    direction?: 'ltr' | 'rtl'
    emptySymbol?: React.ReactNode | string
    fractions?: number
    fullSymbol?: React.ReactNode | string
    id?: string
    initialRating?: number
    onChange?: (value: number) => void
    onHover?: (value: number) => void
    placeholderRating?: number
    placeholderSymbol?: React.ReactNode | string
    quiet?: boolean
    readonly?: boolean
    start?: number
    step?: number
    stop?: number
    style?: React.CSSProperties
  }

  export const Rating: React.ComponentType<RatingProps>
  export default Rating
}
