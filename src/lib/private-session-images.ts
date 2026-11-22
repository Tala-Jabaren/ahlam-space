export const PRIVATE_SESSION_IMAGE_PREFIX = 'private-sessions'
export const DEFAULT_PRIVATE_SESSION_IMAGE = '/images/about2.png'

const uploadedImagePattern = /^private-sessions\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/

export function isUploadedPrivateSessionImage(path: string) {
  return uploadedImagePattern.test(path)
}

export function privateSessionImageSrc(image: string) {
  if (isUploadedPrivateSessionImage(image)) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
    return url ? `${url}/storage/v1/object/public/product-images/${image}` : DEFAULT_PRIVATE_SESSION_IMAGE
  }
  return image
}
