const config = require('../config');

function bulkAuth(req, res, next) {
  const key = req.headers['x-api-key'];

  if (!key) {
    return res.status(401).json({ success: false, message: 'Missing API key' });
  }

  if (key !== config.bulkApiKey) {
    return res.status(403).json({ success: false, message: 'Invalid API key' });
  }

  next();
}

module.exports = bulkAuth;
