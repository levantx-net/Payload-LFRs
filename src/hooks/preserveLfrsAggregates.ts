import type { CollectionBeforeChangeHook } from 'payload'

/**
 * beforeChange hook (on target collections): makes the injected `lfrs`
 * aggregate group effectively read-only at the API level.
 *
 * The group fields are marked `admin.readOnly`, but that only affects the
 * admin UI — any `update` operation (admin panel save, REST, Local API) can
 * still write or clear the group. That is one of the ways the cached
 * aggregates drift out of sync with the interaction collections (e.g. an
 * admin-panel save of a post submitting an empty/partial `lfrs` group and
 * wiping `likesCount` back to 0 while the like documents still exist).
 *
 * The plugin's own aggregate maintenance (the toggle endpoints and the
 * recalculate hooks) always updates target documents with
 * `context: { skipLfrsHooks: true }`, so this hook uses that flag as the
 * signal to let legitimate aggregate writes through. Any other update has
 * its incoming `lfrs` data discarded in favour of the stored values.
 */
export const createPreserveLfrsAggregates = (): CollectionBeforeChangeHook => {
  return ({ context, data, operation, originalDoc }) => {
    if (operation !== 'update' || !data) {
      return data
    }

    // Plugin-internal aggregate write — allow through
    if ((context as Record<string, unknown> | undefined)?.skipLfrsHooks) {
      return data
    }

    if (originalDoc?.lfrs) {
      // Preserve the stored aggregates — they are maintained exclusively by
      // the plugin's endpoints and hooks.
      data.lfrs = originalDoc.lfrs
    } else if ('lfrs' in data) {
      // Document predates the aggregate fields — strip any incoming data so
      // the group can't be set arbitrarily outside the plugin.
      delete data.lfrs
    }

    return data
  }
}
