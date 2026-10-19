import { z } from 'zod'

export const PRODUCT_IMAGE_BUCKET = 'product-images'
export const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024
export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export const productInputSchema = z.object({
  product_id: z.uuid(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(3000),
  price: z.string().trim().regex(/^\d{1,8}(?:\.\d{1,2})?$/).transform(Number),
  is_active: z.boolean(),
  variants: z.array(z.object({
    size: z.string().trim().max(80),
    color: z.string().trim().max(80),
    sku: z.string().trim().max(100),
    stock: z.number().int().min(0).max(2147483647),
  })).min(1).max(30),
}).superRefine((data, context) => {
  const options = new Set<string>()
  const skus = new Set<string>()
  for (const variant of data.variants) {
    const key = JSON.stringify([variant.size.toLowerCase(), variant.color.toLowerCase()])
    if (options.has(key)) context.addIssue({ code: 'custom', message: 'لا يمكن تكرار نفس المقاس واللون في أكثر من خيار.' })
    options.add(key)
    if (variant.sku && skus.has(variant.sku.toLowerCase())) context.addIssue({ code: 'custom', message: 'رمز SKU مكرر بين الخيارات.' })
    if (variant.sku) skus.add(variant.sku.toLowerCase())
  }
})
