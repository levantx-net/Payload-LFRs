import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'

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
      try {
        const targetDoc = await req.payload.findByID({
          id,
          collection,
          overrideAccess: true,
          req,
        })
        likesCount = targetDoc?.lfrs?.likesCount || 0
        dislikesCount = targetDoc?.lfrs?.dislikesCount || 0
      } catch (e) {
        // Ignore
      }

      const enabledFeatures = getEnabledFeatures(collectionOptions)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response: any = {
        dislikesCount,
        dislikesEnabled: enabledFeatures.has('dislikes'),
        favouritesEnabled: enabledFeatures.has('favourites'),
        likesCount,
        likesEnabled: enabledFeatures.has('likes'),
        mediaEnabled: sanitized.mediaEnabled,
        ratingConfig: sanitized.rating,
        ratingsEnabled: enabledFeatures.has('ratings'),
        repliesEnabled: enabledFeatures.has('replies'),
        reviewsEnabled: enabledFeatures.has('reviews'),
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

      // Check rating
      if (enabledFeatures.has('ratings')) {
        const ratings = await req.payload.find({
          collection: sanitized.collectionSlugs.ratings,
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
        response.rating = ratings.docs.length > 0 ? ratings.docs[0].score : null
      } else {
        response.rating = null
      }

      // Check review
      if (enabledFeatures.has('reviews')) {
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
        response.review = reviews.docs.length > 0 ? reviews.docs[0] : null
      } else {
        response.review = null
      }

      return Response.json(response)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
