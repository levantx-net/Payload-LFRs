import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'

export const createLikeEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const body = req.json ? await req.json() : req.body
      const { id, collection } = body || {}

      if (!collection || !id) {
        throw new APIError('Missing collection or id', 400)
      }

      const collectionOptions = sanitized.collections[collection]
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      const enabledFeatures = getEnabledFeatures(collectionOptions)
      if (!enabledFeatures.has('likes')) {
        throw new APIError('Likes are not enabled for this collection', 404)
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
        access: collectionOptions.likes,
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

      // All mutations use skipLfrsHooks to suppress the hook-based recalculation.
      // The endpoint handles aggregate updates directly at the end, which is more
      // robust than relying on hooks that share mutable context across the request.
      const mutationContext = { skipLfrsHooks: true }

      // Check if like exists
      const existingLikes = await req.payload.find({
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

      let liked = false

      if (existingLikes.docs.length > 0) {
        // Delete existing like (un-like)
        await req.payload.delete({
          id: existingLikes.docs[0].id as string,
          collection: sanitized.collectionSlugs.likes,
          context: mutationContext,
          overrideAccess: true,
          req,
        })
        liked = false

        if (sanitized.callbacks?.onUnliked) {
          await sanitized.callbacks.onUnliked({ req, targetCollection: collection, targetDoc: id })
        }
      } else {
        // Check mutual exclusivity with dislikes
        if (enabledFeatures.has('dislikes')) {
          const existingDislikes = await req.payload.find({
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
          if (existingDislikes.docs.length > 0) {
            await req.payload.delete({
              id: existingDislikes.docs[0].id as string,
              collection: sanitized.collectionSlugs.dislikes,
              context: mutationContext,
              overrideAccess: true,
              req,
            })
          }
        }

        // Create new like
        const likeDoc = await req.payload.create({
          collection: sanitized.collectionSlugs.likes,
          context: mutationContext,
          data: {
            targetCollection: collection,
            targetDoc: id,
            user: userId,
          },
          overrideAccess: true,
          req,
        })
        liked = true

        if (sanitized.callbacks?.onLiked) {
          await sanitized.callbacks.onLiked({ req, like: likeDoc })
        }
      }

      // --- Count interactions directly (source of truth) ---
      const [likesCount, dislikesCount] = await Promise.all([
        req.payload
          .count({
            collection: sanitized.collectionSlugs.likes,
            overrideAccess: true,
            req,
            where: {
              and: [{ targetCollection: { equals: collection } }, { targetDoc: { equals: id } }],
            },
          })
          .then((r) => r.totalDocs),
        enabledFeatures.has('dislikes')
          ? req.payload
              .count({
                collection: sanitized.collectionSlugs.dislikes,
                overrideAccess: true,
                req,
                where: {
                  and: [
                    { targetCollection: { equals: collection } },
                    { targetDoc: { equals: id } },
                  ],
                },
              })
              .then((r) => r.totalDocs)
          : Promise.resolve(0),
      ])

      // --- Update the target document's aggregate counts directly ---
      const lfrsUpdate: Record<string, any> = { likesCount }
      if (enabledFeatures.has('dislikes')) {
        lfrsUpdate.dislikesCount = dislikesCount
      }

      await req.payload.update({
        id,
        collection,
        context: { skipLfrsHooks: true },
        data: { lfrs: lfrsUpdate },
        overrideAccess: true,
        req,
      })

      // --- Build response ---
      const responseData: any = { liked, likesCount }

      if (enabledFeatures.has('dislikes')) {
        responseData.disliked = false
        responseData.dislikesCount = dislikesCount
      }

      return Response.json(responseData)
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
