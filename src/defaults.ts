import type {
  LfrsCollectionOptions,
  LfrsPluginConfig,
  LfrsReviewMediaConfig,
  SanitizedCollectionOptions,
  SanitizedLfrsConfig,
  SanitizedRatingConfig,
  SanitizedReviewMediaConfig,
} from './types.js'

// ─── Default Values ────────────────────────────────────────────────────────────

export const DEFAULT_RATING_MAX = 5
export const DEFAULT_RATING_STEP = 1
export const DEFAULT_RATING_ICON = 'star'

export const DEFAULT_REVIEW_MEDIA_MAX_FILES = 5
export const DEFAULT_REVIEW_MEDIA_ALLOWED_MIME_TYPES = ['image/*']
export const DEFAULT_REVIEW_MEDIA_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export const DEFAULT_ADMIN_GROUP = 'LFRs'
export const DEFAULT_USERS_COLLECTION_SLUG = 'users'

export const DEFAULT_COLLECTION_SLUGS = {
  dislikes: 'lfrs-dislikes',
  favourites: 'lfrs-favourites',
  likes: 'lfrs-likes',
  ratings: 'lfrs-ratings',
  replies: 'lfrs-replies',
  reviews: 'lfrs-reviews',
} as const

// ─── Sanitization ──────────────────────────────────────────────────────────────

/**
 * Sanitizes the rating config, filling in defaults and validating constraints.
 */
export function sanitizeRatingConfig(input?: LfrsPluginConfig['rating']): SanitizedRatingConfig {
  const max = input?.max ?? DEFAULT_RATING_MAX
  const step = input?.step ?? DEFAULT_RATING_STEP
  const icon = input?.icon ?? DEFAULT_RATING_ICON

  // Validation
  if (max <= 0) {
    throw new Error(`[payload-lf-rs] rating.max must be > 0, got ${max}`)
  }

  if (step <= 0 || step > max) {
    throw new Error(`[payload-lf-rs] rating.step must be > 0 and <= max (${max}), got ${step}`)
  }

  // Ensure max is evenly divisible by step (with float tolerance)
  const remainder = max % step
  if (Math.abs(remainder) > 1e-9 && Math.abs(remainder - step) > 1e-9) {
    throw new Error(
      `[payload-lf-rs] rating.max (${max}) must be evenly divisible by rating.step (${step})`,
    )
  }

  return { icon, max, step }
}

/**
 * Sanitizes the review media config, filling in defaults.
 * Returns null if the config is not provided or uploadCollection is empty.
 * Actual upload collection existence validation happens later in plugin.ts
 * when we have access to the full Payload config.
 */
export function sanitizeReviewMediaConfig(
  input?: LfrsReviewMediaConfig,
): SanitizedReviewMediaConfig | null {
  if (!input || !input.uploadCollection) {
    return null
  }

  return {
    allowedMimeTypes: input.allowedMimeTypes ?? DEFAULT_REVIEW_MEDIA_ALLOWED_MIME_TYPES,
    maxFileSize: input.maxFileSize ?? DEFAULT_REVIEW_MEDIA_MAX_FILE_SIZE,
    maxFiles: input.maxFiles ?? DEFAULT_REVIEW_MEDIA_MAX_FILES,
    uploadCollection: input.uploadCollection,
  }
}

/**
 * Sanitizes a single collection's options, filling in defaults.
 */
export function sanitizeCollectionOptions(input: LfrsCollectionOptions): SanitizedCollectionOptions {
  return {
    dislikes: input.dislikes ?? false,
    favourites: input.favourites ?? true,
    likes: input.likes ?? true,
    ratings: input.ratings ?? true,
    replies: input.replies ?? true,
    reviews: input.reviews ?? true,
  }
}

/**
 * Returns true if a feature access value means the feature is enabled
 * (i.e. anything other than `false`).
 */
export function isFeatureEnabled(access: boolean | string[] | Function): boolean {
  return access !== false
}

/**
 * Sanitizes the entire plugin config, filling in all defaults.
 * This is called once during plugin initialization.
 */
export function sanitizePluginConfig(input: LfrsPluginConfig): SanitizedLfrsConfig {
  const rating = sanitizeRatingConfig(input.rating)
  const reviewMedia = sanitizeReviewMediaConfig(input.reviewMedia)

  const collectionSlugs = {
    dislikes: input.collectionSlugs?.dislikes ?? DEFAULT_COLLECTION_SLUGS.dislikes,
    favourites: input.collectionSlugs?.favourites ?? DEFAULT_COLLECTION_SLUGS.favourites,
    likes: input.collectionSlugs?.likes ?? DEFAULT_COLLECTION_SLUGS.likes,
    ratings: input.collectionSlugs?.ratings ?? DEFAULT_COLLECTION_SLUGS.ratings,
    replies: input.collectionSlugs?.replies ?? DEFAULT_COLLECTION_SLUGS.replies,
    reviews: input.collectionSlugs?.reviews ?? DEFAULT_COLLECTION_SLUGS.reviews,
  }

  // Sanitize each collection's options
  const collections: Record<string, SanitizedCollectionOptions> = {}
  for (const [slug, options] of Object.entries(input.collections)) {
    if (options) {
      collections[slug] = sanitizeCollectionOptions(options)
    }
  }

  // Check if any collection has dislikes or replies enabled
  const dislikesEnabled = Object.values(collections).some((c) => isFeatureEnabled(c.dislikes))
  const repliesEnabled = Object.values(collections).some((c) => isFeatureEnabled(c.replies))

  return {
    adminGroup: input.adminGroup ?? DEFAULT_ADMIN_GROUP,
    collections,
    collectionSlugs,
    disabled: input.disabled ?? false,
    dislikesEnabled,
    mediaEnabled: reviewMedia !== null,
    rating,
    repliesEnabled,
    reviewMedia,
    reviewModeration: input.reviewModeration ?? false,
    usersCollectionSlug: input.usersCollectionSlug ?? DEFAULT_USERS_COLLECTION_SLUG,
  }
}
