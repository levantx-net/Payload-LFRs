import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'

export const createFavouriteEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
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
      if (!enabledFeatures.has('favourites')) {
        throw new APIError('Favourites are not enabled for this collection', 404)
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
        access: collectionOptions.favourites,
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

      // Check if favourite exists
      const existingFavourites = await req.payload.find({
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

      let favourited = false

      if (existingFavourites.docs.length > 0) {
        // Delete existing favourite
        await req.payload.delete({
          id: existingFavourites.docs[0].id as string,
          collection: sanitized.collectionSlugs.favourites,
          overrideAccess: true,
          req,
        })
        favourited = false
      } else {
        // Create new favourite
        await req.payload.create({
          collection: sanitized.collectionSlugs.favourites,
          data: {
            targetCollection: collection,
            targetDoc: id,
            user: userId,
          },
          overrideAccess: true,
          req,
        })
        favourited = true
      }

      // Re-fetch target doc to get updated counts
      const updatedDoc = await req.payload.findByID({
        id,
        collection,
        overrideAccess: true,
        req,
      })

      return Response.json({
        favourited,
        favouritesCount: updatedDoc.lfrs?.favouritesCount || 0,
      })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
