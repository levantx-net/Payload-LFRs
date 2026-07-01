import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * GET /api/lfrs/shares-count?collection=posts&id=abc123
 *
 * Returns the total number of share events recorded for a document.
 * This is a lightweight public endpoint — no auth required.
 *
 * Response: { sharesCount: number }
 */
export const createSharesCountEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
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

      const { totalDocs } = await req.payload.count({
        collection: sanitized.collectionSlugs.shares,
        overrideAccess: true,
        req,
        where: {
          and: [
            { targetCollection: { equals: collection } },
            { targetDoc: { equals: id } },
          ],
        },
      })

      return Response.json({ sharesCount: totalDocs })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
