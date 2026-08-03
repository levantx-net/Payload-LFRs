import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'
import type { SanitizedLfrsConfig } from '../types.js'

export const submitTestimonialEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const { uniqueCode, firstName, rating, testimonial, photo } = (await req?.json?.()) ?? {}

      if (!uniqueCode || !firstName || !rating || !testimonial) {
        throw new APIError('Missing required fields', 400)
      }

      // Find the testimonial by uniqueCode
      const testimonials = await req.payload.find({
        collection: sanitized.collectionSlugs.testimonials,
        where: {
          uniqueCode: {
            equals: uniqueCode,
          },
        },
        limit: 1,
        overrideAccess: true,
      })

      if (!testimonials.docs || testimonials.docs.length === 0) {
        throw new APIError('Invalid or expired invitation code', 404)
      }

      const existingTestimonial = testimonials.docs[0]

      if (existingTestimonial.testimonialAcceptedDate) {
        throw new APIError('This testimonial has already been submitted', 400)
      }

      // Validate rating
      const { max, step } = sanitized.rating
      const numRating = Number(rating)
      if (isNaN(numRating) || numRating < step || numRating > max || numRating % step !== 0) {
        throw new APIError('Invalid rating value', 400)
      }

      const updateData: any = {
        firstName,
        rating: numRating,
        testimonial,
        testimonialAcceptedDate: new Date().toISOString(),
      }

      if (photo) {
        updateData.photo = photo
      }

      const updated = await req.payload.update({
        collection: sanitized.collectionSlugs.testimonials,
        id: existingTestimonial.id,
        data: updateData,
        overrideAccess: true,
      })

      return Response.json({ success: true, doc: updated })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}

export const getTestimonialsEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const featuredOnly = req.query?.featured === 'true'
      const limit = parseInt((req.query?.limit as string) || '3', 10)

      const where: any = {}
      if (featuredOnly) {
        where.featured = { equals: true }
      }
      // Only get accepted ones
      where.status = { equals: 'accepted' }

      const testimonials = await req.payload.find({
        collection: sanitized.collectionSlugs.testimonials,
        where,
        limit,
        overrideAccess: true,
        sort: '-testimonialAcceptedDate',
      })

      return Response.json({ docs: testimonials.docs })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
