// Curated photos for the home page's arc gallery, served from
// public/home/gallery/. Empty until the owner adds real photos there -
// ArcGallerySection falls back to the published trip gallery when this is
// empty, and hides the photo
// arc entirely if fewer than 3 photos are available from either source.
export type HomeGalleryPhoto = {
  src: string
  alt: string
}

export const homeGalleryPhotos: HomeGalleryPhoto[] = []
