import type { SanitizedCollectionOptions } from '../types.js'

import { isFeatureEnabled } from '../defaults.js'

export type LfrsFeatureKey = 'dislikes' | 'favourites' | 'likes' | 'ratings' | 'replies' | 'reviews'

/**
 * Resolves which features are enabled for a given collection.
 * Returns a set of enabled feature keys.
 */
export function getEnabledFeatures(options: SanitizedCollectionOptions): Set<LfrsFeatureKey> {
  const features = new Set<LfrsFeatureKey>()

  if (isFeatureEnabled(options.likes)) {features.add('likes')}
  if (isFeatureEnabled(options.dislikes)) {features.add('dislikes')}
  if (isFeatureEnabled(options.favourites)) {features.add('favourites')}
  if (isFeatureEnabled(options.ratings)) {features.add('ratings')}
  if (isFeatureEnabled(options.reviews)) {features.add('reviews')}
  if (isFeatureEnabled(options.replies)) {features.add('replies')}

  return features
}
