import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

export const createUserFavouritesEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const collection = req.query?.collection as string
      const userId = req.query?.userId as string

      if (!collection || !userId) {
        throw new APIError('Missing collection or userId query parameter', 400)
      }

      if (!req.user) {
        throw new APIError('Authentication required', 401)
      }

      const roles = (req.user.roles as string[]) || []
      const isAdmin = roles.includes('admin')
      
      // Allow only the user themselves, or an admin, to fetch this data
      if (req.user.id !== userId && !isAdmin) {
        throw new APIError('Forbidden', 403)
      }

      // Fetch the favourites
      const limit = Number(req.query?.limit) || 1000
      
      const favourites = await req.payload.find({
        collection: sanitized.collectionSlugs.favourites,
        where: {
          and: [
            { user: { equals: userId } },
            { targetCollection: { equals: collection } },
          ],
        },
        limit,
        overrideAccess: true,
        req,
      })

      const ids = favourites.docs.map((doc) => doc.targetDoc)

      return Response.json({ ids })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
