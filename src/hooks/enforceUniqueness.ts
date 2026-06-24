import type { CollectionBeforeChangeHook } from 'payload'

import { APIError } from 'payload'

/**
 * Creates a beforeChange hook that enforces uniqueness per user + targetDoc + targetCollection.
 *
 * Used on likes, dislikes, favourites, and ratings collections where each user
 * can only have one interaction per document.
 *
 * @param interactionCollectionSlug - The slug of the interaction collection (e.g. 'lfrs-likes')
 */
export function createEnforceUniqueness(
  interactionCollectionSlug: string,
  skipFn?: (data: any) => boolean,
): CollectionBeforeChangeHook {
  return async ({ data, operation, req }) => {
    if (operation !== 'create') {
      return data
    }

    if (skipFn && skipFn(data)) {
      return data
    }

    const existing = await req.payload.find({
      collection: interactionCollectionSlug,
      depth: 0,
      limit: 1,
      req,
      where: {
        targetCollection: { equals: data.targetCollection },
        targetDoc: { equals: data.targetDoc },
        user: { equals: data.user ?? req.user?.id },
      },
    })

    if (existing.totalDocs > 0) {
      throw new APIError(
        `You have already interacted with this document in ${interactionCollectionSlug}`,
        400,
      )
    }

    return data
  }
}
