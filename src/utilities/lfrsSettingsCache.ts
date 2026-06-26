import type { Payload, PayloadRequest } from 'payload'

import { lfrsSettingsSlug } from '../globals/lfrsSettings.js'

let cachedSettings: any = null
let cacheTimestamp = 0
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes TTL fallback

export async function getCachedLfrsSettings(payload: Payload, req?: PayloadRequest) {
  const now = Date.now()

  // Return cached settings if valid
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
