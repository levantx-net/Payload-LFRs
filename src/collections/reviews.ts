import type { CollectionBeforeChangeHook, CollectionConfig, Field } from 'payload'

import type { SanitizedLfrsConfig, SanitizedReviewMediaConfig } from '../types.js'

import { isAuthenticated } from '../access/isAuthenticated.js'
import { isOwner } from '../access/isOwner.js'
import { isOwnerOrAdmin } from '../access/isOwnerOrAdmin.js'
import { createEnforceUniqueness } from '../hooks/enforceUniqueness.js'
import { enforceUser } from '../hooks/enforceUser.js'
import {
  createRecalculateAfterChange,
  createRecalculateAfterDelete,
} from '../hooks/recalculateAggregates.js'
import { createValidateReviewMedia } from '../hooks/validateReviewMedia.js'
import { createValidateScore } from '../hooks/validateScore.js'
import { createValidateTarget } from '../hooks/validateTarget.js'

/**
 * Builds the conditional `media` array field for reviews.
 *
 * Only added when reviewMedia config has been successfully validated.
 */
function buildMediaField(mediaConfig: SanitizedReviewMediaConfig): Field {
  return {
    name: 'media',
    type: 'array',
    admin: { initCollapsed: true },
    fields: [
      {
        name: 'file',
        type: 'upload',
        relationTo: mediaConfig.uploadCollection,
        required: true,
      },
    ],
    labels: { plural: 'Files', singular: 'File' },
    maxRows: mediaConfig.maxFiles,
  }
}

/**
 * Creates the `lfrs-reviews` collection config.
 *
 * Fields:
 * - user: relationship → users collection
 * - targetCollection: text
 * - targetDoc: text
 * - title: text (optional)
 * - body: textarea (required)
 * - score: number (validated against rating config)
 * - media: array (conditional — only if reviewMedia is valid)
 * - status: select (conditional — only if reviewModeration is enabled)
 * - repliesCount: number (cached count of replies)
 */
export function createReviewsCollection(config: SanitizedLfrsConfig): CollectionConfig {
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
      name: 'title',
      type: 'text',
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
    },
    {
      name: 'score',
      type: 'number',
      max: config.rating.max,
      min: config.rating.step,
    },
  ]

  // Conditionally add the media array field
  if (config.mediaEnabled && config.reviewMedia) {
    fields.push(buildMediaField(config.reviewMedia))
  }

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

  // Cached replies count — always present
  fields.push({
    name: 'repliesCount',
    type: 'number',
    admin: {
      position: 'sidebar',
      readOnly: true,
    },
    defaultValue: 0,
  })

  // Add join field so replies are visible in the Admin Panel
  if (config.repliesEnabled) {
    fields.push({
      name: 'replies',
      type: 'join',
      collection: config.collectionSlugs.replies,
      on: 'review',
    })
  }

  // Build hooks
  const beforeChangeHooks: CollectionBeforeChangeHook[] = [
    enforceUser,
    createEnforceUniqueness(config.collectionSlugs.reviews, (data) => {
      return !!config.collections[data.targetCollection]?.allowMultipleReviews
    }),
    createValidateTarget(config),
    ({ data }) => {
      const isRatingEnabled = config.collections[data.targetCollection]?.enableReviewRating ?? true
      if (isRatingEnabled && (data.score === undefined || data.score === null)) {
        throw new Error('A rating score is required for this review.')
      }
      return data
    },
    createValidateScore(config.rating),
  ]

  // Add media validation hook if media is enabled
  const mediaHook = createValidateReviewMedia(config.reviewMedia)
  if (mediaHook) {
    beforeChangeHooks.push(mediaHook)
  }

  return {
    slug: config.collectionSlugs.reviews,
    access: {
      create: isAuthenticated,
      delete: isOwnerOrAdmin,
      read: isOwnerOrAdmin,
      update: isOwnerOrAdmin,
    },
    admin: {
      defaultColumns: ['title', 'user', 'targetCollection', 'targetDoc', 'score', 'createdAt'],
      group: config.adminGroup,
      useAsTitle: 'title',
    },
    fields,
    hooks: {
      afterChange: [
        createRecalculateAfterChange(config),
        async ({ doc, previousDoc, req, operation }) => {
          if (operation === 'update' && previousDoc?.status !== doc?.status) {
            if (config.callbacks?.onReviewStateChanged) {
              await config.callbacks.onReviewStateChanged({
                previousStatus: previousDoc?.status,
                req,
                review: doc,
              })
            }
          }
        },
      ],
      afterDelete: [createRecalculateAfterDelete(config)],
      beforeChange: beforeChangeHooks,
    },
    timestamps: true,
  }
}
