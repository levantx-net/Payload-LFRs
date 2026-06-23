import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'

export const createInteractionsEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const collection = req.query?.collection as string
      const id = req.query?.id as string
      const type = (req.query?.type as string) || 'reviews'
      const page = parseInt((req.query?.page as string) || '1', 10)
      const limit = parseInt((req.query?.limit as string) || '10', 10)
      const sortParam = (req.query?.sort as string) || 'newest'

      if (!collection || !id) {
        throw new APIError('Missing collection or id query parameter', 400)
      }

      const collectionOptions = sanitized.collections[collection]
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      const enabledFeatures = getEnabledFeatures(collectionOptions)

      let sort = '-createdAt'
      if (sortParam === 'oldest') {sort = 'createdAt'}
      else if (sortParam === 'highest') {sort = '-score'}
      else if (sortParam === 'lowest') {sort = 'score'}

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {
        and: [
          { targetCollection: { equals: collection } },
          { targetDoc: { equals: id } },
        ],
      }

      if (type === 'reviews') {
        if (!enabledFeatures.has('reviews')) {
          throw new APIError('Reviews are not enabled for this collection', 404)
        }

        if (sanitized.reviewModeration) {
          where.and.push({ status: { equals: 'approved' } })
        }

        const reviews = await req.payload.find({
          collection: sanitized.collectionSlugs.reviews,
          limit,
          overrideAccess: true, // Typically public or custom access
          page,
          req,
          sort,
          where,
        })

        // Fetch replies if replies are enabled
        if (enabledFeatures.has('replies')) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const review of reviews.docs as any[]) {
            const replies = await req.payload.find({
              collection: sanitized.collectionSlugs.replies,
              limit: 100, // Reasonable limit for replies
              overrideAccess: true,
              req,
              sort: 'createdAt', // Oldest first for replies usually
              where: {
                and: [
                  { review: { equals: review.id } },
                  ...(sanitized.reviewModeration ? [{ status: { equals: 'approved' } }] : []),
                ],
              },
            })
            review.replies = replies.docs
          }
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const review of reviews.docs as any[]) {
            review.replies = []
          }
        }

        return Response.json({
          docs: reviews.docs,
          page: reviews.page,
          totalDocs: reviews.totalDocs,
          totalPages: reviews.totalPages,
        })
      } else if (type === 'ratings') {
        if (!enabledFeatures.has('ratings')) {
          throw new APIError('Ratings are not enabled for this collection', 404)
        }

        const ratings = await req.payload.find({
          collection: sanitized.collectionSlugs.ratings,
          limit,
          overrideAccess: true,
          page,
          req,
          sort,
          where,
        })

        return Response.json({
          docs: ratings.docs,
          page: ratings.page,
          totalDocs: ratings.totalDocs,
          totalPages: ratings.totalPages,
        })
      }

      throw new APIError('Invalid type parameter. Must be "reviews" or "ratings"', 400)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
