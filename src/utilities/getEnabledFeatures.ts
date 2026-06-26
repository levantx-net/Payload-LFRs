import type { PayloadRequest } from 'payload'

import type { SanitizedCollectionOptions } from '../types.js'

import { isFeatureEnabled } from '../defaults.js'
import { getCachedLfrsSettings } from './lfrsSettingsCache.js'

export type LfrsFeatureKey = 'dislikes' | 'favourites' | 'likes' | 'ratings' | 'replies' | 'reviews'

/**
 * Resolves which features are enabled for a given collection by
 * intersecting the developer's static configuration with the admin's
 * runtime Global overrides.
 * Returns a set of enabled feature keys.
 */
export async function getEnabledFeatures(
  options: SanitizedCollectionOptions,
  collectionSlug: string,
  req: PayloadRequest,
): Promise<Set<LfrsFeatureKey>> {
  const features = new Set<LfrsFeatureKey>()

  const adminSettings = await getCachedLfrsSettings(req.payload, req)

  const checkFeature = (key: LfrsFeatureKey) => {
    if (isFeatureEnabled(options[key])) {
      const collectionAdminSettings = adminSettings?.[collectionSlug]
      // If the admin specifically toggled this off, do not add it
      if (collectionAdminSettings && collectionAdminSettings[key] === false) {
        return
      }
      features.add(key)
    }
  }

  checkFeature('likes')
  checkFeature('dislikes')
  checkFeature('favourites')
  checkFeature('ratings')
  checkFeature('reviews')
  checkFeature('replies')

  return features
}
