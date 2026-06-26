import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'

export const createRateEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const body = req.json ? await req.json() : req.body
      const { id, collection, score } = body || {}

      if (!collection || !id || typeof score !== 'number') {
        throw new APIError('Missing collection, id, or valid score', 400)
      }

      const collectionOptions = sanitized.collections[collection]
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      const enabledFeatures = await getEnabledFeatures(collectionOptions, collection, req)
      if (!enabledFeatures.has('ratings')) {
        throw new APIError('Ratings are not enabled for this collection', 404)
      }

      let targetDoc: any
      try {
        targetDoc = await req.payload.findByID({
          id,
          collection,
          overrideAccess: true,
          req,
        })
      } catch (_e) {
        throw new APIError('Target document not found', 404)
      }

      const accessResult = await resolveFeatureAccess({
        access: collectionOptions.ratings,
        req,
        targetCollection: collection,
        targetDoc,
      })

      if (!accessResult.allowed) {
        throw new APIError(accessResult.reason || 'Forbidden', 403)
      }

      const userId = req.user?.id
      if (!userId) {
        throw new APIError('Authentication required', 401)
      }

      // Check if rating exists
      const existingRatings = await req.payload.find({
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

      let ratingDoc: any

      if (existingRatings.docs.length > 0) {
        // Update existing rating
        ratingDoc = await req.payload.update({
          id: existingRatings.docs[0].id as string,
          collection: sanitized.collectionSlugs.ratings,
          data: { score },
          overrideAccess: true,
          req,
        })
        if (sanitized.callbacks?.onRatingUpdated) {
          await sanitized.callbacks.onRatingUpdated({ req, rating: ratingDoc })
        }
      } else {
        // Create new rating
        ratingDoc = await req.payload.create({
          collection: sanitized.collectionSlugs.ratings,
          data: {
            score,
            targetCollection: collection,
            targetDoc: id,
            user: userId,
          },
          overrideAccess: true,
          req,
        })
        if (sanitized.callbacks?.onRatingSubmitted) {
          await sanitized.callbacks.onRatingSubmitted({ req, rating: ratingDoc })
        }
      }

      // Re-fetch target doc to get updated counts
      const updatedDoc = await req.payload.findByID({
        id,
        collection,
        overrideAccess: true,
        req,
      })

      return Response.json({
        rating: ratingDoc,
        ratingConfig: sanitized.rating,
        ratingsAverage: updatedDoc.lfrs?.ratingsAverage || 0,
        ratingsCount: updatedDoc.lfrs?.ratingsCount || 0,
      })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
