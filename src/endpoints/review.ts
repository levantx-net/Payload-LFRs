import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import {
  getMergedCollectionSettings,
  getMergedGlobalSettings,
} from '../utilities/getMergedSettings.js'
import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'

export const createReviewEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const body = req.json ? await req.json() : req.body
      const { id, body: reviewBody, collection, media, score, title, reviewId } = body || {}

      if (!collection || !id) {
        throw new APIError('Missing collection or id', 400)
      }

      const collectionOptions = sanitized.collections[collection]
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      const mergedGlobalSettings = await getMergedGlobalSettings(sanitized, req)
      const mergedCollectionSettings = await getMergedCollectionSettings(
        collectionOptions,
        collection,
        req,
      )

      const enabledFeatures = await getEnabledFeatures(collectionOptions, collection, req)

      const isReviewsEnabled = enabledFeatures.has('reviews')
      const isRatingsEnabled = enabledFeatures.has('ratings')

      if (!isReviewsEnabled && !isRatingsEnabled) {
        throw new APIError('Reviews and ratings are not enabled for this collection', 404)
      }

      // Score is required only when ratings are enabled (respecting admin override)
      if (isRatingsEnabled && typeof score !== 'number') {
        throw new APIError('Missing valid score', 400)
      }

      // Body is required only when reviews are enabled (respecting admin override)
      // If only ratings are enabled, body may be omitted.
      if (isReviewsEnabled && !reviewBody) {
        throw new APIError('Missing review body', 400)
      }

      // Strip body/title when reviews are disabled (admin may have turned them off)
      let finalBody = reviewBody
      let finalTitle = title
      if (!isReviewsEnabled) {
        finalBody = null
        finalTitle = null
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
        access: isReviewsEnabled ? collectionOptions.reviews : collectionOptions.ratings,
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
        body: finalBody,
        score,
        title: finalTitle,
        ...(mergedGlobalSettings.reviewModeration
          ? { status: 'pending' }
          : sanitized.reviewModeration
            ? { status: 'approved' }
            : {}),
      }

      if (mergedGlobalSettings.mediaEnabled && Array.isArray(media)) {
        dataToSave.media = media.map((fileId) => ({ file: fileId }))
      }

      let reviewDoc: any

      let reviewToUpdateId: string | undefined

      if (reviewId) {
        const ownsReview = existingReviews.docs.some((r) => String(r.id) === String(reviewId))
        if (!ownsReview) {
          throw new APIError('Review not found or not owned by user', 404)
        }
        reviewToUpdateId = reviewId
      } else if (
        existingReviews.docs.length > 0 &&
        !mergedCollectionSettings.allowMultipleReviews
      ) {
        reviewToUpdateId = existingReviews.docs[0].id as string
      }

      if (reviewToUpdateId) {
        // Update existing review
        reviewDoc = await req.payload.update({
          id: reviewToUpdateId,
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

      if (sanitized.callbacks?.onReviewSubmitted) {
        await sanitized.callbacks.onReviewSubmitted({ req, review: reviewDoc })
      }

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

export const deleteReviewEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const body = req.json ? await req.json() : req.body
      const { reviewId } = body || {}

      if (!reviewId) {
        throw new APIError('Missing reviewId', 400)
      }

      const userId = req.user?.id
      if (!userId) {
        throw new APIError('Authentication required', 401)
      }

      let existingReview: any
      try {
        existingReview = await req.payload.findByID({
          id: reviewId,
          collection: sanitized.collectionSlugs.reviews,
          overrideAccess: true,
          req,
        })
      } catch (_e) {
        throw new APIError('Review not found', 404)
      }

      const reviewUserId =
        typeof existingReview.user === 'object' && existingReview.user !== null
          ? existingReview.user.id
          : existingReview.user

      if (String(reviewUserId) !== String(userId)) {
        throw new APIError('Review not owned by user', 403)
      }

      let deletedReview: any
      try {
        deletedReview = await req.payload.delete({
          id: reviewId,
          collection: sanitized.collectionSlugs.reviews,
          overrideAccess: true,
          req,
        })
      } catch (err: any) {
        throw new APIError(err.message || 'Error deleting review', 500)
      }

      const targetCollection = deletedReview.targetCollection
      const targetDocId = deletedReview.targetDoc

      const updatedDoc = await req.payload.findByID({
        id: targetDocId as string,
        collection: targetCollection as string,
        overrideAccess: true,
        req,
      })

      if (sanitized.callbacks?.onReviewDeleted) {
        await sanitized.callbacks.onReviewDeleted({
          req,
          reviewId,
          targetCollection: targetCollection as string,
          targetDoc: targetDocId as string,
        })
      }

      return Response.json({
        deleted: true,
        reviewsCount: updatedDoc.lfrs?.reviewsCount || 0,
      })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
