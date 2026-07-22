import type { Access } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

/**
 * Payload access control function: checks if current user is an admin
 * using the plugin's configured `isAdmin` function.
 */
export const isAdmin =
  (config: SanitizedLfrsConfig): Access =>
  async ({ req }) => {
    if (!req.user) {
      return false
    }

    return await config.isAdmin({ req })
  }
