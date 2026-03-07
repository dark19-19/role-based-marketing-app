class CacheAside {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get data from cache or fetch it using the provider function
   * @param {string} key - Unique key for the cache item
   * @param {number} ttlSeconds - Time to live in seconds
   * @param {Function} fetchFunction - Async function to fetch data if cache miss
   * @returns {Promise<any>} The data
   */
  async get(key, ttlSeconds, fetchFunction) {
    const cachedItem = this.cache.get(key);
    const now = Date.now();

    if (cachedItem) {
      if (cachedItem.expiry > now) {
        return cachedItem.data;
      } else {
        this.cache.delete(key);
      }
    }

    const data = await fetchFunction();
    const expiry = now + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });

    return data;
  }

  /**
   * Invalidate a specific cache key
   * @param {string} key
   */
  invalidate(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }
}

// Export as a singleton
module.exports = new CacheAside();