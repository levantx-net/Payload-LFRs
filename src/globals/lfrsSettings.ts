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
      label: 'Enable Reviews, Replies & Ratings Moderation',
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

  if (sanitized.enableReviewReactions) {
    fields.push({
      name: 'enableReviewReactions',
      type: 'checkbox',
      label: 'Enable Like/Dislike on Reviews and Replies',
      defaultValue: true,
    })
  }

  for (const [slug, options] of Object.entries(sanitized.collections)) {
    if (slug === sanitized.collectionSlugs.reviews || slug === sanitized.collectionSlugs.replies) {
      continue
    }

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

    // Add 'reviews' checkbox, then immediately add 'allowMultipleReviews' after it
    // so they stay visually grouped — and hide the latter when reviews are off.
    if (isFeatureEnabled(options.reviews)) {
      collectionFields.push({
        name: 'reviews',
        type: 'checkbox',
        label: 'Enable Reviews',
        defaultValue: true,
      })

      if (options.allowMultipleReviews) {
        collectionFields.push({
          name: 'allowMultipleReviews',
          type: 'checkbox',
          label: 'Allow Multiple Reviews',
          defaultValue: true,
          admin: {
            condition: (_, siblingData) => siblingData?.reviews !== false,
            description: 'When enabled, users can submit more than one review per document.',
          },
        })
      }
    }

    checkAndAdd('replies', 'Replies')
    checkAndAdd('shares', 'Shares')

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
      hidden: sanitized.adminControls === false ? true : undefined,
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
