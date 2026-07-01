import type { CollectionSlug, PayloadRequest } from 'payload'

// ─── Feature Access ────────────────────────────────────────────────────────────

/**
 * Access control for a single LFRs feature on a specific collection.
 *
 * - `'public'` → feature is completely public (even to guests)
 * - `true`     → any authenticated user can perform this action (default for interactions)
 * - `false`    → feature disabled for this collection
 * - `string[]` → only users whose `roles` array includes at least one of these roles
 * - `Function` → custom async check receiving the request and target document
 */
export type LfrsFeatureAccess = 'public' | boolean | LfrsFeatureAccessFn | string[]

/**
 * Custom access function for dynamic per-document checks.
 *
 * Receives the Payload request (with `req.user`) and the target document
 * being interacted with. Return `true` to allow, `false` to deny.
 *
 * Use this for business logic like:
 * - "Only users who purchased this product can review it"
 * - "Only enrolled students can rate a course"
 * - "Only users in the same organisation can favourite a resource"
 */
export type LfrsFeatureAccessFn = (args: {
  /** The Payload request with authenticated user */
  req: PayloadRequest
  /** The slug of the target collection */
  targetCollection: string
  /** The target document being liked/favourited/rated/reviewed */
  targetDoc: Record<string, unknown>
}) => boolean | Promise<boolean>

// ─── Collection Options ────────────────────────────────────────────────────────

export interface LfrsCollectionOptions {
  /**
   * Enable/control dislikes.
   * Default: false (disabled).
   * When enabled, dislikes are mutually exclusive with likes — liking
   * removes an existing dislike and vice versa.
   */
  dislikes?: LfrsFeatureAccess

  /**
   * Enable/control favourites.
   * Default: true (any authenticated user)
   */
  favourites?: LfrsFeatureAccess

  /**
   * Enable/control likes.
   * Default: true (any authenticated user)
   */
  likes?: LfrsFeatureAccess

  /**
   * Enable/control ratings.
   * Default: true (any authenticated user)
   */
  ratings?: LfrsFeatureAccess

  /**
   * Enable/control replies on reviews.
   * Default: true (any authenticated user can reply).
   * Replies are one level deep — no nested threads.
   */
  replies?: LfrsFeatureAccess

  /**
   * Enable/control reviews.
   * Default: true (any authenticated user)
   */
  reviews?: LfrsFeatureAccess

  /**
   * Access control for viewing reviews and replies.
   * Default: 'public' (guests can view)
   */
  readReviews?: LfrsFeatureAccess

  /**
   * Enable/control shares.
   * Default: false (disabled).
   *
   * Shares are append-only events — a user can share the same document
   * multiple times (once per platform per session). There is no "un-share".
   * The aggregate count (`sharesCount`) is stored on the target document's
   * `lfrs` group field and incremented on every share.
   *
   * Set to `'public'` to allow guest (unauthenticated) shares.
   */
  shares?: LfrsFeatureAccess

  /**
   * Whether to allow users to leave multiple reviews on the same document.
   * Default: false
   */
  allowMultipleReviews?: boolean

}

// ─── Rating Config ─────────────────────────────────────────────────────────────

export interface LfrsRatingConfig {
  /**
   * Icon identifier hint for frontend rendering (default: 'star').
   *
   * This is a string label stored in the sanitized config and returned
   * in the `/api/lfrs/status` endpoint response metadata. It does NOT
   * affect backend logic — it's purely a hint so the frontend knows
   * which icon set to render (stars, hearts, thumbs, flames, etc.).
   *
   * Examples: 'star', 'heart', 'thumb', 'flame'
   */
  icon?: string

  /**
   * Maximum rating value (default: 5).
   * The minimum is always 1 (a rating of 0 = no rating, handled by deletion).
   *
   * Examples: 5 for 5-star, 10 for 10-point scale.
   */
  max?: number

  /**
   * Step increment for valid rating values (default: 1).
   *
   * - `1`   → whole numbers only: 1, 2, 3, 4, 5
   * - `0.5` → half values allowed: 0.5, 1, 1.5, 2, ... 5
   * - `0.1` → fine-grained: 0.1, 0.2, ... 5.0
   *
   * Validation: score must be a multiple of `step` and within [step, max].
   * (The minimum valid score is `step`, not 0 — a rating of 0 doesn't make
   * sense; to "un-rate" a document the user deletes the rating.)
   */
  step?: number
}

// ─── Review Media Config ───────────────────────────────────────────────────────

export interface LfrsReviewMediaConfig {
  /**
   * Allowed MIME types as glob patterns.
   * Examples: ['image/*'], ['image/jpeg', 'image/png', 'video/mp4']
   *
   * Default: ['image/*'] (images only).
   *
   * Validated in a `beforeChange` hook on the reviews collection.
   * Files with disallowed types are rejected with a 400 error.
   */
  allowedMimeTypes?: string[]

  /**
   * Maximum number of files per review (default: 5).
   * Translates to the `maxRows` option on the array field.
   */
  maxFiles?: number

  /**
   * Maximum file size in bytes per individual file.
   * Example: 5 * 1024 * 1024 (5 MB)
   *
   * Default: 5242880 (5 MB).
   *
   * Validated in a `beforeChange` hook on the reviews collection.
   * Files exceeding this size are rejected with a 400 error.
   */
  maxFileSize?: number

