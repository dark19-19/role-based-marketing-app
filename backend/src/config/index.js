const dotenv = require('dotenv');
dotenv.config();

function requiredEnv(name) {
  const val = process.env[name];
  if (!val || val.trim() === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return val;
}

function optionalEnv(name, defaultValue) {
  const val = process.env[name];
  if (val === undefined || val === null || String(val).trim() === '') {
    return defaultValue;
  }
  return String(val);
}

function parseEncryptionKey() {
  const keyRaw = requiredEnv('ENCRYPTION_KEY');
  // Try base64 first, then hex, else treat as utf8 and pad/truncate
  let key;
  try {
    key = Buffer.from(keyRaw, 'base64');
  } catch (_) {}
  if (!key || key.length === 0) {
    try {
      key = Buffer.from(keyRaw, 'hex');
    } catch (_) {}
  }
  if (!key || key.length === 0) {
    key = Buffer.from(keyRaw, 'utf8');
  }
  if (key.length < 32) {
    const padded = Buffer.alloc(32);
    key.copy(padded);
    key = padded;
  }
  if (key.length > 32) {
    key = key.subarray(0, 32);
  }
  return key;
}

function parseNumberEnv(name) {
  const raw = requiredEnv(name);
  const n = Number(raw);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid numeric env var ${name}: ${raw}`);
  }
  return n;
}

function parseOptionalIntEnv(name, defaultValue) {
  const raw = optionalEnv(name, String(defaultValue));
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid numeric env var ${name}: ${raw}`);
  }
  return n;
}

function parseNotificationCleanupHour() {
  const hour = parseOptionalIntEnv('NOTIFICATIONS_CLEANUP_HOUR', 3);
  if (hour < 0 || hour > 23) {
    throw new Error(`Invalid NOTIFICATIONS_CLEANUP_HOUR: ${hour} (expected 0-23)`);
  }
  return hour;
}

function parseNotificationMaxCount() {
  const limit = parseOptionalIntEnv('NOTIFICATIONS_MAX_COUNT', 1000);
  if (limit < 1) {
    throw new Error(`Invalid NOTIFICATIONS_MAX_COUNT: ${limit} (expected >= 1)`);
  }
  return limit;
}

function parseNotificationsHardDeleteAfterDays() {
  const days = parseOptionalIntEnv('NOTIFICATIONS_HARD_DELETE_AFTER_DAYS', 7);
  if (days < 1) {
    throw new Error(`Invalid NOTIFICATIONS_HARD_DELETE_AFTER_DAYS: ${days} (expected >= 1)`);
  }
  return days;
}

function parseProductsListCacheTtlSeconds() {
  const ttl = parseOptionalIntEnv('PRODUCTS_LIST_CACHE_TTL_SECONDS', 600);
  if (ttl < 1) {
    throw new Error(`Invalid PRODUCTS_LIST_CACHE_TTL_SECONDS: ${ttl} (expected >= 1)`);
  }
  return ttl;
}

