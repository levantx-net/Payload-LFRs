import type { CollectionConfig } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Creates the `lfrs-favourites` collection config.
 *
 * Same structure as likes — one favourite per user per document.
 */
export function createFavouritesCollection(config: SanitizedLfrsConfig): CollectionConfig {
  return {
    slug: config.collectionSlugs.favourites,
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
