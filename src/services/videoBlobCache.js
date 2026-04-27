// videoBlobCache.js — Video caching with native ExoPlayer backend
//
// Architecture (Instagram-style):
// 1. Native layer: VideoCachePlugin (Java) uses ExoPlayer's SimpleCache
//    with LRU eviction (500MB max). Serves videos via local HTTP proxy
//    (http://127.0.0.1:{port}/proxy?url=...).
// 2. JS layer: This module calls the native plugin to get proxy URLs.
//    The <video> tag src points to the proxy URL which is cached on disk.
//
// Key behaviors:
// - First play: streams from network, simultaneously writes to disk cache
// - Subsequent plays: reads from disk cache instantly (no network)
// - Cache eviction: LRU — oldest accessed videos deleted when cache exceeds 500MB
// - Preloading: preCache() downloads in background for smooth scroll playback
//
// Memory safety:
// - Videos are served as streams, not loaded into JS heap
// - Cache is on-disk, not in memory
// - WebView's <video> tag handles decoding natively via the proxy

import { registerPlugin } from "../capacitor-core-shim.js";

// Register the native VideoCache plugin
const VideoCacheNative = registerPlugin("VideoCache");

// ── Fallback: If native plugin is not available, use basic passthrough ────────
let nativeAvailable = true;
try {
  // Test if plugin is available (will throw in browser/dev mode)
  if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
    nativeAvailable = false;
  }
} catch {
  nativeAvailable = false;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the best available URL for a video — NEVER blocks.
 *
 * If native ExoPlayer cache is available:
 *   Returns http://127.0.0.1:{port}/proxy?url={original} which serves
 *   from disk cache if available, or streams+ caches from network.
 *
 * If native plugin is not available (browser/dev):
 *   Returns the original URL as-is.
 *
 * @param {string} url - The original video URL
 * @returns {Promise<string>} - URL to use for <video> src
 */
export async function resolveVideoUrl(url) {
  if (!url) return null;

  // Already a local reference — nothing to resolve
  if (url.startsWith("blob:") || url.startsWith("data:")) return url;
  if (url.includes("127.0.0.1")) return url; // already proxied

  if (!nativeAvailable) {
    return url; // Fallback: no caching in browser
  }

  try {
    const result = await VideoCacheNative.getProxyUrl({ url });
    if (result && result.proxyUrl) {
      return result.proxyUrl;
    }
  } catch (e) {
    console.warn("[VideoCache] getProxyUrl failed, using original URL:", e.message);
  }

  return url;
}

/**
 * Preload a video in the background for smooth playback when scrolled to.
 * Downloads the first few megabytes via ExoPlayer's CacheDataSource.
 * Fire-and-forget — does not block the caller.
 *
 * @param {string} url - The video URL to preload
 */
export function preCacheVideo(url) {
  if (!url || !nativeAvailable) return;
  if (url.startsWith("blob:") || url.startsWith("data:")) return;

  VideoCacheNative.preCache({ url }).catch(() => {
    // Silently ignore — preloading is best-effort
  });
}

/**
 * Check if a video is cached locally on disk.
 * @param {string} url - The video URL to check
 * @returns {Promise<boolean>}
 */
export async function isVideoCached(url) {
  if (!url || !nativeAvailable) return false;
  try {
    const result = await VideoCacheNative.isCached({ url });
    return result && result.cached;
  } catch {
    return false;
  }
}

/**
 * Get cache usage statistics.
 * @returns {Promise<{cacheAvailable, cacheSizeMB, maxCacheMB, proxyPort}>}
 */
export async function getVideoCacheStats() {
  if (!nativeAvailable) {
    return { cacheAvailable: false, cacheSizeMB: 0, maxCacheMB: 0, proxyPort: 0 };
  }
  try {
    return await VideoCacheNative.getCacheStats();
  } catch {
    return { cacheAvailable: false, cacheSizeMB: 0, maxCacheMB: 0, proxyPort: 0 };
  }
}

/**
 * Clear all cached video data from disk.
 */
export async function clearVideoCache() {
  if (!nativeAvailable) return;
  try {
    await VideoCacheNative.clearCache();
  } catch {
    // Ignore
  }
}
