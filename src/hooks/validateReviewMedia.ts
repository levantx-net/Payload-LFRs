import type { CollectionBeforeChangeHook } from 'payload'

import { APIError } from 'payload'

import type { SanitizedReviewMediaConfig } from '../types.js'

import { matchesAnyMimeType } from '../utilities/matchMimeType.js'

/**
 * Creates a beforeChange hook that validates review media attachments.
 *
 * Checks:
 * - File count does not exceed `maxFiles`
 * - Each file's MIME type matches at least one `allowedMimeTypes` pattern
 * - Each file's size does not exceed `maxFileSize`
 *
 * Only runs if reviewMedia config is valid. Returns null if media is disabled.
 */
export function createValidateReviewMedia(
  mediaConfig: null | SanitizedReviewMediaConfig,
): CollectionBeforeChangeHook | null {
  if (!mediaConfig) {
    return null
  }

  const { allowedMimeTypes, maxFiles, maxFileSize } = mediaConfig

  return async ({ data, req }) => {
    const media = data.media as Array<{ file: string }> | undefined

    if (!media || media.length === 0) {
      return data
    }

    // Check file count
    if (media.length > maxFiles) {
      throw new APIError(`Maximum of ${maxFiles} files allowed per review`, 400)
    }

    // Validate each file
    for (const entry of media) {
      const fileId = entry.file

      // Fetch the upload doc to check mimeType and filesize
      let uploadDoc: Record<string, unknown>
      try {
        uploadDoc = (await req.payload.findByID({
          id: fileId,
          collection: mediaConfig.uploadCollection,
          depth: 0,
          req,
        })) as Record<string, unknown>
      } catch {
        throw new APIError(`Media file "${fileId}" not found in upload collection`, 400)
      }

      // Check MIME type
      const mimeType = uploadDoc.mimeType as string
      if (mimeType && !matchesAnyMimeType(mimeType, allowedMimeTypes)) {
        throw new APIError(
          `File type "${mimeType}" is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
          400,
        )
      }

      // Check file size
      const filesize = uploadDoc.filesize as number
      if (filesize && filesize > maxFileSize) {
        const maxSizeMB = (maxFileSize / (1024 * 1024)).toFixed(1)
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        const filename = uploadDoc.filename ? String(uploadDoc.filename) : String(fileId)
        throw new APIError(
          `File "${filename}" exceeds the maximum size of ${maxSizeMB} MB`,
          400,
        )
      }
    }

    return data
  }
}
