import type { CollectionConfig } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { isAuthenticated } from '../access/isAuthenticated.js'
import { isAdmin } from '../access/isAdmin.js'
import { enforceUser } from '../hooks/enforceUser.js'
import {
  createRecalculateAfterChange,
  createRecalculateAfterDelete,
} from '../hooks/recalculateAggregates.js'
import { createValidateTarget } from '../hooks/validateTarget.js'

/**
 * Creates the `lfrs-shares` collection config.
 *
 * Fields:
 * - user: relationship → users collection (nullable — supports guest shares when access is 'public')
 * - targetCollection: text (slug of the target collection)
 * - targetDoc: text (ID of the shared document)
 * - platform: text (e.g. 'facebook', 'twitter', 'whatsapp', 'telegram', 'web')
 * - url: text (the URL that was shared, optional)
 *
 * Key differences from likes/favourites:
 * - NO uniqueness constraint — the same user can share multiple times (once per platform per visit)
 * - NO delete for end-users — shares are immutable events (admins can delete)
 * - Supports 'public' access — guests can have their share tracked without auth
 */
export function createSharesCollection(config: SanitizedLfrsConfig): CollectionConfig {
  return {
    slug: config.collectionSlugs.shares,
    access: {
      // Authenticated users (or public if configured) can create shares
      create: isAuthenticated,
      // Only admins can delete shares — they are append-only events
      delete: isAdmin,
      // Admins can read all shares; users cannot browse others' shares
      read: isAdmin,
      // Shares are immutable — no updates allowed
      update: () => false,
    },
    admin: {
      defaultColumns: ['user', 'targetCollection', 'targetDoc', 'platform', 'createdAt'],
      group: config.adminGroup,
      useAsTitle: 'platform',
    },
    fields: [
      {
        name: 'user',
        type: 'relationship',
        admin: { readOnly: true },
        index: true,
        relationTo: config.usersCollectionSlug,
        // Not required — allows guest shares when access is set to 'public'
        required: false,
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
        name: 'platform',
        type: 'select',
        admin: { readOnly: true },
        index: true,
        options: [
          { label: 'Facebook', value: 'facebook' },
          { label: 'Twitter / X', value: 'twitter' },
          { label: 'WhatsApp', value: 'whatsapp' },
          { label: 'Telegram', value: 'telegram' },
          { label: 'LinkedIn', value: 'linkedin' },
          { label: 'Copy Link / Web', value: 'web' },
          { label: 'Other', value: 'other' },
        ],
        required: true,
      },
      {
        name: 'url',
        type: 'text',
        admin: { readOnly: true },
        // The actual URL that was shared — useful for analytics
        required: false,
      },
    ],
    hooks: {
      // Recalculate sharesCount on the target document after a share is created
      afterChange: [createRecalculateAfterChange(config)],
      // Recalculate sharesCount if an admin deletes a share record
      afterDelete: [createRecalculateAfterDelete(config)],
      beforeChange: [
        // Auto-set user from authenticated session (prevents spoofing)
        enforceUser,
        // Validate targetCollection is an enabled LFRs collection and targetDoc exists
        createValidateTarget(config),
      ],
    },
    timestamps: true,
  }
}
