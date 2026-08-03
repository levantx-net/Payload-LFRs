import type { Payload } from 'payload'

import { devUser } from './helpers/credentials.js'

export const seed = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: 'users',
    where: {
      email: {
        equals: devUser.email,
      },
    },
  })

  if (!totalDocs) {
    await payload.create({
      collection: 'users',
      data: devUser,
    })
  }

  // Seed 3 featured testimonials if none exist
  const { totalDocs: testimonialCount } = await payload.count({
    collection: 'lfrs-testimonials',
  })

  if (!testimonialCount) {
    const sampleTestimonials = [
      {
        invitedEmail: 'alex@example.com',
        firstName: 'Alex Johnson',
        rating: 5,
        testimonial: 'Payload LFRs made adding reviews and ratings to our application completely effortless. Highly recommended!',
        featured: true,
        status: 'accepted' as const,
        uniqueCode: 'seed-code-1',
        testimonialAcceptedDate: new Date().toISOString(),
      },
      {
        invitedEmail: 'sarah@example.com',
        firstName: 'Sarah Williams',
        rating: 5,
        testimonial: 'The UI components are sleek and customizable. The testimonial feature saved us weeks of custom development.',
        featured: true,
        status: 'accepted' as const,
        uniqueCode: 'seed-code-2',
        testimonialAcceptedDate: new Date().toISOString(),
      },
      {
        invitedEmail: 'michael@example.com',
        firstName: 'Michael Brown',
        rating: 4,
        testimonial: 'Fantastic plugin! Simple configuration, smooth API, and great admin controls.',
        featured: true,
        status: 'accepted' as const,
        uniqueCode: 'seed-code-3',
        testimonialAcceptedDate: new Date().toISOString(),
      },
    ]

    for (const t of sampleTestimonials) {
      await payload.create({
        collection: 'lfrs-testimonials',
        data: t,
      })
    }
  }
}
