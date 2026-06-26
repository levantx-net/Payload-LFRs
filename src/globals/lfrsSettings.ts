import type { CheckboxField, GlobalConfig, GroupField } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { isFeatureEnabled } from '../defaults.js'
import { LfrsFeatureKey } from '../utilities/getEnabledFeatures.js'
import { invalidateLfrsSettingsCache } from '../utilities/lfrsSettingsCache.js'

export const lfrsSettingsSlug = 'lfrs-settings'

export function createLfrsSettingsGlobal(sanitized: SanitizedLfrsConfig): GlobalConfig {
  const fields: GroupField[] = []

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
