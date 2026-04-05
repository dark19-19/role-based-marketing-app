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

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: requiredEnv('DATABASE_URL'),
  jwtSecret: requiredEnv('JWT_SECRET'),
  encryptionKey: parseEncryptionKey(),
  notificationsCleanupHour: parseNotificationCleanupHour(),
  notificationsMaxCount: parseNotificationMaxCount(),
  notificationsHardDeleteAfterDays: parseNotificationsHardDeleteAfterDays(),
};

module.exports = config;

