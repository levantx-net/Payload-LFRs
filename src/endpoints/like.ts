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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // Delete existing like
        await req.payload.delete({
          id: existingLikes.docs[0].id as string,
          collection: sanitized.collectionSlugs.likes,
          overrideAccess: true,
          req,
        })
        liked = false
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
              overrideAccess: true,
              req,
            })
          }
        }

        // Create new like
        await req.payload.create({
          collection: sanitized.collectionSlugs.likes,
          data: {
            targetCollection: collection,
            targetDoc: id,
            user: userId,
          },
          overrideAccess: true,
          req,
        })
        liked = true
      }

      // Re-fetch target doc to get updated counts
      const updatedDoc = await req.payload.findByID({
        id,
        collection,
        overrideAccess: true,
        req,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData: any = {
        liked,
        likesCount: updatedDoc.lfrs?.likesCount || 0,
      }

      if (enabledFeatures.has('dislikes')) {
        responseData.dislikesCount = updatedDoc.lfrs?.dislikesCount || 0
      }

      return Response.json(responseData)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
