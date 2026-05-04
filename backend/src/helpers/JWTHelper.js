const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const config = require('../config');

function sign(payload, options = { expiresIn: '72h' }) {
  return jwt.sign(payload, config.jwtSecret, options);
}

function verify(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return null;
  }
}

function decode(token) {
  return jwt.decode(token);
}

function buildAccessToken(user) {
  return sign(
    { sub: user.id, phone: user.phone, role: user.role, jti: randomUUID() },
    { expiresIn: '30m' }
  );
}

module.exports = { sign, verify, decode, buildAccessToken };
