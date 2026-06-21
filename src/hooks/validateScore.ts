import type { CollectionBeforeChangeHook } from 'payload'

import { APIError } from 'payload'

import type { SanitizedRatingConfig } from '../types.js'

import { describeValidScores, isValidScore } from '../utilities/isValidScore.js'

/**
 * Creates a beforeChange hook that validates the `score` field
 * against the rating config's range and step.
 *
 * Used on both `lfrs-ratings` and `lfrs-reviews` collections.
 */
export function createValidateScore(ratingConfig: SanitizedRatingConfig): CollectionBeforeChangeHook {
  return ({ data }) => {
    const { score } = data

    if (score === undefined || score === null) {
      // Score field is required at the collection level, so Payload
      // will catch this. We just skip our validation here.
      return data
    }

    if (!isValidScore(score as number, ratingConfig)) {
      throw new APIError(
        `Invalid score: ${score}. Must be ${describeValidScores(ratingConfig)}`,
        400,
      )
    }

    return data
  }
}
