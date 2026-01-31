/**
 * Image URL optimization utilities
 *
 * Uses Cloudflare Image Transformations to serve optimized images:
 * - Automatic format selection (WebP, AVIF)
 * - Responsive sizing
 * - Quality optimization
 *
 * Note: Requires Cloudflare Image Transformations to be enabled on the domain.
 */

export type ImageSize = 'thumbnail' | 'tile' | 'full';

const SIZE_CONFIG: Record<ImageSize, { width: number; height: number }> = {
  thumbnail: { width: 100, height: 100 },
  tile: { width: 200, height: 200 },
  full: { width: 800, height: 800 },
};

/**
 * Check if a URL is from our media domain and can be optimized
 */
function isOptimizableUrl(url: string): boolean {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    // Only optimize URLs from our media domain
    return parsed.hostname === 'media.freespeechaac.com';
  } catch {
    return false;
  }
}

/**
 * Generate an optimized image URL using Cloudflare Image Transformations
 *
 * @param url - Original image URL
 * @param size - Target size preset
 * @returns Optimized URL or original URL if not optimizable
 */
export function getOptimizedImageUrl(
  url: string,
  size: ImageSize = 'tile'
): string {
  if (!isOptimizableUrl(url)) {
    return url;
  }

  const { width, height } = SIZE_CONFIG[size];

  // Cloudflare Image Transformations URL format
  // https://developers.cloudflare.com/images/transform-images/transform-via-url/
  return `https://freespeechaac.com/cdn-cgi/image/w=${width},h=${height},fit=contain,format=auto,quality=85/${url}`;
}

/**
 * Add optimized image URLs to a tile object
 *
 * @param tile - Tile object with image property
 * @returns Tile with additional imageOptimized and imageThumbnail properties
 */
export function addOptimizedImageUrls<T extends { image: string }>(
  tile: T
): T & { imageOptimized: string; imageThumbnail: string } {
  return {
    ...tile,
    imageOptimized: getOptimizedImageUrl(tile.image, 'tile'),
    imageThumbnail: getOptimizedImageUrl(tile.image, 'thumbnail'),
  };
}

/**
 * Add optimized image URLs to an array of tiles
 */
export function addOptimizedImageUrlsToTiles<T extends { image: string }>(
  tiles: T[]
): Array<T & { imageOptimized: string; imageThumbnail: string }> {
  return tiles.map(addOptimizedImageUrls);
}
