import { APIError, type PayloadRequest } from 'payload'

export const checkTargetDocAccess = async (
  req: PayloadRequest,
  collection: string,
  id: string,
): Promise<void> => {
  try {
    await req.payload.findByID({
      id,
      collection,
      req,
      depth: 0,
      overrideAccess: false, // Ensures read access rules run!
    })
  } catch (err: any) {
    throw new APIError('Target document not found or access denied', 404)
  }
}
