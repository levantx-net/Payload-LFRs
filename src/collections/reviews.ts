import type { CollectionConfig, Field } from 'payload'

import type { SanitizedLfrsConfig, SanitizedReviewMediaConfig } from '../types.js'

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
      required: true,
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

  return {
    slug: config.collectionSlugs.reviews,
    admin: {
      defaultColumns: ['user', 'targetCollection', 'targetDoc', 'score', 'createdAt'],
      group: config.adminGroup,
      useAsTitle: 'title',
    },
    fields,
    timestamps: true,
  }
}
