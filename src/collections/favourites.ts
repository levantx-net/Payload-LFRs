import type { CollectionConfig } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { isAuthenticated } from '../access/isAuthenticated.js'
import { isOwnerOrAdmin } from '../access/isOwnerOrAdmin.js'
import { createEnforceUniqueness } from '../hooks/enforceUniqueness.js'
import { enforceUser } from '../hooks/enforceUser.js'
import {
  createRecalculateAfterChange,
  createRecalculateAfterDelete,
} from '../hooks/recalculateAggregates.js'
import { createValidateTarget } from '../hooks/validateTarget.js'

/**
 * Creates the `lfrs-favourites` collection config.
 *
 * Same structure as likes — one favourite per user per document.
 */
export function createFavouritesCollection(config: SanitizedLfrsConfig): CollectionConfig {
  return {
    slug: config.collectionSlugs.favourites,
    access: {
      create: isAuthenticated,
      delete: isOwnerOrAdmin(config),
      read: isOwnerOrAdmin(config),
    },
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
    hooks: {
      afterChange: [createRecalculateAfterChange(config)],
      afterDelete: [createRecalculateAfterDelete(config)],
      beforeChange: [
        enforceUser,
        createEnforceUniqueness(config.collectionSlugs.favourites),
        createValidateTarget(config),
      ],
    },
    timestamps: true,
  }
}
