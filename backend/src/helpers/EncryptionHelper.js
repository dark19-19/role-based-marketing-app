const crypto = require('crypto');
const config = require('../config');

function encrypt(plainText) {
  const iv = crypto.randomBytes(12); // GCM IV length
  const cipher = crypto.createCipheriv('aes-256-gcm', config.encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:data (base64)
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

module.exports = { encrypt };