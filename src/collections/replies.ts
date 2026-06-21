import type { CollectionConfig, Field } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Creates the `lfrs-replies` collection config.
 *
 * Only created if any collection has replies enabled.
 *
 * Threading model: One level deep only — replies reference a review,
 * not other replies. A user can post multiple replies to the same review.
 */
export function createRepliesCollection(config: SanitizedLfrsConfig): CollectionConfig {
  const fields: Field[] = [
    {
      name: 'user',
      type: 'relationship',
      admin: { readOnly: true },
      index: true,
      relationTo: config.usersCollectionSlug,
      required: true,
    },
    {
      name: 'review',
      type: 'relationship',
      admin: { readOnly: true },
      index: true,
      relationTo: config.collectionSlugs.reviews,
      required: true,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
    },
  ]

  // Conditionally add the moderation status field
  if (config.reviewModeration) {
    fields.push({
      name: 'status',
      type: 'select',
      admin: {
        position: 'sidebar',
      },
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
    })
  }

  return {
    slug: config.collectionSlugs.replies,
    admin: {
      defaultColumns: ['user', 'review', 'body', 'createdAt'],
      group: config.adminGroup,
      useAsTitle: 'body',
    },
    fields,
    timestamps: true,
  }
}
