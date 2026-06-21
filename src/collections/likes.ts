import type { CollectionConfig } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Creates the `lfrs-likes` collection config.
 *
 * Fields:
 * - user: relationship → users collection
 * - targetCollection: text (slug of the target collection)
 * - targetDoc: text (ID of the liked document)
 *
 * Compound uniqueness (one like per user per doc) is enforced via hooks.
 */
export function createLikesCollection(config: SanitizedLfrsConfig): CollectionConfig {
  return {
    slug: config.collectionSlugs.likes,
    admin: {
      defaultColumns: ['user', 'targetCollection', 'targetDoc', 'createdAt'],
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
    ],
    timestamps: true,
  }
}
