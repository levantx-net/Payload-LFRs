import type { Config } from 'payload'

import type { SanitizedReviewMediaConfig } from '../types.js'

/**
 * Validates and resolves the reviewMedia config at build time.
 *
 * Checks that the referenced upload collection exists in the Payload config
 * and has `upload` enabled. Returns the sanitized config if valid, or null
 * if the config is invalid (with a warning logged).
 */
export function resolveReviewMedia(
  mediaConfig: null | SanitizedReviewMediaConfig,
  payloadConfig: Config,
): null | SanitizedReviewMediaConfig {
  if (!mediaConfig) {
    return null
  }

  const { uploadCollection } = mediaConfig

  // Find the collection in the Payload config
  const collection = payloadConfig.collections?.find((c) => c.slug === uploadCollection)

  if (!collection) {
    // eslint-disable-next-line no-console
    console.warn(
      `[payload-lf-rs] reviewMedia.uploadCollection "${uploadCollection}" not found in Payload config. ` +
        `Review media uploads will be disabled.`,
    )
    return null
  }

  // Check that the collection has upload enabled
  if (!collection.upload) {
    // eslint-disable-next-line no-console
    console.warn(
      `[payload-lf-rs] Collection "${uploadCollection}" does not have upload enabled. ` +
        `Review media uploads will be disabled.`,
    )
    return null
  }

  return mediaConfig
}
