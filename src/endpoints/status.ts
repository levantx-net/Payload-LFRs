import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import {
  getMergedCollectionSettings,
  getMergedGlobalSettings,
} from '../utilities/getMergedSettings.js'
import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'

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

      const userId = req.user?.id

      let likesCount = 0
      let dislikesCount = 0
      let targetDoc: any
      try {
        targetDoc = await req.payload.findByID({
          id,
          collection,
          overrideAccess: true,
          req,
        })
        likesCount = targetDoc?.lfrs?.likesCount || 0
        dislikesCount = targetDoc?.lfrs?.dislikesCount || 0
      } catch (_) {
        // Ignore
      }

      const enabledFeatures = await getEnabledFeatures(collectionOptions, collection, req)
      const mergedCollectionSettings = await getMergedCollectionSettings(
        collectionOptions,
        collection,
        req,
      )
      const mergedGlobalSettings = await getMergedGlobalSettings(sanitized, req)

      const likesEnabled = enabledFeatures.has('likes')
      const dislikesEnabled = enabledFeatures.has('dislikes')
      const favouritesEnabled = enabledFeatures.has('favourites')
      const ratingsEnabled = enabledFeatures.has('ratings')
      const isAdmin = await sanitized.isAdmin({ req })
      const repliesEnabled = enabledFeatures.has('replies') || isAdmin
      const reviewsEnabled = enabledFeatures.has('reviews')
      const sharesEnabled = enabledFeatures.has('shares')

      const response: any = {
        allowMultipleReviews: mergedCollectionSettings.allowMultipleReviews,
        dislikesCount,
        dislikesEnabled,
        favouritesEnabled,
        likesCount,
        likesEnabled,
        mediaEnabled: mergedGlobalSettings.mediaEnabled,
        ratingConfig: sanitized.rating,
        ratingsEnabled,
        repliesEnabled,
        reviewModeration: mergedGlobalSettings.reviewModeration,
        reviewsEnabled,
        sharesEnabled,
        sharesCount: targetDoc?.lfrs?.sharesCount || 0,
        currentUserId: userId,
        enableReviewReactions: mergedGlobalSettings.enableReviewReactions,
        reviewsCollectionSlug: sanitized.collectionSlugs.reviews,
        repliesCollectionSlug: sanitized.collectionSlugs.replies,
      }

      if (!userId) {
        response.liked = false
        response.disliked = false
        response.favourited = false
        response.rating = null
        response.review = null
        return Response.json(response)
      }

      // Check if liked
      if (enabledFeatures.has('likes')) {
        const likes = await req.payload.find({
          collection: sanitized.collectionSlugs.likes,
          overrideAccess: true,
          req,
          where: {
            and: [
              { user: { equals: userId } },
              { targetCollection: { equals: collection } },
              { targetDoc: { equals: id } },
            ],
          },
        })
        response.liked = likes.docs.length > 0
      } else {
        response.liked = false
      }

      // Check if disliked
      if (enabledFeatures.has('dislikes')) {
        const dislikes = await req.payload.find({
          collection: sanitized.collectionSlugs.dislikes,
          overrideAccess: true,
          req,
          where: {
            and: [
              { user: { equals: userId } },
              { targetCollection: { equals: collection } },
              { targetDoc: { equals: id } },
            ],
          },
        })
        response.disliked = dislikes.docs.length > 0
      }

      // Check if favourited
      if (enabledFeatures.has('favourites')) {
        const favourites = await req.payload.find({
          collection: sanitized.collectionSlugs.favourites,
          overrideAccess: true,
          req,
          where: {
            and: [
              { user: { equals: userId } },
              { targetCollection: { equals: collection } },
              { targetDoc: { equals: id } },
            ],
          },
        })
        response.favourited = favourites.docs.length > 0
      } else {
        response.favourited = false
      }



      // Check review / rating
      // Always fetch the user's own review/rating, even if reviews/ratings are
      // currently disabled. This ensures the "Your Review" section in the UI
      // can still display existing reviews (e.g. after an admin re-enables
      // reviews, or to show the user their previous submission).
      if (enabledFeatures.has('reviews') || enabledFeatures.has('ratings') || userId) {
        const reviews = await req.payload.find({
          collection: sanitized.collectionSlugs.reviews,
          overrideAccess: true,
          req,
          where: {
            and: [
              { user: { equals: userId } },
              { targetCollection: { equals: collection } },
              { targetDoc: { equals: id } },
            ],
          },
        })
        if (reviews.docs.length > 0) {
          const review = reviews.docs[0]

          if (enabledFeatures.has('replies') || isAdmin) {
            const replies = await req.payload.find({
              collection: sanitized.collectionSlugs.replies,
              limit: 100,
              overrideAccess: true,
              req,
              sort: 'createdAt',
              where: {
                and: [
                  { review: { equals: review.id } },
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

          response.review = review
          response.rating = review.score !== undefined ? review.score : null
        } else {
          response.review = null
          response.rating = null
        }
      } else {
        response.review = null
        response.rating = null
      }

      return Response.json(response)
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
