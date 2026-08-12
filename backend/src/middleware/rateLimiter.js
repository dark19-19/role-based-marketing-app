const rateLimit = require('express-rate-limit');

// Enhanced IP extraction function
function getClientIp(req) {
  // Debug logging
 // console.log('\n--- DEBUG INCOMING REQUEST ---');

  // 1. Check for Cloudflare's direct client header
  if (req.headers['cf-connecting-ip']) {
  //  console.log(`Using CF-Connecting-IP: ${ip}`);
    return req.headers['cf-connecting-ip'];
  }

  // 2. Check X-Forwarded-For and grab the FIRST IP (actual client)
  if (req.headers['x-forwarded-for']) {
    const forwardedIps = req.headers['x-forwarded-for'].split(',');
    // console.log(`X-Forwarded-For header: ${req.headers['x-forwarded-for']}`);
    // console.log(`Extracted client IP (first in chain): ${clientIp}`);
    // console.log(`Full proxy chain: ${forwardedIps.map(ip => ip.trim()).join(' → ')}`);

    return forwardedIps[0].trim();
  }

  // 3. Check X-Real-IP header
  if (req.headers['x-real-ip']) {
    // console.log(`Using X-Real-IP: ${ip}`);
    return req.headers['x-real-ip'];
  }

  // 4. Fallback to req.ip or socket address
  return req.ip || req.socket.remoteAddress;
}

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: "نواجه الكثير من الطلبات , الرجاء التمهل و المحاولة بعد بضع لحظات - 429",

  keyGenerator: (req, res) => {
    // Override req.ip with the real client IP
    const clientIp = getClientIp(req);

    // Check if we need to normalize IPv6
    if (clientIp.includes(':')) {
   //   console.log(`IPv6 detected: ${clientIp}`);
      // Use the built-in helper for IPv6
      return rateLimit.ipKeyGenerator({ ...req, ip: clientIp }, res);
    }

    // console.log(`Rate limiting IP: ${clientIp}`);
    // console.log('--- END DEBUG ---\n');
    return clientIp;
  }
});

module.exports = limiter;