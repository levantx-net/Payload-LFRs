import type { CollectionBeforeChangeHook } from 'payload'

/**
 * beforeChange hook: auto-sets the `user` field to `req.user.id` on create.
 *
 * This prevents spoofing — the user field is always set server-side
 * from the authenticated request, not from the client payload.
 */
export const enforceUser: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation === 'create') {
    if (req.user) {
      data.user = req.user.id
    }
  }
  return data
}
