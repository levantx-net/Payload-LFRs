import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Recalculates the `repliesCount` on the parent review document
 * after a reply is created, updated, or deleted.
 */
async function recalculateReplies(args: {
  config: SanitizedLfrsConfig
  req: Parameters<CollectionAfterChangeHook>[0]['req']
  reviewId: string
}): Promise<void> {
  const { config, req, reviewId } = args

  const result = await req.payload.count({
    collection: config.collectionSlugs.replies,
    req,
    where: {
      review: { equals: reviewId },
    },
  })

  await req.payload.update({
    id: reviewId,
    collection: config.collectionSlugs.reviews,
    context: { skipLfrsHooks: true },
    data: { repliesCount: result.totalDocs },
    req,
  })
}

/**
 * Creates an afterChange hook for the replies collection that
 * updates the parent review's repliesCount.
 */
export function createRepliesAfterChange(
  config: SanitizedLfrsConfig,
): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    // The review field may be a string ID or a populated object
    const reviewId =
      typeof doc.review === 'string' ? doc.review : (doc.review as Record<string, unknown>)?.id

    if (reviewId) {
      await recalculateReplies({ config, req, reviewId: reviewId as string })
    }

    return doc
  }
}

/**
 * Creates an afterDelete hook for the replies collection that
 * updates the parent review's repliesCount.
 */
export function createRepliesAfterDelete(
  config: SanitizedLfrsConfig,
): CollectionAfterDeleteHook {
  return async ({ doc, req }) => {
    const reviewId =
      typeof doc.review === 'string' ? doc.review : (doc.review as Record<string, unknown>)?.id

    if (reviewId) {
      await recalculateReplies({ config, req, reviewId: reviewId as string })
    }

    return doc
  }
}
