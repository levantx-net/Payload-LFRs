import type { CollectionConfig } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { isAuthenticated } from '../access/isAuthenticated.js'
import { isOwner } from '../access/isOwner.js'
import { isOwnerOrAdmin } from '../access/isOwnerOrAdmin.js'
import { createEnforceUniqueness } from '../hooks/enforceUniqueness.js'
import { enforceUser } from '../hooks/enforceUser.js'
import { createRecalculateAfterChange, createRecalculateAfterDelete } from '../hooks/recalculateAggregates.js'
import { createValidateScore } from '../hooks/validateScore.js'
import { createValidateTarget } from '../hooks/validateTarget.js'

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
    access: {
      create: isAuthenticated,
      delete: isOwnerOrAdmin,
      read: () => true,
      update: isOwner,
    },
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
    hooks: {
      afterChange: [createRecalculateAfterChange(config)],
      afterDelete: [createRecalculateAfterDelete(config)],
      beforeChange: [
        enforceUser,
        createEnforceUniqueness(config.collectionSlugs.ratings),
        createValidateTarget(config),
        createValidateScore(config.rating),
      ],
    },
    timestamps: true,
  }
}
