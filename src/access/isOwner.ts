import type { Access } from 'payload'

/**
 * Payload collection-level access: allows only the owner of the interaction.
 * Used for `update` operations on interaction collections (ratings, reviews).
 *
 * Returns a query constraint so only the owner's documents match.
 */
export const isOwner: Access = ({ req }) => {
  if (!req.user) {
    return false
  }

  return {
    user: { equals: req.user.id },
  }
}
