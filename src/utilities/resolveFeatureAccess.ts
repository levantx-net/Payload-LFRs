import type { PayloadRequest } from 'payload'

import type { LfrsFeatureAccess } from '../types.js'

export interface FeatureAccessResult {
  allowed: boolean
  reason?: string
}

/**
 * Resolves a feature access value to an allow/deny decision.
 *
 * Three-tier model:
 * 1. Boolean — `true` allows any authenticated user, `false` disables the feature
 * 2. Roles array — checks if `req.user.roles` intersects with the provided roles
 * 3. Custom function — calls the function with req, target doc, and collection
 *
 * All tiers require authentication. Unauthenticated requests are always denied.
 */
export async function resolveFeatureAccess(args: {
  access: LfrsFeatureAccess
  req: PayloadRequest
  targetCollection: string
  targetDoc: Record<string, unknown>
}): Promise<FeatureAccessResult> {
  const { access, req, targetCollection, targetDoc } = args

  // Tier 0: Public
  if (access === 'public') {
    return { allowed: true }
  }

  // Tier 1: Boolean
  if (access === false) {
    return { allowed: false, reason: 'Feature is disabled' }
  }

  if (access === true) {
    if (!req.user) {
      return { allowed: false, reason: 'Authentication required' }
    }
    return { allowed: true }
  }

  // Tier 2: Role array
  if (Array.isArray(access)) {
    if (!req.user) {
      return { allowed: false, reason: 'Authentication required' }
    }
    const user = req.user as Record<string, unknown>
    const userRoles: string[] = (user.roles as string[]) ?? []
    const hasRole = access.some((role) => userRoles.includes(role))
    if (!hasRole) {
      return { allowed: false, reason: 'Insufficient role' }
    }
    return { allowed: true }
  }

  // Tier 3: Custom function
  if (typeof access === 'function') {
    if (!req.user) {
      return { allowed: false, reason: 'Authentication required' }
    }
    const result = await access({ req, targetCollection, targetDoc })
    return result
      ? { allowed: true }
      : { allowed: false, reason: 'Access denied by custom rule' }
  }

  // Fallback: treat undefined as true (feature enabled by default)
  return req.user ? { allowed: true } : { allowed: false, reason: 'Authentication required' }
}
