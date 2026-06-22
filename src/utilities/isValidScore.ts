import type { SanitizedRatingConfig } from '../types.js'

/**
 * Validates that a score is within the valid range and is a clean multiple of the step.
 *
 * Valid scores:
 * - Must be >= step (minimum valid score; 0 = no rating, handled by deletion)
 * - Must be <= max
 * - Must be a clean multiple of step (with floating-point tolerance)
 *
 * @param score - The score to validate
 * @param config - The sanitized rating config
 * @returns `true` if the score is valid
 */
export function isValidScore(score: number, config: SanitizedRatingConfig): boolean {
  const { max, step } = config

  // Must be a finite number
  if (!Number.isFinite(score)) {
    return false
  }

  // Must be within range [step, max]
  if (score < step || score > max) {
    return false
  }

  // Must be a clean multiple of step (with floating-point tolerance)
  const remainder = score % step
  if (Math.abs(remainder) > 1e-9 && Math.abs(remainder - step) > 1e-9) {
    return false
  }

  return true
}

/**
 * Returns a human-readable description of valid score values for error messages.
 */
export function describeValidScores(config: SanitizedRatingConfig): string {
  const { max, step } = config
  if (step === 1) {
    return `whole numbers from ${step} to ${max}`
  }
  return `multiples of ${step} from ${step} to ${max}`
}
