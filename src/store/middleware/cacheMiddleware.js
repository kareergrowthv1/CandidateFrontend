/**
 * Cache middleware for Redux actions
 * Simple in-memory cache implementation
 */

const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached response
 * @param {string} key - Cache key
 * @returns {any|null} Cached data or null
 */
export const getCachedResponse = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * Set cached response
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export const setCachedResponse = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Clear cache by pattern
 * @param {string} pattern - Pattern to match keys
 */
export const clearCacheByPattern = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

/**
 * Clear all cache
 */
export const clearAllCache = () => {
  cache.clear();
};

export default {
  getCachedResponse,
  setCachedResponse,
  clearCacheByPattern,
  clearAllCache
};
