import type { Access, Where } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Access control for reading reviews and replies.
 * - Admins can read everything.
 * - If moderation is off, everyone can read everything.
 * - If moderation is on, users can read approved items, plus their own pending/rejected items.
 */
export const canReadReviews =
  (config: SanitizedLfrsConfig): Access =>
  async ({ req }) => {
    const isAdmin = await config.isAdmin({ req })
    if (isAdmin) {
      return true
    }

    if (!config.reviewModeration) {
      return true
    }

    if (req.user) {
      return {
        or: [{ status: { equals: 'approved' } }, { user: { equals: req.user.id } }],
      } as Where
    }

    return {
      status: { equals: 'approved' },
    } as Where
  }
