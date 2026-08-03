import { randomBytes } from 'crypto'
import type { CollectionConfig, Field } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

export const createTestimonialsCollection = (sanitized: SanitizedLfrsConfig): CollectionConfig => {
  const fields: Field[] = [
    {
      name: 'invitedEmail',
      type: 'email',
      required: true,
      admin: {
        description: 'The email address to send the invitation to.',
      },
    },
    {
      name: 'uniqueCode',
      type: 'text',
      admin: {
        readOnly: true,
      },
      index: true,
    },
    {
      name: 'firstName',
      type: 'text',
    },
    {
      name: 'rating',
      type: 'number',
      min: sanitized.rating.step,
      max: sanitized.rating.max,
    },
    {
      name: 'testimonial',
      type: 'textarea',
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Accepted', value: 'accepted' },
        { label: 'Rejected', value: 'rejected' },
      ],
      access: {
        update: ({ req }) => sanitized.isAdmin({ req }),
      },
    },
    {
      name: 'invitationSentDate',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'testimonialAcceptedDate',
      type: 'date',
      admin: {
        readOnly: true,
      },
    },
  ]

  if (sanitized.reviewMedia?.uploadCollection) {
    fields.push({
      name: 'photo',
      type: 'upload',
      relationTo: sanitized.reviewMedia.uploadCollection,
    })
  }

  return {
    slug: sanitized.collectionSlugs?.testimonials || 'testimonials',
    admin: {
      useAsTitle: 'invitedEmail',
      group: sanitized.adminGroup,
      defaultColumns: [
        'invitedEmail',
        'firstName',
        'status',
        'featured',
        'rating',
        'invitationSentDate',
        'testimonialAcceptedDate',
      ],
    },
    access: {
      read: () => true, // Publicly readable for displaying them
      create: ({ req }) => sanitized.isAdmin({ req }),
      update: ({ req }) => sanitized.isAdmin({ req }),
      delete: ({ req }) => sanitized.isAdmin({ req }),
    },
    hooks: {
      beforeChange: [
        ({ data, operation }) => {
          if (operation === 'create') {
            if (!data.uniqueCode) {
              data.uniqueCode = randomBytes(16).toString('hex')
            }
            if (!data.invitationSentDate) {
              data.invitationSentDate = new Date().toISOString()
            }
          }
          return data
        },
      ],
      afterChange: [
        async ({ doc, operation, req }) => {
          if (operation === 'create' && doc.invitedEmail) {
            // Generate link and send email
            let link = ''
            if (sanitized.testimonialFormUrl) {
              const url = new URL(sanitized.testimonialFormUrl)
              url.searchParams.set('code', doc.uniqueCode)
              link = url.toString()
            } else {
              const origin =
                typeof req.headers.get === 'function'
                  ? req.headers.get('origin')
                  : (req.headers as any).origin
              link = `${origin || process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/add-testimonial?code=${doc.uniqueCode}`
            }
            try {
              await req.payload.sendEmail({
                to: doc.invitedEmail,
                subject: 'You are invited to leave a testimonial',
                html: `<p>Please click <a href="${link}">here</a> to leave a testimonial.</p>`,
              })
            } catch (_) {
              req.payload.logger.error(
                `Failed to send testimonial invitation to ${doc.invitedEmail}`,
              )
            }
          }
        },
      ],
    },
    fields,
  }
}