function parseServerHardening() {
  const headersTimeoutMs = parseOptionalIntEnv('SERVER_HEADERS_TIMEOUT_MS', 6000);
  const requestTimeoutMs = parseOptionalIntEnv('SERVER_REQUEST_TIMEOUT_MS', 30000);
  const keepAliveTimeoutMs = parseOptionalIntEnv('SERVER_KEEP_ALIVE_TIMEOUT_MS', 5000);
  const maxConnections = parseOptionalIntEnv('SERVER_MAX_CONNECTIONS', 10000);
  const maxHeadersCount = parseOptionalIntEnv('SERVER_MAX_HEADERS_COUNT', 200);
  const maxConcurrentConnectionsPerIp = parseOptionalIntEnv('SERVER_MAX_CONCURRENT_CONNECTIONS_PER_IP', 10);
  const connectionWindowMs = parseOptionalIntEnv('SERVER_CONNECTION_WINDOW_MS', 10000);
  const maxConnectionsPerIpWindow = parseOptionalIntEnv('SERVER_MAX_CONNECTIONS_PER_IP_WINDOW', 10);
  const socketIdleTimeoutMs = parseOptionalIntEnv('SERVER_SOCKET_IDLE_TIMEOUT_MS', 8000);
  const slowMinBytes = parseOptionalIntEnv('SERVER_SLOW_MIN_BYTES', 500);
  const slowPartialIdleMs = parseOptionalIntEnv('SERVER_SLOW_PARTIAL_IDLE_MS', 3000);
  const slowNoDataIdleMs = parseOptionalIntEnv('SERVER_SLOW_NO_DATA_IDLE_MS', 4000);
  const slowCheckIntervalMs = parseOptionalIntEnv('SERVER_SLOW_CHECK_INTERVAL_MS', 1000);
  const cleanupIntervalMs = parseOptionalIntEnv('SERVER_CONNECTION_TRACKING_CLEANUP_INTERVAL_MS', 30000);

  const mustBePositive = [
    ['SERVER_HEADERS_TIMEOUT_MS', headersTimeoutMs],
    ['SERVER_REQUEST_TIMEOUT_MS', requestTimeoutMs],
    ['SERVER_KEEP_ALIVE_TIMEOUT_MS', keepAliveTimeoutMs],
    ['SERVER_MAX_CONNECTIONS', maxConnections],
    ['SERVER_MAX_HEADERS_COUNT', maxHeadersCount],
    ['SERVER_MAX_CONCURRENT_CONNECTIONS_PER_IP', maxConcurrentConnectionsPerIp],
    ['SERVER_CONNECTION_WINDOW_MS', connectionWindowMs],
    ['SERVER_MAX_CONNECTIONS_PER_IP_WINDOW', maxConnectionsPerIpWindow],
    ['SERVER_SOCKET_IDLE_TIMEOUT_MS', socketIdleTimeoutMs],
    ['SERVER_SLOW_MIN_BYTES', slowMinBytes],
    ['SERVER_SLOW_PARTIAL_IDLE_MS', slowPartialIdleMs],
    ['SERVER_SLOW_NO_DATA_IDLE_MS', slowNoDataIdleMs],
    ['SERVER_SLOW_CHECK_INTERVAL_MS', slowCheckIntervalMs],
    ['SERVER_CONNECTION_TRACKING_CLEANUP_INTERVAL_MS', cleanupIntervalMs],
  ];

  for (const [name, value] of mustBePositive) {
    if (value < 1) {
      throw new Error(`Invalid ${name}: ${value} (expected >= 1)`);
    }
  }

  return {
    headersTimeoutMs,
    requestTimeoutMs,
    keepAliveTimeoutMs,
    maxConnections,
    maxHeadersCount,
    maxConcurrentConnectionsPerIp,
    connectionWindowMs,
    maxConnectionsPerIpWindow,
    socketIdleTimeoutMs,
    slowMinBytes,
    slowPartialIdleMs,
    slowNoDataIdleMs,
    slowCheckIntervalMs,
    cleanupIntervalMs,
  };
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: requiredEnv('DATABASE_URL'),
  jwtSecret: requiredEnv('JWT_SECRET'),
  encryptionKey: parseEncryptionKey(),
  notificationsCleanupHour: parseNotificationCleanupHour(),
  notificationsMaxCount: parseNotificationMaxCount(),
  notificationsHardDeleteAfterDays: parseNotificationsHardDeleteAfterDays(),
  productsListCacheTtlSeconds: parseProductsListCacheTtlSeconds(),
  serverHardening: parseServerHardening(),
  admin1Phone: requiredEnv('ADMIN_1_PHONE'),
  admin1Password: requiredEnv('ADMIN_1_PASSWORD'),
  admin2Phone: requiredEnv('ADMIN_2_PHONE'),
  admin2Password: requiredEnv('ADMIN_2_PASSWORD'),
  admin3Phone: optionalEnv('ADMIN_3_PHONE', ''),
  admin3Password: optionalEnv('ADMIN_3_PASSWORD', ''),
  admin4Phone: optionalEnv('ADMIN_4_PHONE', ''),
  admin4Password: optionalEnv('ADMIN_4_PASSWORD', ''),
  admin5Phone: optionalEnv('ADMIN_5_PHONE', ''),
  admin5Password: optionalEnv('ADMIN_5_PASSWORD', ''),
};

module.exports = config;

