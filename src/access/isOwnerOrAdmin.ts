import type { Access } from 'payload'
import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Payload collection-level access: allows owner or admin.
 * Used for `delete` operations on interaction collections.
 *
 * - Admins (defined via config.isAdmin) can delete any interaction
 * - Regular users can only delete their own interactions
 */
export const isOwnerOrAdmin = (config: SanitizedLfrsConfig): Access => async ({ req }) => {
  if (!req.user) {
    return false
  }

  // Check for admin role via config callback
  const isAdmin = await config.isAdmin({ req })

  if (isAdmin) {
    return true
  }

  // Otherwise, only own interactions
  return {
    user: { equals: req.user.id },
  }
}
