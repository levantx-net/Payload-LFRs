import type { CollectionBeforeChangeHook } from 'payload'

import { APIError } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Creates a beforeChange hook that validates the target document exists
 * and that the targetCollection is an enabled LFRs collection.
 *
 * Runs on create and update for all interaction collections.
 */
export function createValidateTarget(config: SanitizedLfrsConfig): CollectionBeforeChangeHook {
  const enabledCollections = new Set(Object.keys(config.collections))

  return async ({ data, req }) => {
    const { targetCollection, targetDoc } = data

    // Validate targetCollection is an enabled LFRs collection
    if (!targetCollection || !enabledCollections.has(targetCollection)) {
      throw new APIError(
        `Invalid target collection "${targetCollection}". ` +
          `Must be one of: ${[...enabledCollections].join(', ')}`,
        400,
      )
    }

    // Validate targetDoc exists
    if (!targetDoc) {
      throw new APIError('targetDoc is required', 400)
    }

    try {
      await req.payload.findByID({
        id: targetDoc,
        collection: targetCollection,
        depth: 0,
        req,
      })
    } catch {
      throw new APIError(
        `Target document "${targetDoc}" not found in collection "${targetCollection}"`,
        404,
      )
    }

    return data
  }
}
