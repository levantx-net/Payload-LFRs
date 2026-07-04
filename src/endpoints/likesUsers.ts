import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'

export const createLikesUsersEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const collection = req.query?.collection as string
      const id = req.query?.id as string

      if (!collection || !id) {
        throw new APIError('Missing collection or id query parameter', 400)
      }

      const collectionOptions = sanitized.collections[collection]
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      const enabledFeatures = await getEnabledFeatures(collectionOptions, collection, req)
      if (!enabledFeatures.has('likes')) {
        throw new APIError('Likes are not enabled for this collection', 404)
      }

      const limit = Number(req.query?.limit) || 1000

      const likes = await req.payload.find({
        collection: sanitized.collectionSlugs.likes,
        where: {
          and: [{ targetCollection: { equals: collection } }, { targetDoc: { equals: id } }],
        },
        limit,
        overrideAccess: true,
        req,
      })

      const userIds = likes.docs.map((doc: any) => typeof doc.user === 'object' ? doc.user.id : doc.user)

      return Response.json({ userIds })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
