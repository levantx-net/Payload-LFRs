import type React from 'react'

/**
 * Standardized styling properties for all LFRs UI components.
 * This provides a unified and consistent method for developers to override styles,
 * both for the root element (via className/style) and nested elements (via classNames/styles).
 *
 * @template TClasses - A union of string literals representing the names of nestable inner elements.
 */
export interface LfrsStyleProps<TClasses extends string = string> {
  /** Optional CSS class name for the root element of the component */
  className?: string
  /** Optional inline styles for the root element of the component */
  style?: React.CSSProperties
  /** Map of element names to CSS class names for nested elements */
  classNames?: Partial<Record<TClasses, string>>
  /** Map of element names to inline styles for nested elements */
  styles?: Partial<Record<TClasses, React.CSSProperties>>
}
