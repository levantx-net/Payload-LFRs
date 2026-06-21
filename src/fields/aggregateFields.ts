import type { Field } from 'payload'

import type { SanitizedCollectionOptions, SanitizedLfrsConfig } from '../types.js'

import { isFeatureEnabled } from '../defaults.js'

/**
 * Creates the `lfrs` group field that is injected into target collections.
 *
 * Contains cached aggregate counts for each enabled feature.
 * These fields are read-only and updated by plugin hooks.
 */
export function createAggregateFields(
  collectionOptions: SanitizedCollectionOptions,
  _config: SanitizedLfrsConfig,
): Field {
  const aggregateSubFields: Field[] = []

  // Always add likesCount when likes are enabled
  if (isFeatureEnabled(collectionOptions.likes)) {
    aggregateSubFields.push({
      name: 'likesCount',
      type: 'number',
      admin: { readOnly: true },
      defaultValue: 0,
    })
  }

  // Add dislikesCount when dislikes are enabled for this collection
  if (isFeatureEnabled(collectionOptions.dislikes)) {
    aggregateSubFields.push({
      name: 'dislikesCount',
      type: 'number',
      admin: { readOnly: true },
      defaultValue: 0,
    })
  }

  // Add favouritesCount when favourites are enabled
  if (isFeatureEnabled(collectionOptions.favourites)) {
    aggregateSubFields.push({
      name: 'favouritesCount',
      type: 'number',
      admin: { readOnly: true },
      defaultValue: 0,
    })
  }

  // Add rating aggregates when ratings are enabled
  if (isFeatureEnabled(collectionOptions.ratings)) {
    aggregateSubFields.push(
      {
        name: 'ratingsCount',
        type: 'number',
        admin: { readOnly: true },
        defaultValue: 0,
      },
      {
        name: 'ratingsAverage',
        type: 'number',
        admin: { readOnly: true },
        defaultValue: 0,
      },
    )
  }

  // Add reviewsCount when reviews are enabled
  if (isFeatureEnabled(collectionOptions.reviews)) {
    aggregateSubFields.push({
      name: 'reviewsCount',
      type: 'number',
      admin: { readOnly: true },
      defaultValue: 0,
    })
  }

  return {
    name: 'lfrs',
    type: 'group',
    admin: {
      position: 'sidebar',
      readOnly: true,
      // Always show in sidebar (even when empty — keeps schema consistent)
      condition: () => true,
    },
    fields: aggregateSubFields.length > 0
      ? aggregateSubFields
      : [
          // Payload requires at least one field in a group — add a hidden placeholder
          {
            name: '_placeholder',
            type: 'text',
            admin: { hidden: true },
          },
        ],
    label: 'LFRs',
  }
}
