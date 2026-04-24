const { verify } = require('../helpers/JWTHelper');
const userRepo = require('../data/userRepository');
const adminRepo = require('../data/adminRepository');
const customerRepo = require('../data/customerRepository');

async function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = parts[1];
  const payload = verify(token);
  if (!payload) return res.status(401).json({ error: 'Invalid or expired token' });
  const rec = await userRepo.getTokenByValue(token);
  if (rec && rec.revoked) return res.status(401).json({ error: 'Session expired' });

  req.user = { id: payload.sub, phone: payload.phone, role: payload.role, token };

  if (req.user.role === 'CUSTOMER') {
    const customer = await customerRepo.findByUserIdWithActive(req.user.id);
    if (customer) {
      req.user.customer_id = customer.id;
    }
  }
  next();
}

async function requireAdmin(req, res, next) {
  try {
    const isAdmin = await adminRepo.getUserIsAdminById(req.user.id);
    if (!isAdmin) return res.status(403).json({ error: 'Admin privileges required' });
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
}

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
