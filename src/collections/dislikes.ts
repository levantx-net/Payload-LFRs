import type { CollectionConfig } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Creates the `lfrs-dislikes` collection config.
 *
 * Only created if any collection has dislikes enabled.
 * Same structure as likes — mutual exclusivity with likes is
 * handled in the endpoint handler.
 */
export function createDislikesCollection(config: SanitizedLfrsConfig): CollectionConfig {
  return {
    slug: config.collectionSlugs.dislikes,
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
