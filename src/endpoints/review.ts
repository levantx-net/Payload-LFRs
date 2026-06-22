import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'

export const createReviewEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const body = req.json ? await req.json() : req.body
      const { id, body: reviewBody, collection, media, score, title } = body || {}

      if (!collection || !id || !reviewBody || typeof score !== 'number') {
        throw new APIError('Missing collection, id, body, or valid score', 400)
      }

      const collectionOptions = sanitized.collections[collection]
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      const enabledFeatures = getEnabledFeatures(collectionOptions)
      if (!enabledFeatures.has('reviews')) {
        throw new APIError('Reviews are not enabled for this collection', 404)
      }

      let targetDoc: any
      try {
        targetDoc = await req.payload.findByID({
          id,
          collection,
          overrideAccess: true,
          req,
        })
      } catch (e) {
        throw new APIError('Target document not found', 404)
      }

      const accessResult = await resolveFeatureAccess({
        access: collectionOptions.reviews,
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

      // Check if review exists
      const existingReviews = await req.payload.find({
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

      const dataToSave: any = {
        body: reviewBody,
        score,
        title,
      }

      if (sanitized.mediaEnabled && Array.isArray(media)) {
        dataToSave.media = media.map((fileId) => ({ file: fileId }))
      }

      if (sanitized.reviewModeration) {
        dataToSave.status = 'pending'
      }

      let reviewDoc: any

      if (existingReviews.docs.length > 0) {
        // Update existing review
        reviewDoc = await req.payload.update({
          id: existingReviews.docs[0].id as string,
          collection: sanitized.collectionSlugs.reviews,
          data: dataToSave,
          overrideAccess: true,
          req,
        })
      } else {
        // Create new review
        dataToSave.user = userId
        dataToSave.targetCollection = collection
        dataToSave.targetDoc = id
        
        reviewDoc = await req.payload.create({
          collection: sanitized.collectionSlugs.reviews,
          data: dataToSave,
          overrideAccess: true,
          req,
        })
      }

      // Re-fetch target doc to get updated counts
      const updatedDoc = await req.payload.findByID({
        id,
        collection,
        overrideAccess: true,
        req,
      })

      return Response.json({
        review: reviewDoc,
        reviewsCount: updatedDoc.lfrs?.reviewsCount || 0,
      })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
