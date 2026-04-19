class CacheAside {
  constructor() {
    this.cache = new Map();
  }

  _isFresh(cachedItem) {
    return cachedItem && cachedItem.expiry > Date.now();
  }

  getCached(key) {
    const cachedItem = this.cache.get(key);

    if (this._isFresh(cachedItem)) {
      return cachedItem.data;
    }

    if (cachedItem) {
      this.cache.delete(key);
    }

    return null;
  }

  set(key, data, ttlSeconds) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { data, expiry });
    return data;
  }

  /**
   * Get data from cache or fetch it using the provider function
   * @param {string} key - Unique key for the cache item
   * @param {number} ttlSeconds - Time to live in seconds
   * @param {Function} fetchFunction - Async function to fetch data if cache miss
   * @returns {Promise<any>} The data
   */
  async get(key, ttlSeconds, fetchFunction) {
    const cachedData = this.getCached(key);
    if (cachedData !== null) {
      return cachedData;
    }

    const data = await fetchFunction();
    return this.set(key, data, ttlSeconds);
  }

  /**
   * Invalidate a specific cache key
   * @param {string} key
   */
  invalidate(key) {
    this.cache.delete(key);
  }

  invalidateByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
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
