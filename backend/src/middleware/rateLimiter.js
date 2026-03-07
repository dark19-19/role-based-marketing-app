const rateLimit = require('express-rate-limit');

// Limit to 15 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = limiter;