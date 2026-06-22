import type { Field } from 'payload'

import type { SanitizedCollectionOptions, SanitizedLfrsConfig } from '../types.js'


/**
 * Creates join fields that are injected into target collections
 * so the admin panel can show related interactions.
 *
 * Each join field creates a reverse relationship from the target
 * collection to the interaction collection.
 */
export function createJoinFields(
  _collectionSlug: string,
  _collectionOptions: SanitizedCollectionOptions,
  _config: SanitizedLfrsConfig,
): Field[] {
  // NOTE: Payload's native `join` field requires the `on` target to be a
  // `relationship` or `upload` field. Since we use `text` for `targetDoc` 
  // (to allow dynamic targets without polymorphic arrays), we cannot use 
  // native join fields.
  // Reverse relationships can be built using custom Admin UI components 
  // (Phase 7: LfrsStatusWidget / ReviewModerationView).
  return []
}
