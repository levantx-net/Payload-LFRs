import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  Where,
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

  const reviewsWhere: Where = { and: [{ targetCollection: { equals: targetCollection } }, { targetDoc: { equals: targetDoc } }] }
  if (config.reviewModeration) {
    if (Array.isArray(reviewsWhere.and)) {
      reviewsWhere.and.push({ status: { equals: 'approved' } })
    }
  }

  // Execute queries concurrently for better performance
  const [
    likesResult,
    dislikesResult,
    favouritesResult,
    ratingsResult,
    reviewsResult,
  ] = await Promise.all([
    req.payload.find({ collection: config.collectionSlugs.likes, overrideAccess: true, req, where: baseWhere, limit: 1, depth: 0 }),
    config.dislikesEnabled ? req.payload.find({ collection: config.collectionSlugs.dislikes, overrideAccess: true, req, where: baseWhere, limit: 1, depth: 0 }) : Promise.resolve(null),
    req.payload.find({ collection: config.collectionSlugs.favourites, overrideAccess: true, req, where: baseWhere, limit: 1, depth: 0 }),
    req.payload.find({ collection: config.collectionSlugs.ratings, overrideAccess: true, depth: 0, limit: 0, req, where: baseWhere }),
    req.payload.find({ collection: config.collectionSlugs.reviews, overrideAccess: true, depth: 0, limit: 0, req, where: reviewsWhere }),
  ])

  lfrs.likesCount = likesResult.totalDocs
  if (dislikesResult) {
    lfrs.dislikesCount = dislikesResult.totalDocs
  }
  lfrs.favouritesCount = favouritesResult.totalDocs

  
  // Collect scores from both
  let totalScore = 0
  let scoreCount = 0
  
  for (const doc of ratingsResult.docs) {
    if (typeof doc.score === 'number') {
      totalScore += doc.score
      scoreCount++
    }
  }
  
  for (const doc of reviewsResult.docs) {
    if (typeof doc.score === 'number') {
      totalScore += doc.score
      scoreCount++
    }
  }

  lfrs.ratingsCount = scoreCount

  if (scoreCount > 0) {
    lfrs.ratingsAverage = Math.round((totalScore / scoreCount) * 100) / 100
  } else {
    lfrs.ratingsAverage = 0
  }

  // Count reviews (only approved ones if moderation enabled)
  lfrs.reviewsCount = reviewsResult.totalDocs

  // Update the target document with the new aggregate values
  await req.payload.update({
    id: targetDoc,
    collection: targetCollection,
    context: { skipLfrsHooks: true },
    data: { lfrs },
    overrideAccess: true,
    req,
  })

  // Reset the flag immediately. Payload merges the context parameter into
  // req.context, which is shared across all operations in this request.
  // Without this cleanup, subsequent hooks (e.g. the afterChange from creating
  // a dislike after deleting a like) would see skipLfrsHooks=true and skip
  // their recalculation, leaving the target doc with stale counts.
  context.skipLfrsHooks = false
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
