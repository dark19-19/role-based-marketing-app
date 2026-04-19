const cacheAside = require('./CacheAside');

function normalizeQuery(query = {}) {
  const sortedKeys = Object.keys(query).sort();
  const normalized = {};

  for (const key of sortedKeys) {
    normalized[key] = query[key];
  }

  return normalized;
}

function defaultKeyBuilder(req, namespace) {
  const normalizedQuery = normalizeQuery(req.query);
  return `${namespace}:${req.path}:${JSON.stringify(normalizedQuery)}`;
}

function createCacheAsideMiddleware({
  namespace,
  ttlSeconds,
  buildKey = defaultKeyBuilder,
}) {
  if (!namespace) {
    throw new Error('cache namespace is required');
  }

  return (req, res, next) => {
    const key = buildKey(req, namespace);
    const cachedResponse = cacheAside.getCached(key);

    if (cachedResponse !== null) {
      return res.json(cachedResponse);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheAside.set(key, body, ttlSeconds);
      }
      return originalJson(body);
    };

    return next();
  };
}

module.exports = {
  createCacheAsideMiddleware,
};

