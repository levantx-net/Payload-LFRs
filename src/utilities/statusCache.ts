/**
 * Client-side deduplication cache for `/api/lfrs/status` requests.
 *
 * Problem: Multiple components on the same page (LfrsLikeDislike, LfrsFavourite,
 * LfrsReviewsSection) each independently fetch the same status endpoint for the
 * same (collection, id) pair. When they mount simultaneously this results in N
 * identical in-flight requests instead of 1.
 *
 * Solution: A two-layer cache:
 *   1. **In-flight deduplication** — if a fetch for a key is already pending, all
 *      subsequent callers share the same Promise. Zero extra network requests.
 *   2. **Short-lived result cache** — once resolved, the data is kept for
 *      `CACHE_TTL_MS` so that components mounting slightly after the first batch
 *      still get instant data without a new request.
 *
 * This is intentionally a module-level singleton (client-only) so all components
 * in the same browser tab share it.
 */

const CACHE_TTL_MS = 5_000 // 5 seconds — enough to cover a single page render

interface CacheEntry {
  data: unknown
  expiresAt: number
}

/** Resolved results, keyed by `${apiBase}|${collection}|${id}` */
const resultCache = new Map<string, CacheEntry>()

/** Pending promises, keyed the same way */
const inflightCache = new Map<string, Promise<unknown>>()

function cacheKey(apiBase: string, collection: string, id: string): string {
  return `${apiBase}|${collection}|${id}`
}

/**
 * Fetch the LFRs status for a (collection, id) pair, deduplicating concurrent
 * calls and caching the result for `CACHE_TTL_MS` milliseconds.
 *
 * @returns The parsed JSON response, or `null` if the request failed.
 */
export async function fetchStatus(
  apiBase: string,
  collection: string,
  id: string,
): Promise<unknown> {
  const key = cacheKey(apiBase, collection, id)
  const now = Date.now()

  // 1. Return cached result if still fresh
  const cached = resultCache.get(key)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  // 2. Return the existing in-flight promise (deduplication)
  const inflight = inflightCache.get(key)
  if (inflight) {
    return inflight
  }

  // 3. Start a new request
  const promise = fetch(`${apiBase}/lfrs/status?collection=${collection}&id=${id}`)
    .then((res) => {
      if (res.ok) {
        return res.json() as Promise<unknown>
      }
      return null
    })
    .then((data) => {
      // Store in result cache and remove from in-flight map
      resultCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
      inflightCache.delete(key)
      return data
    })
    .catch(() => {
      inflightCache.delete(key)
      return null
    })

  inflightCache.set(key, promise)
  return promise
}

/**
 * Invalidate the cached status for a (collection, id) pair.
 * Call this after a mutation (like, dislike, favourite toggle) so the next
 * fetch goes to the network.
 */
export function invalidateStatus(apiBase: string, collection: string, id: string): void {
  const key = cacheKey(apiBase, collection, id)
  resultCache.delete(key)
  // Note: we leave any in-flight promise alone — it will naturally expire.
}
