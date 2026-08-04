import { APIError, type PayloadHandler, type PayloadRequest, type Where } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import {
  getMergedCollectionSettings,
  getMergedGlobalSettings,
} from '../utilities/getMergedSettings.js'

export const createStatusEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const collection = req.query?.collection as string
      const id = req.query?.id as string

      if (!collection || !id) {
        throw new APIError('Missing collection or id query parameter', 400)
      }

      const collectionOptions = sanitized.collections[collection]
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      // Enforce read access to target document to prevent data leaks
      try {
        await req.payload.findByID({
          id,
          collection,
          req,
          depth: 0,
          overrideAccess: false,
        })
      } catch (_e) {
        throw new APIError('Target document not found or access denied', 404)
      }

      const userId = req.user?.id

      const [enabledFeatures, mergedCollectionSettings, mergedGlobalSettings, isAdmin] =
        await Promise.all([
          getEnabledFeatures(collectionOptions, collection, req),
          getMergedCollectionSettings(collectionOptions, collection, req),
          getMergedGlobalSettings(sanitized, req),
          sanitized.isAdmin({ req }),
        ])

      const likesEnabled = enabledFeatures.has('likes')
      const dislikesEnabled = enabledFeatures.has('dislikes')
      const favouritesEnabled = enabledFeatures.has('favourites')
      const ratingsEnabled = enabledFeatures.has('ratings')
      const repliesEnabled = enabledFeatures.has('replies') || isAdmin
      const reviewsEnabled = enabledFeatures.has('reviews')
      const sharesEnabled = enabledFeatures.has('shares')

      const targetWhere: Where = {
        and: [{ targetCollection: { equals: collection } }, { targetDoc: { equals: id } }],
      }

      const userTargetWhere: null | Where = userId
        ? {
            and: [
              { user: { equals: userId } },
              { targetCollection: { equals: collection } },
              { targetDoc: { equals: id } },
            ],
          }
        : null

      /**
       * Counts are computed LIVE from the interaction collections (the source of
       * truth) instead of being read from the cached `lfrs.*` aggregate fields on
       * the target document.
       *
       * The cached aggregates are only maintained by the toggle endpoints and the
       * recalculate hooks, and can drift out of sync — e.g. interactions created
       * outside the toggle endpoints (seed scripts, direct DB writes), a failed
       * aggregate update, or an admin-panel save of the target document clearing
       * the read-only `lfrs` group. That drift previously produced contradictory
       * responses such as `liked: true` alongside `likesCount: 0`.
       *
       * The cached aggregates are still written on every mutation (they power
       * list-view sorting/filtering), but this endpoint never trusts them.
       */
      const [
        likesResult,
        dislikesResult,
        sharesResult,
        userLike,
        userDislike,
        userFavourite,
        userReview,
      ] = await Promise.all([
        req.payload.count({
          collection: sanitized.collectionSlugs.likes,
          overrideAccess: true,
          req,
          where: targetWhere,
        }),
        sanitized.dislikesEnabled
          ? req.payload.count({
              collection: sanitized.collectionSlugs.dislikes,
              overrideAccess: true,
              req,
              where: targetWhere,
            })
          : Promise.resolve(null),
        sanitized.sharesEnabled
          ? req.payload.count({
              collection: sanitized.collectionSlugs.shares,
              overrideAccess: true,
              req,
              where: targetWhere,
            })
          : Promise.resolve(null),
        userTargetWhere && likesEnabled
          ? req.payload.find({
              collection: sanitized.collectionSlugs.likes,
              limit: 1,
              overrideAccess: true,
              req,
              where: userTargetWhere,
            })
          : Promise.resolve(null),
        userTargetWhere && dislikesEnabled
          ? req.payload.find({
              collection: sanitized.collectionSlugs.dislikes,
              limit: 1,
              overrideAccess: true,
              req,
              where: userTargetWhere,
            })
          : Promise.resolve(null),
        userTargetWhere && favouritesEnabled
          ? req.payload.find({
              collection: sanitized.collectionSlugs.favourites,
              limit: 1,
              overrideAccess: true,
              req,
              where: userTargetWhere,
            })
          : Promise.resolve(null),
        // Always fetch the user's own review/rating when authenticated, even if
        // reviews/ratings are currently toggled off — the UI still shows the
        // user their previous submission ("Your Review" section).
        userTargetWhere
          ? req.payload.find({
              collection: sanitized.collectionSlugs.reviews,
              overrideAccess: true,
              req,
              where: userTargetWhere,
            })
          : Promise.resolve(null),
      ])

      const likesCount = likesResult.totalDocs
      const dislikesCount = dislikesResult?.totalDocs ?? 0
      const sharesCount = sharesResult?.totalDocs ?? 0

      // Resolve the user's own review (and its replies)
      let review: any = null
      let rating: null | number = null

      const userReviewDoc = userReview?.docs?.[0] as any
      if (userReviewDoc) {
        review = userReviewDoc
        rating = typeof userReviewDoc.score === 'number' ? userReviewDoc.score : null

        if (repliesEnabled) {
          const replies = await req.payload.find({
            collection: sanitized.collectionSlugs.replies,
            limit: 100,
            overrideAccess: true,
            req,
            sort: 'createdAt',
            where: {
              and: [
                { review: { equals: userReviewDoc.id } },
                ...(sanitized.reviewModeration
                  ? req.user
                    ? [
                        {
                          or: [
                            { status: { equals: 'approved' } },
                            { user: { equals: req.user.id } },
                          ],
                        },
                      ]
                    : [{ status: { equals: 'approved' } }]
                  : []),
              ],
            },
          })
          review.replies = replies.docs
        } else {
          review.replies = []
        }
      }

      return Response.json({
        allowMultipleReviews: mergedCollectionSettings.allowMultipleReviews,
        currentUserId: userId,
        disliked: (userDislike?.docs?.length ?? 0) > 0,
        dislikesCount,
        dislikesEnabled,
        enableReviewReactions: mergedGlobalSettings.enableReviewReactions,
        favourited: (userFavourite?.docs?.length ?? 0) > 0,
        favouritesEnabled,
        liked: (userLike?.docs?.length ?? 0) > 0,
        likesCount,
        likesEnabled,
        mediaEnabled: mergedGlobalSettings.mediaEnabled,
        rating,
        ratingConfig: sanitized.rating,
        ratingsEnabled,
        repliesCollectionSlug: sanitized.collectionSlugs.replies,
        repliesEnabled,
        review,
        reviewModeration: mergedGlobalSettings.reviewModeration,
        reviewsCollectionSlug: sanitized.collectionSlugs.reviews,
        reviewsEnabled,
        sharesCount,
        sharesEnabled,
      })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
