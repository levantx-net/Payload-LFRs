import type { CollectionConfig } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Creates the `lfrs-ratings` collection config.
 *
 * Fields:
 * - user: relationship → users collection
 * - targetCollection: text (slug of the target collection)
 * - targetDoc: text (ID of the rated document)
 * - score: number (validated against rating.step and rating.max in hooks)
 *
 * Compound uniqueness (one rating per user per doc) is enforced via hooks.
 */
export function createRatingsCollection(config: SanitizedLfrsConfig): CollectionConfig {
  return {
    slug: config.collectionSlugs.ratings,
    admin: {
      defaultColumns: ['user', 'targetCollection', 'targetDoc', 'score', 'createdAt'],
      group: config.adminGroup,
      useAsTitle: 'targetDoc',
    },
    fields: [
      {
        name: 'user',
        type: 'relationship',
        admin: { readOnly: true },
        index: true,
        relationTo: config.usersCollectionSlug,
        required: true,
      },
      {
        name: 'targetCollection',
        type: 'text',
        admin: { readOnly: true },
        index: true,
        required: true,
      },
      {
        name: 'targetDoc',
        type: 'text',
        admin: { readOnly: true },
        index: true,
        required: true,
      },
      {
        name: 'score',
        type: 'number',
        max: config.rating.max,
        min: config.rating.step,
        required: true,
      },
    ],
    timestamps: true,
  }
}
