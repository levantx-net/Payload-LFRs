import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'

export const createReplyEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const body = req.json ? await req.json() : req.body
      const { body: replyBody, reviewId } = body || {}

      if (!reviewId || !replyBody) {
        throw new APIError('Missing reviewId or body', 400)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parentReview: any
      try {
        parentReview = await req.payload.findByID({
          id: reviewId,
          collection: sanitized.collectionSlugs.reviews,
          overrideAccess: true,
          req,
        })
      } catch (_e) {
        throw new APIError('Parent review not found', 404)
      }

      const collection = parentReview.targetCollection
      const collectionOptions = sanitized.collections[collection]
      
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      const enabledFeatures = getEnabledFeatures(collectionOptions)
      if (!enabledFeatures.has('replies')) {
        throw new APIError('Replies are not enabled for this collection', 404)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let targetDoc: any
      try {
        targetDoc = await req.payload.findByID({
          id: parentReview.targetDoc,
          collection,
          overrideAccess: true,
          req,
        })
      } catch (_e) {
        throw new APIError('Target document not found', 404)
      }

      const accessResult = await resolveFeatureAccess({
        access: collectionOptions.replies,
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataToSave: any = {
        body: replyBody,
        review: reviewId,
        user: userId,
      }

      if (sanitized.reviewModeration) {
        dataToSave.status = 'pending'
      }

      const replyDoc = await req.payload.create({
        collection: sanitized.collectionSlugs.replies,
        data: dataToSave,
        overrideAccess: true, // We did the access check manually
        req,
      })

      // Fetch the updated review to get the new repliesCount
      const updatedReview = await req.payload.findByID({
        id: reviewId,
        collection: sanitized.collectionSlugs.reviews,
        overrideAccess: true,
        req,
      })

      return Response.json({
        repliesCount: updatedReview.repliesCount || 0,
        reply: replyDoc,
      })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}

export const deleteReplyEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const body = req.json ? await req.json() : req.body
      const { replyId } = body || {}

      if (!replyId) {
        throw new APIError('Missing replyId', 400)
      }

      const userId = req.user?.id
      if (!userId) {
        throw new APIError('Authentication required', 401)
      }

      // Check access: own replies only, or admin
      // We can just rely on the collection's access control (which has delete: isOwnerOrAdmin)
      // by not overriding access.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let deletedReply: any
      try {
        deletedReply = await req.payload.delete({
          id: replyId,
          collection: sanitized.collectionSlugs.replies,
          overrideAccess: false,
          req, 
        })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        throw new APIError(err.message || 'Error deleting reply or forbidden', 403)
      }

      const reviewId = typeof deletedReply.review === 'object' && deletedReply.review !== null ? deletedReply.review.id : deletedReply.review;

      const updatedReview = await req.payload.findByID({
        id: reviewId as string,
        collection: sanitized.collectionSlugs.reviews,
        overrideAccess: true,
        req,
      })

      return Response.json({
        deleted: true,
        repliesCount: updatedReview.repliesCount || 0,
      })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
