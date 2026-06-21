import type { Access } from 'payload'

/**
 * Payload collection-level access: allows any authenticated user.
 * Used for `create` operations on interaction collections.
 */
export const isAuthenticated: Access = ({ req }) => {
  return Boolean(req.user)
}
