import type { Field } from 'payload'

import type { SanitizedCollectionOptions, SanitizedLfrsConfig } from '../types.js'

import { isFeatureEnabled } from '../defaults.js'

/**
 * Creates join fields that are injected into target collections
 * so the admin panel can show related interactions.
 *
 * Each join field creates a reverse relationship from the target
 * collection to the interaction collection.
 */
export function createJoinFields(
  collectionSlug: string,
  collectionOptions: SanitizedCollectionOptions,
  config: SanitizedLfrsConfig,
): Field[] {
  const joinFields: Field[] = []

  if (isFeatureEnabled(collectionOptions.likes)) {
    joinFields.push({
      name: 'lfrs_likes',
      type: 'join',
      admin: {
        allowCreate: false,
        defaultColumns: ['user', 'createdAt'],
      },
      collection: config.collectionSlugs.likes,
      on: 'targetDoc',
      where: {
        targetCollection: { equals: collectionSlug },
      },
    })
  }

  if (isFeatureEnabled(collectionOptions.dislikes) && config.dislikesEnabled) {
    joinFields.push({
      name: 'lfrs_dislikes',
      type: 'join',
      admin: {
        allowCreate: false,
        defaultColumns: ['user', 'createdAt'],
      },
      collection: config.collectionSlugs.dislikes,
      on: 'targetDoc',
      where: {
        targetCollection: { equals: collectionSlug },
      },
    })
  }

  if (isFeatureEnabled(collectionOptions.favourites)) {
    joinFields.push({
      name: 'lfrs_favourites',
      type: 'join',
      admin: {
        allowCreate: false,
        defaultColumns: ['user', 'createdAt'],
      },
      collection: config.collectionSlugs.favourites,
      on: 'targetDoc',
      where: {
        targetCollection: { equals: collectionSlug },
      },
    })
  }

  if (isFeatureEnabled(collectionOptions.ratings)) {
    joinFields.push({
      name: 'lfrs_ratings',
      type: 'join',
      admin: {
        allowCreate: false,
        defaultColumns: ['user', 'score', 'createdAt'],
      },
      collection: config.collectionSlugs.ratings,
      on: 'targetDoc',
      where: {
        targetCollection: { equals: collectionSlug },
      },
    })
  }

  if (isFeatureEnabled(collectionOptions.reviews)) {
    joinFields.push({
      name: 'lfrs_reviews',
      type: 'join',
      admin: {
        allowCreate: false,
        defaultColumns: ['user', 'title', 'score', 'createdAt'],
      },
      collection: config.collectionSlugs.reviews,
      on: 'targetDoc',
      where: {
        targetCollection: { equals: collectionSlug },
      },
    })
  }

  return joinFields
}
