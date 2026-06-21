import type { Config } from 'payload'

import type { LfrsPluginConfig, SanitizedLfrsConfig } from './types.js'

import { createDislikesCollection } from './collections/dislikes.js'
import { createFavouritesCollection } from './collections/favourites.js'
import { createLikesCollection } from './collections/likes.js'
import { createRatingsCollection } from './collections/ratings.js'
import { createRepliesCollection } from './collections/replies.js'
import { createReviewsCollection } from './collections/reviews.js'
import { sanitizePluginConfig } from './defaults.js'
import { createAggregateFields } from './fields/aggregateFields.js'
import { createJoinFields } from './fields/joinFields.js'
import { resolveReviewMedia } from './utilities/resolveReviewMedia.js'

/**
 * The main LFRs plugin function.
 *
 * Uses the standard Payload plugin curried pattern:
 * `(pluginOptions) => (config) => Config`
 */
export const payloadLfRs =
  (pluginOptions: LfrsPluginConfig) =>
  (config: Config): Config => {
    // Sanitize and validate all plugin options
    const sanitized: SanitizedLfrsConfig = sanitizePluginConfig(pluginOptions)

    // Validate review media config against the Payload config (build-time check)
    const resolvedMedia = resolveReviewMedia(sanitized.reviewMedia, config)
    sanitized.reviewMedia = resolvedMedia
    sanitized.mediaEnabled = resolvedMedia !== null

    if (!config.collections) {
      config.collections = []
    }

    // ── Add plugin-managed interaction collections ──────────────────────────
    config.collections.push(createLikesCollection(sanitized))

    if (sanitized.dislikesEnabled) {
      config.collections.push(createDislikesCollection(sanitized))
    }

    config.collections.push(createFavouritesCollection(sanitized))
    config.collections.push(createRatingsCollection(sanitized))
    config.collections.push(createReviewsCollection(sanitized))

    if (sanitized.repliesEnabled) {
      config.collections.push(createRepliesCollection(sanitized))
    }

    // ── Inject aggregate fields and join fields into target collections ─────
    config.collections = config.collections.map((collection) => {
      const collectionOptions = sanitized.collections[collection.slug]

      if (!collectionOptions) {
        // Not a target collection — skip
        return collection
      }

      // Add the lfrs aggregate group field
      const aggregateField = createAggregateFields(collectionOptions, sanitized)

      // Add join fields for admin panel reverse relationships
      const joinFields = createJoinFields(collection.slug, collectionOptions, sanitized)

      return {
        ...collection,
        fields: [
          ...(collection.fields || []),
          aggregateField,
          ...joinFields,
        ],
      }
    })

    /**
     * If the plugin is disabled, we still keep added collections/fields
     * so the database schema is consistent (important for migrations).
     * But we skip endpoints, hooks, and UI components.
     */
    if (sanitized.disabled) {
      return config
    }

    // ── Phase 3: Hooks will be wired here ────────────────────────────────────
    // TODO: Add hooks to interaction collections (enforceUser, enforceUniqueness,
    //       validateTarget, validateScore, validateReviewMedia, recalculateAggregates)
    // TODO: Add cascade delete hooks to target collections

    // ── Phase 4: Endpoints will be mounted here ──────────────────────────────
    if (!config.endpoints) {
      config.endpoints = []
    }
    // TODO: Mount /api/lfrs/* endpoints

    // ── Phase 7: Admin UI components will be wired here ──────────────────────
    // TODO: Wire admin components (LfrsStatusWidget, ReviewModerationView)

    return config
  }
