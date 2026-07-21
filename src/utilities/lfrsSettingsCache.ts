import type { Payload, PayloadRequest } from 'payload'

import { lfrsSettingsSlug } from '../globals/lfrsSettings.js'

let cachedSettings: any = null
let cacheTimestamp = 0
const CACHE_TTL = 1000 * 2 // 2 seconds TTL — short enough to avoid stale settings
// in multi-process deployments, but long enough to avoid hammering the DB
// when many requests arrive simultaneously.

export async function getCachedLfrsSettings(payload: Payload, req?: PayloadRequest) {
  const now = Date.now()

  // Return cached settings if still valid
  if (cachedSettings && now - cacheTimestamp < CACHE_TTL) {
    return cachedSettings
  }

  try {
    const settings = await payload.findGlobal({
      slug: lfrsSettingsSlug,
      req,
    })
    cachedSettings = settings
    cacheTimestamp = now
    return settings
  } catch (e) {
    // Global might not be created yet
    return null
  }
}

export function invalidateLfrsSettingsCache() {
  cachedSettings = null
  cacheTimestamp = 0
}
