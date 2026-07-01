import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'

import type { SanitizedLfrsConfig } from '../types.js'

import { getEnabledFeatures } from '../utilities/getEnabledFeatures.js'
import { resolveFeatureAccess } from '../utilities/resolveFeatureAccess.js'

/**
 * POST /api/lfrs/share
 *
 * Records a share event for a target document.
 *
 * Body:
 * - collection: string   — slug of the target collection
 * - id: string           — ID of the target document
 * - platform: string     — sharing platform ('facebook'|'twitter'|'whatsapp'|'telegram'|'linkedin'|'web'|'other')
 * - url?: string         — the URL being shared (optional, for analytics)
 *
 * Unlike likes/favourites, shares are append-only (no toggle).
 * Returns: { sharesCount: number }
 */

const VALID_PLATFORMS = ['facebook', 'twitter', 'whatsapp', 'telegram', 'linkedin', 'web', 'other'] as const

export const createShareEndpoint = (sanitized: SanitizedLfrsConfig): PayloadHandler => {
  return async (req: PayloadRequest) => {
    try {
      const body = req.json ? await req.json() : req.body
      const { id, collection, platform, url } = body || {}

      // ── Validate required params ───────────────────────────────────────────
      if (!collection || !id) {
        throw new APIError('Missing collection or id', 400)
      }

      if (!platform) {
        throw new APIError('Missing platform', 400)
      }

      if (!VALID_PLATFORMS.includes(platform)) {
        throw new APIError(
          `Invalid platform "${platform}". Must be one of: ${VALID_PLATFORMS.join(', ')}`,
          400,
        )
      }

      // ── Check collection is LFRs-enabled ──────────────────────────────────
      const collectionOptions = sanitized.collections[collection]
      if (!collectionOptions) {
        throw new APIError('LFRs is not enabled for this collection', 404)
      }

      // ── Check shares feature is enabled (plugin config + admin override) ──
      const enabledFeatures = await getEnabledFeatures(collectionOptions, collection, req)
      if (!enabledFeatures.has('shares')) {
        throw new APIError('Shares are not enabled for this collection', 404)
      }

      // ── Fetch target document (validates it exists) ────────────────────────
      let targetDoc: any
      try {
        targetDoc = await req.payload.findByID({
          id,
          collection,
          overrideAccess: true,
          req,
        })
      } catch (_e) {
        throw new APIError('Target document not found', 404)
      }

      // ── Access control ────────────────────────────────────────────────────
      const accessResult = await resolveFeatureAccess({
        access: collectionOptions.shares,
        req,
        targetCollection: collection,
        targetDoc,
      })

      if (!accessResult.allowed) {
        const status = accessResult.reason === 'Authentication required' ? 401 : 403
        throw new APIError(accessResult.reason || 'Forbidden', status)
      }

      // ── Create the share record ───────────────────────────────────────────
      // Shares are append-only events — no uniqueness check, no toggle.
      // We suppress hook-based recalculation and handle it directly below.
      const mutationContext = { skipLfrsHooks: true }

      const shareDoc = await req.payload.create({
        collection: sanitized.collectionSlugs.shares,
        context: mutationContext,
        data: {
          // user can be null for 'public' access (guest shares)
          ...(req.user?.id ? { user: req.user.id } : {}),
          targetCollection: collection,
          targetDoc: id,
          platform,
          ...(url ? { url } : {}),
        },
        overrideAccess: true,
        req,
      })

      // ── Update aggregate count directly (source of truth) ─────────────────
      const { totalDocs: sharesCount } = await req.payload.count({
        collection: sanitized.collectionSlugs.shares,
        overrideAccess: true,
        req,
        where: {
          and: [
            { targetCollection: { equals: collection } },
            { targetDoc: { equals: id } },
          ],
        },
      })

      await req.payload.update({
        id,
        collection,
        context: { skipLfrsHooks: true },
        data: { lfrs: { sharesCount } },
        overrideAccess: true,
        req,
      })

      // ── Optional callback ─────────────────────────────────────────────────
      if (sanitized.callbacks?.onShared) {
        await sanitized.callbacks.onShared({ req, share: shareDoc })
      }

      return Response.json({ sharesCount })
    } catch (err: any) {
      const status = err.status || 500
      return Response.json({ error: err.message || 'Internal Server Error' }, { status })
    }
  }
}