  /**
   * REQUIRED — slug of an existing upload-enabled collection that will
   * host the review media files (e.g. 'media', 'review-uploads').
   *
   * The collection MUST already exist in the Payload config with
   * `upload: true` (or upload config object). The plugin does NOT
   * create this collection; it only references it.
   *
   * If this field is missing or the referenced collection is not found
   * at build time, media uploads are silently disabled and the plugin
   * logs a warning.
   */
  uploadCollection: string
}

// ─── Callbacks ─────────────────────────────────────────────────────────────────

export interface LfrsCallbacks {
  onReviewSubmitted?: (args: { req: PayloadRequest; review: any }) => void | Promise<void>
  onReplySubmitted?: (args: { req: PayloadRequest; reply: any }) => void | Promise<void>
  onRatingSubmitted?: (args: { req: PayloadRequest; rating: any }) => void | Promise<void>
  onReviewStateChanged?: (args: { previousStatus?: string; req: PayloadRequest; review: any }) => void | Promise<void>
  onLiked?: (args: { like: any; req: PayloadRequest }) => void | Promise<void>
  onDisliked?: (args: { dislike: any; req: PayloadRequest }) => void | Promise<void>
  onUnliked?: (args: { req: PayloadRequest; targetCollection: string; targetDoc: string }) => void | Promise<void>
  onUndisliked?: (args: { req: PayloadRequest; targetCollection: string; targetDoc: string }) => void | Promise<void>
  onReviewDeleted?: (args: { req: PayloadRequest; reviewId: string; targetCollection: string; targetDoc: string }) => void | Promise<void>
  onRatingUpdated?: (args: { rating: any; req: PayloadRequest }) => void | Promise<void>
  onShared?: (args: { req: PayloadRequest; share: any }) => void | Promise<void>
}

// ─── Plugin Config ─────────────────────────────────────────────────────────────

export interface LfrsPluginConfig {
  /**
   * Whether to generate admin controls and UI components.
   * If false, hides the settings global and skips admin views.
   * Default: true
   */
  adminControls?: boolean

  /**
   * Admin UI group name (default: 'LFRs')
   */
  adminGroup?: string

  /**
   * Map of collections to enable LFRs features on.
   * Each collection can enable a subset of features.
   */
  collections: Partial<Record<CollectionSlug, LfrsCollectionOptions>>

  /**
   * Override slugs for plugin-created collections
   */
  collectionSlugs?: {
    dislikes?: string
    favourites?: string
    likes?: string
    ratings?: string
    replies?: string
    reviews?: string
    shares?: string
  }

  /**
   * Enable the plugin (default: true).
   * When false, collections/fields are still added for DB schema consistency,
   * but endpoints, hooks, and UI components are not registered.
   */
  disabled?: boolean

  /**
   * Rating system configuration.
   * Controls max value, step increments (half-stars), and icon hints.
   * See LfrsRatingConfig for details.
   *
   * Default: 5-star, whole numbers only, star icon.
   */
  rating?: LfrsRatingConfig

  /**
   * Review media configuration.
   * Allows users to attach images/videos to their reviews.
   *
   * If omitted or if `uploadCollection` is not provided, the plugin works
   * normally but the media array field is NOT added to the reviews collection
   * and file uploads are silently skipped.
   */
  reviewMedia?: LfrsReviewMediaConfig

  /**
   * Whether reviews require moderation before being visible (default: false)
   */
  reviewModeration?: boolean

  /**
   * The slug of the users collection for auth (default: 'users')
   */
  usersCollectionSlug?: string

  /**
   * Whether users can like/dislike reviews and replies
   */
  enableReviewReactions?: boolean

  /**
   * Optional callbacks to hook into user interactions and state changes
   */
  callbacks?: LfrsCallbacks
}

// ─── Sanitized Internal Config ─────────────────────────────────────────────────

/**
 * Internal sanitized config with all defaults resolved.
 * Used internally by the plugin — not exposed to consumers.
 */
export interface SanitizedLfrsConfig {
  adminControls: boolean
  adminGroup: string
  collections: Record<string, SanitizedCollectionOptions>
  collectionSlugs: Required<NonNullable<LfrsPluginConfig['collectionSlugs']>>
  disabled: boolean
  /** Whether any collection has dislikes enabled */
  dislikesEnabled: boolean
  /** Whether media was resolved successfully */
  mediaEnabled: boolean
  rating: SanitizedRatingConfig
  /** Whether any collection has replies enabled */
  repliesEnabled: boolean
  reviewMedia: null | SanitizedReviewMediaConfig
  reviewModeration: boolean
  enableReviewReactions: boolean
  /** Whether any collection has shares enabled */
  sharesEnabled: boolean
  usersCollectionSlug: string
  callbacks?: LfrsCallbacks
}

export interface SanitizedCollectionOptions {
  dislikes: LfrsFeatureAccess
  favourites: LfrsFeatureAccess
  likes: LfrsFeatureAccess
  ratings: LfrsFeatureAccess
  replies: LfrsFeatureAccess
  reviews: LfrsFeatureAccess
  readReviews: LfrsFeatureAccess
  shares: LfrsFeatureAccess
  allowMultipleReviews: boolean
}

export interface SanitizedRatingConfig {
  icon: string
  max: number
  step: number
}

export interface SanitizedReviewMediaConfig {
  allowedMimeTypes: string[]
  maxFiles: number
  maxFileSize: number
  uploadCollection: string
}
