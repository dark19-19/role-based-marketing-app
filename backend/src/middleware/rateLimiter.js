const rateLimit = require('express-rate-limit');

// Limit to 100 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // زيادة الحد لتجنب مشاكل 429 في التطبيق
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiter;