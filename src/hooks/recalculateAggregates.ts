import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Recalculates aggregate counts on the target document's `lfrs` group field.
 *
 * Counts all interactions (likes, dislikes, favourites, ratings, reviews)
 * for the given targetCollection + targetDoc, then updates the target doc.
 *
 * Uses `context.skipLfrsHooks` to prevent infinite loops when updating.
 */
async function recalculate(args: {
  config: SanitizedLfrsConfig
  context: Record<string, unknown>
  req: Parameters<CollectionAfterChangeHook>[0]['req']
  targetCollection: string
  targetDoc: string
}): Promise<void> {
  const { config, context, req, targetCollection, targetDoc } = args

  // Skip if we're already inside a recalculation (prevents infinite loop)
  if (context.skipLfrsHooks) {
    return
  }

  const collectionOptions = config.collections[targetCollection]
  if (!collectionOptions) {
    return
  }

  const lfrs: Record<string, number> = {}

  const baseWhere = {
    targetCollection: { equals: targetCollection },
    targetDoc: { equals: targetDoc },
  }

  // Count likes
  const likesResult = await req.payload.count({
    collection: config.collectionSlugs.likes,
    req,
    where: baseWhere,
  })
  lfrs.likesCount = likesResult.totalDocs

  // Count dislikes (only if dislikes are enabled globally)
  if (config.dislikesEnabled) {
    const dislikesResult = await req.payload.count({
      collection: config.collectionSlugs.dislikes,
      req,
      where: baseWhere,
    })
    lfrs.dislikesCount = dislikesResult.totalDocs
  }

  // Count favourites
  const favouritesResult = await req.payload.count({
    collection: config.collectionSlugs.favourites,
    req,
    where: baseWhere,
  })
  lfrs.favouritesCount = favouritesResult.totalDocs

  // Count and average ratings
  const ratingsResult = await req.payload.find({
    collection: config.collectionSlugs.ratings,
    depth: 0,
    limit: 0,
    req,
    where: baseWhere,
  })
  lfrs.ratingsCount = ratingsResult.totalDocs

  if (ratingsResult.totalDocs > 0) {
    const totalScore = ratingsResult.docs.reduce(
      (sum: number, doc: Record<string, unknown>) => sum + (doc.score as number),
      0,
    )
    lfrs.ratingsAverage = Math.round((totalScore / ratingsResult.totalDocs) * 100) / 100
  } else {
    lfrs.ratingsAverage = 0
  }

  // Count reviews
  const reviewsResult = await req.payload.count({
    collection: config.collectionSlugs.reviews,
    req,
    where: baseWhere,
  })
  lfrs.reviewsCount = reviewsResult.totalDocs

  // Update the target document with the new aggregate values
  await req.payload.update({
    id: targetDoc,
    collection: targetCollection,
    context: { skipLfrsHooks: true },
    data: { lfrs },
    req,
  })
}

/**
 * Creates an afterChange hook for interaction collections that
 * recalculates the aggregate counts on the target document.
 */
export function createRecalculateAfterChange(
  config: SanitizedLfrsConfig,
): CollectionAfterChangeHook {
  return async ({ context, doc, req }) => {
    const targetCollection = doc.targetCollection as string
    const targetDoc = doc.targetDoc as string

    if (targetCollection && targetDoc) {
      await recalculate({
        config,
        context: context as Record<string, unknown>,
        req,
        targetCollection,
        targetDoc,
      })
    }

    return doc
  }
}

/**
 * Creates an afterDelete hook for interaction collections that
 * recalculates the aggregate counts on the target document.
 */
export function createRecalculateAfterDelete(
  config: SanitizedLfrsConfig,
): CollectionAfterDeleteHook {
  return async ({ context, doc, req }) => {
    const targetCollection = doc.targetCollection as string
    const targetDoc = doc.targetDoc as string

    if (targetCollection && targetDoc) {
      await recalculate({
        config,
        context: context as Record<string, unknown>,
        req,
        targetCollection,
        targetDoc,
      })
    }

    return doc
  }
}
