import type { CheckboxField, GlobalConfig } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { isFeatureEnabled } from '../defaults.js'
import { type LfrsFeatureKey } from '../utilities/getEnabledFeatures.js'
import { invalidateLfrsSettingsCache } from '../utilities/lfrsSettingsCache.js'

export const lfrsSettingsSlug = 'lfrs-settings'

export function createLfrsSettingsGlobal(sanitized: SanitizedLfrsConfig): GlobalConfig {
  const fields: any[] = []

  if (sanitized.reviewModeration) {
    fields.push({
      name: 'reviewModeration',
      type: 'checkbox',
      label: 'Enable Review Moderation',
      defaultValue: true,
    })
  }

  if (sanitized.mediaEnabled) {
    fields.push({
      name: 'enableReviewMedia',
      type: 'checkbox',
      label: 'Enable Review Media Attachments',
      defaultValue: true,
    })
  }

  for (const [slug, options] of Object.entries(sanitized.collections)) {
    const collectionFields: CheckboxField[] = []

    const checkAndAdd = (key: LfrsFeatureKey, label: string) => {
      if (isFeatureEnabled(options[key])) {
        collectionFields.push({
          name: key,
          type: 'checkbox',
          label: `Enable ${label}`,
          defaultValue: true,
        })
      }
    }

    checkAndAdd('likes', 'Likes')
    checkAndAdd('dislikes', 'Dislikes')
    checkAndAdd('favourites', 'Favourites')
    checkAndAdd('ratings', 'Ratings')
    checkAndAdd('reviews', 'Reviews')
    checkAndAdd('replies', 'Replies')

    if (options.allowMultipleReviews) {
      collectionFields.push({
        name: 'allowMultipleReviews',
        type: 'checkbox',
        label: 'Allow Multiple Reviews',
        defaultValue: true,
      })
    }

    if (options.enableReviewRating) {
      collectionFields.push({
        name: 'enableReviewRating',
        type: 'checkbox',
        label: 'Require Rating in Reviews',
        defaultValue: true,
      })
    }

    if (collectionFields.length > 0) {
      fields.push({
        name: slug,
        type: 'group',
        admin: {
          description: `Manage active LFRs features for the ${slug} collection.`,
        },
        fields: collectionFields,
        label: `Collection: ${slug}`,
      })
    }
  }

  return {
    slug: lfrsSettingsSlug,
    access: {
      read: () => true,
    },
    admin: {
      group: sanitized.adminGroup,
    },
    hooks: {
      afterChange: [
        ({ doc }) => {
          invalidateLfrsSettingsCache()
          return doc
        },
      ],
    },
    fields,
    label: 'LFRs Settings',
  }
}
