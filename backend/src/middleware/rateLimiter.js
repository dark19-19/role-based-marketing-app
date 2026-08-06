// const rateLimit = require('express-rate-limit');
//
// const limiter = rateLimit({
//   windowMs: 60 * 1000,
//   max: 5000, // Explicitly bump this up to a massive ceiling for stress testing
//   standardHeaders: true,
//   legacyHeaders: false,
//
//   // Hard-override the key generator to ignore standard req.ip
//   keyGenerator: (req, res) => {
//     return req.clientIp // IP address from requestIp.mw(), as opposed to req.ip
//   },
//   message : "نواجه الكثير من الطلبات , الرجاء التمهل و المحاولة بعد بضع لحظات - 429"
// });
//
// module.exports = limiter;


const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5000, // Explicitly bump this up to a massive ceiling for stress testing
  standardHeaders: true,
  legacyHeaders: false,
  message : "نواجه الكثير من الطلبات , الرجاء التمهل و المحاولة بعد بضع لحظات - 429",

  // Hard-override the key generator to ignore standard req.ip
  keyGenerator: (req) => {
    // 1. Check for Cloudflare's direct client header (used by Railway's edge)
    if (req.headers['cf-connecting-ip']) {
      return req.headers['cf-connecting-ip'];
    }
    // 2. Check X-Forwarded-For and grab the very first IP in the comma-separated chain
    if (req.headers['x-forwarded-for']) {
      return req.headers['x-forwarded-for'].split(',')[0].trim();
    }
    // 3. Fallback to standard IP tracking
    return req.ip || req.socket.remoteAddress;
  }
});

module.exports = limiter;
