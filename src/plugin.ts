import type { Config } from 'payload'

import { sanitizePluginConfig } from './defaults.js'
import type { LfrsPluginConfig, SanitizedLfrsConfig } from './types.js'

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

    if (!config.collections) {
      config.collections = []
    }

    // ── Phase 2: Collections will be added here ──────────────────────────────
    // TODO: Add lfrs-likes, lfrs-dislikes, lfrs-favourites, lfrs-ratings,
    //       lfrs-reviews, lfrs-replies collections

    // ── Phase 2: Fields will be injected here ────────────────────────────────
    // TODO: Inject lfrs aggregate fields and join fields into target collections

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

    // ── Phase 6: Admin UI components will be wired here ──────────────────────
    // TODO: Wire admin components (LfrsStatusWidget, ReviewModerationView)

    return config
  }
