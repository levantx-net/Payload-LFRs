import type { CollectionAfterDeleteHook } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Creates an afterDelete hook for a specific target collection that cascade-deletes
 * all related LFRs interactions when a target document is deleted.
 *
 * Deletes: likes, dislikes, favourites, ratings, reviews (and their replies).
 * Uses `context.skipLfrsHooks` to prevent aggregate recalculation during cascade.
 *
 * @param config - Sanitized LFRs plugin config
 * @param targetCollectionSlug - The slug of the target collection this hook is attached to
 */
export function createCascadeDelete(
  config: SanitizedLfrsConfig,
  targetCollectionSlug: string,
): CollectionAfterDeleteHook {
  return async ({ context, doc, req }) => {
    // Skip if we're already inside a cascade (prevents double-deletion)
    if ((context as Record<string, unknown>).skipLfrsHooks) {
      return doc
    }

    const targetDoc = doc.id as string
    if (!targetDoc) {
      return doc
    }

    const deleteContext = { skipLfrsHooks: true }

    const baseWhere = {
      targetCollection: { equals: targetCollectionSlug },
      targetDoc: { equals: targetDoc },
    }

    // Delete likes
    await req.payload.delete({
      collection: config.collectionSlugs.likes,
      context: deleteContext,
      req,
      where: baseWhere,
    })

    // Delete dislikes (if enabled)
    if (config.dislikesEnabled) {
      await req.payload.delete({
        collection: config.collectionSlugs.dislikes,
        context: deleteContext,
        req,
        where: baseWhere,
      })
    }

    // Delete favourites
    await req.payload.delete({
      collection: config.collectionSlugs.favourites,
      context: deleteContext,
      req,
      where: baseWhere,
    })

    // Delete ratings
    await req.payload.delete({
      collection: config.collectionSlugs.ratings,
      context: deleteContext,
      req,
      where: baseWhere,
    })

    // Find reviews to delete (we need their IDs to cascade-delete replies)
    const reviews = await req.payload.find({
      collection: config.collectionSlugs.reviews,
      depth: 0,
      limit: 0,
      req,
      where: baseWhere,
    })

    // Delete replies for each review (if replies are enabled)
    if (config.repliesEnabled && reviews.docs.length > 0) {
      const reviewIds = reviews.docs.map((r: Record<string, unknown>) => r.id as string)
      await req.payload.delete({
        collection: config.collectionSlugs.replies,
        context: deleteContext,
        req,
        where: {
          review: { in: reviewIds },
        },
      })
    }

    // Delete reviews
    if (reviews.docs.length > 0) {
      await req.payload.delete({
        collection: config.collectionSlugs.reviews,
        context: deleteContext,
        req,
        where: baseWhere,
      })
    }

    return doc
  }
}
