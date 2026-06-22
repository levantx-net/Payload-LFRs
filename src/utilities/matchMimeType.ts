/**
 * Matches a MIME type string against a glob-style pattern.
 *
 * Supports wildcard patterns like:
 * - `image/*`   → matches `image/jpeg`, `image/png`, etc.
 * - `video/*`   → matches `video/mp4`, `video/webm`, etc.
 * - `image/png` → matches only `image/png` (exact match)
 * - `*\/*`      → matches everything
 *
 * @param mimeType - The actual MIME type to check (e.g. `'image/jpeg'`)
 * @param pattern  - The glob pattern to match against (e.g. `'image/*'`)
 * @returns `true` if the MIME type matches the pattern
 */
export function matchMimeType(mimeType: string, pattern: string): boolean {
  // Exact match
  if (pattern === mimeType) {
    return true
  }

  // Wildcard match (e.g. 'image/*')
  if (pattern.endsWith('/*')) {
    const patternType = pattern.slice(0, -2) // 'image'
    const mimeMainType = mimeType.split('/')[0] // 'image' from 'image/jpeg'
    return patternType === mimeMainType
  }

  // Catch-all wildcard
  if (pattern === '*/*') {
    return true
  }

  return false
}

/**
 * Checks if a MIME type matches any of the allowed patterns.
 *
 * @param mimeType - The actual MIME type to check
 * @param allowedPatterns - Array of glob-style MIME patterns
 * @returns `true` if the MIME type matches at least one pattern
 */
export function matchesAnyMimeType(mimeType: string, allowedPatterns: string[]): boolean {
  return allowedPatterns.some((pattern) => matchMimeType(mimeType, pattern))
}
