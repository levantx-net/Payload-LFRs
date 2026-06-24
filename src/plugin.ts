import type { Config } from 'payload'

import type { LfrsPluginConfig, SanitizedLfrsConfig } from './types.js'

import { createDislikesCollection } from './collections/dislikes.js'
import { createFavouritesCollection } from './collections/favourites.js'
import { createLikesCollection } from './collections/likes.js'
import { createRatingsCollection } from './collections/ratings.js'
import { createRepliesCollection } from './collections/replies.js'
import { createReviewsCollection } from './collections/reviews.js'
import { sanitizePluginConfig } from './defaults.js'
import { createDislikeEndpoint } from './endpoints/dislike.js'
import { createDistributionEndpoint } from './endpoints/distribution.js'
import { createFavouriteEndpoint } from './endpoints/favourite.js'
import { createInteractionsEndpoint } from './endpoints/interactions.js'
import { createLikeEndpoint } from './endpoints/like.js'
import { createLikesCountEndpoint } from './endpoints/likesCount.js'
import { createLikesUsersEndpoint } from './endpoints/likesUsers.js'
import { createRateEndpoint } from './endpoints/rate.js'
import { createReplyEndpoint, deleteReplyEndpoint } from './endpoints/reply.js'
import { createReviewEndpoint } from './endpoints/review.js'
import { createStatusEndpoint } from './endpoints/status.js'
import { createUserFavouritesEndpoint } from './endpoints/userFavourites.js'
import { createUserReviewsEndpoint } from './endpoints/userReviews.js'
import { createDislikesUsersEndpoint } from './endpoints/dislikesUsers.js'
import { createDislikesCountEndpoint } from './endpoints/dislikesCount.js'
import { createAggregateFields } from './fields/aggregateFields.js'
import { createJoinFields } from './fields/joinFields.js'
import { createCascadeDelete } from './hooks/cascadeDelete.js'
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
        fields: [...(collection.fields || []), aggregateField, ...joinFields],
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

    // ── Phase 3: Wire cascade delete hooks into target collections ──────────
    // (Interaction collection hooks are handled in their own factory functions)
    config.collections = config.collections.map((collection) => {
      if (!sanitized.collections[collection.slug]) {
        return collection
      }

      return {
        ...collection,
        hooks: {
          ...(collection.hooks || {}),
          afterDelete: [
            createCascadeDelete(sanitized, collection.slug),
            ...(collection.hooks?.afterDelete || []),
          ],
        },
      }
    })

    // ── Phase 4: Endpoints will be mounted here ──────────────────────────────
    if (!config.endpoints) {
      config.endpoints = []
    }

    config.endpoints.push(
      {
        handler: createLikeEndpoint(sanitized),
        method: 'post',
        path: '/lfrs/like',
      },
      {
        handler: createFavouriteEndpoint(sanitized),
        method: 'post',
        path: '/lfrs/favourite',
      },
      {
        handler: createRateEndpoint(sanitized),
        method: 'post',
        path: '/lfrs/rate',
      },
      {
        handler: createReviewEndpoint(sanitized),
        method: 'post',
        path: '/lfrs/review',
      },
      {
        handler: createReplyEndpoint(sanitized),
        method: 'post',
        path: '/lfrs/reply',
      },
      {
        handler: deleteReplyEndpoint(sanitized),
        method: 'delete',
        path: '/lfrs/reply',
      },
      {
        handler: createStatusEndpoint(sanitized),
        method: 'get',
        path: '/lfrs/status',
      },
      {
        handler: createInteractionsEndpoint(sanitized),
        method: 'get',
        path: '/lfrs/interactions',
      },
      {
        handler: createDistributionEndpoint(sanitized),
        method: 'get',
        path: '/lfrs/distribution',
      },
      {
        handler: createUserFavouritesEndpoint(sanitized),
        method: 'get',
        path: '/lfrs/user-favourites',
      },
      {
        handler: createLikesCountEndpoint(sanitized),
        method: 'get',
        path: '/lfrs/likes-count',
      },
      {
        handler: createLikesUsersEndpoint(sanitized),
        method: 'get',
        path: '/lfrs/likes-users',
      },
      {
        handler: createDislikesCountEndpoint(sanitized),
        method: 'get',
        path: '/lfrs/dislikes-count',
      },
      {
        handler: createDislikesUsersEndpoint(sanitized),
        method: 'get',
        path: '/lfrs/dislikes-users',
      },
      {
        handler: createUserReviewsEndpoint(sanitized),
        method: 'get',
        path: '/lfrs/user-reviews',
      },
    )

    if (sanitized.dislikesEnabled) {
      config.endpoints.push({
        handler: createDislikeEndpoint(sanitized),
        method: 'post',
        path: '/lfrs/dislike',
      })
    }

    // ── Phase 7: Admin UI components will be wired here ──────────────────────
    if (!config.admin) {
      config.admin = {}
    }
    if (!config.admin.components) {
      config.admin.components = {}
    }
    if (!config.admin.components.views) {
      config.admin.components.views = {}
    }

    if (sanitized.reviewModeration) {
      config.admin.components.views.lfrsModeration = {
        Component: 'payload-lfrs/admin#ReviewModerationView',
        exact: true,
        path: '/lfrs-moderation',
      } as any
    }

    return config
  }
