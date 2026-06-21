import type { Access } from 'payload'

/**
 * Payload collection-level access: allows owner or admin.
 * Used for `delete` operations on interaction collections.
 *
 * - Admins (users with 'admin' role) can delete any interaction
 * - Regular users can only delete their own interactions
 */
export const isOwnerOrAdmin: Access = ({ req }) => {
  if (!req.user) {
    return false
  }

  // Check for admin role
  const user = req.user as Record<string, unknown>
  const roles = (user.roles as string[]) ?? []

  if (roles.includes('admin')) {
    return true
  }

  // Otherwise, only own interactions
  return {
    user: { equals: req.user.id },
  }
}
