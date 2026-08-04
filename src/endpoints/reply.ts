import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import { getMergedGlobalSettings } from '../utilities/getMergedSettings.js'
import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'

export const createReplyEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const body = req.json ? await req.json() : req.body
      const { body: replyBody, reviewId, replyId } = body || {}

      if (!reviewId || !replyBody) {
        throw new APIError('Missing reviewId or body', 400)
      }

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

      const enabledFeatures = await getEnabledFeatures(collectionOptions, collection, req)
      const isAdmin = await sanitized.isAdmin({ req })
      if (!enabledFeatures.has('replies') && !isAdmin) {
        throw new APIError('Replies are not enabled for this collection', 404)
      }

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
        const status = accessResult.reason === 'Authentication required' ? 401 : 403
        throw new APIError(accessResult.reason || 'Forbidden', status)
      }

      const userId = req.user?.id
      if (!userId) {
        throw new APIError('Authentication required', 401)
      }

      const mergedGlobalSettings = await getMergedGlobalSettings(sanitized, req)

      const dataToSave: any = {
        body: replyBody,
        review: reviewId,
        user: userId,
        ...(mergedGlobalSettings.reviewModeration
          ? { status: 'pending' }
          : sanitized.reviewModeration
            ? { status: 'approved' }
            : {}),
      }

      let replyDoc: any

      if (replyId) {
        let existingReply: any
        try {
          existingReply = await req.payload.findByID({
            id: replyId,
            collection: sanitized.collectionSlugs.replies,
            overrideAccess: true,
            req,
          })
        } catch (_e) {
          throw new APIError('Reply not found', 404)
        }

        const replyUserId =
          typeof existingReply.user === 'object' && existingReply.user !== null
            ? existingReply.user.id
            : existingReply.user

        if (String(replyUserId) !== String(userId)) {
          throw new APIError('Reply not owned by user', 403)
        }

        replyDoc = await req.payload.update({
          id: replyId,
          collection: sanitized.collectionSlugs.replies,
          data: dataToSave,
          overrideAccess: true,
          req,
        })
      } else {
        replyDoc = await req.payload.create({
          collection: sanitized.collectionSlugs.replies,
          data: dataToSave,
          overrideAccess: true, // We did the access check manually
          req,
        })
      }

      // Fetch the updated review to get the new repliesCount
      const updatedReview = await req.payload.findByID({
        id: reviewId,
        collection: sanitized.collectionSlugs.reviews,
        overrideAccess: true,
        req,
      })

      if (sanitized.callbacks?.onReplySubmitted) {
        await sanitized.callbacks.onReplySubmitted({ req, reply: replyDoc })
      }

      return Response.json({
        repliesCount: updatedReview.repliesCount || 0,
        reply: replyDoc,
      })
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

      let existingReply: any
      try {
        existingReply = await req.payload.findByID({
          id: replyId,
          collection: sanitized.collectionSlugs.replies,
          overrideAccess: true,
          req,
        })
      } catch (_e) {
        throw new APIError('Reply not found', 404)
      }

      const replyUserId =
        typeof existingReply.user === 'object' && existingReply.user !== null
          ? existingReply.user.id
          : existingReply.user

      if (String(replyUserId) !== String(userId)) {
        throw new APIError('Reply not owned by user', 403)
      }

      let deletedReply: any
      try {
        deletedReply = await req.payload.delete({
          id: replyId,
          collection: sanitized.collectionSlugs.replies,
          overrideAccess: true,
          req,
        })
      } catch (err: any) {
        throw new APIError(err.message || 'Error deleting reply', 500)
      }

      const reviewId =
        typeof deletedReply.review === 'object' && deletedReply.review !== null
          ? deletedReply.review.id
          : deletedReply.review

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
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
