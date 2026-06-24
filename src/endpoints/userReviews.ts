import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'
import type { SanitizedLfrsConfig } from '../types.js'

export const createUserReviewsEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const collection = req.query?.collection as string
      const id = req.query?.id as string
      const userId = req.query?.userId as string

      if (!collection || !id || !userId) {
        throw new APIError('Missing collection, id, or userId query parameter', 400)
      }

      const collectionOptions = sanitized.collections[collection]
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      let targetDoc: any
      try {
        targetDoc = await req.payload.findByID({
          id,
          collection,
          overrideAccess: true,
          req,
        })
      } catch (err: any) {
        throw new APIError('Target document not found', 404)
      }

      const readAccess = await resolveFeatureAccess({
        access: collectionOptions.readReviews,
        req,
        targetCollection: collection,
        targetDoc,
      })

      if (!readAccess.allowed) {
        throw new APIError(readAccess.reason || 'Forbidden', 403)
      }

      const reviews = await req.payload.find({
        collection: sanitized.collectionSlugs.reviews,
        where: {
          and: [
            { targetCollection: { equals: collection } },
            { targetDoc: { equals: id } },
            { user: { equals: userId } },
          ],
        },
        overrideAccess: true,
        req,
      })

      return Response.json({ reviews: reviews.docs })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
