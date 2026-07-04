import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'

export const createDislikesCountEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
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
      if (!enabledFeatures.has('dislikes')) {
        throw new APIError('Dislikes are not enabled for this collection', 404)
      }

      const { totalDocs } = await req.payload.count({
        collection: sanitized.collectionSlugs.dislikes,
        where: {
          and: [{ targetCollection: { equals: collection } }, { targetDoc: { equals: id } }],
        },
        overrideAccess: true,
        req,
      })

      return Response.json({ dislikesCount: totalDocs })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
