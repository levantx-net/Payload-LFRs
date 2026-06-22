import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'

export const createDistributionEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
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

      const enabledFeatures = getEnabledFeatures(collectionOptions)
      const distribution: Record<string, number> = {}
      let totalScore = 0
      let count = 0

      const processScores = (docs: any[]) => {
        for (const doc of docs) {
          if (typeof doc.score === 'number') {
            const scoreStr = doc.score.toString()
            distribution[scoreStr] = (distribution[scoreStr] || 0) + 1
            totalScore += doc.score
            count++
          }
        }
      }

      // We use limit: 100000 which is effectively all for most realistic scenarios.
      // A more optimized approach would use DB aggregation, but this works cross-database.
      if (enabledFeatures.has('ratings')) {
        const ratings = await req.payload.find({
          collection: sanitized.collectionSlugs.ratings,
          limit: 100000,
          overrideAccess: true,
          req,
          where: {
            and: [
              { targetCollection: { equals: collection } },
              { targetDoc: { equals: id } },
            ],
          },
        })
        processScores(ratings.docs)
      }

      if (enabledFeatures.has('reviews')) {
        const where: any = {
          and: [
            { targetCollection: { equals: collection } },
            { targetDoc: { equals: id } },
          ],
        }
        
        if (sanitized.reviewModeration) {
          where.and.push({ status: { equals: 'approved' } })
        }

        const reviews = await req.payload.find({
          collection: sanitized.collectionSlugs.reviews,
          limit: 100000,
          overrideAccess: true,
          req,
          where,
        })
        processScores(reviews.docs)
      }

      const average = count > 0 ? Number((totalScore / count).toFixed(2)) : 0

      // Re-fetch target doc to use its cached counts if we want, but the spec says
      // "Returns count of ratings per score value — powers the Amazon-style rating breakdown bars"
      // and returns average, totalRatings.
      // So returning the computed values is fine.

      return Response.json({
        average,
        distribution,
        ratingConfig: sanitized.rating,
        totalRatings: count,
      })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
