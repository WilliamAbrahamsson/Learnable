export const DEFAULT_TEXT_TITLE = 'New Concept';
export const DEFAULT_TEXT_DESCRIPTION = 'Add notes or connections here.';

/**
 * Hardcoded default image (CORS-friendly placeholder from Wikimedia).
 * Using an external image instead of the previous vendor logo avoids CORS issues
 * with Fabric when running locally.
 */
export const DEFAULT_IMAGE_URL =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/640px-Placeholder_view_vector.svg.png';

/**
 * Tiny transparent PNG data URI as a last-resort fallback.
 * Ensures an <img> can always be created even if network fails.
 */
export const FALLBACK_IMAGE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO4L8i0AAAAASUVORK5CYII=';
