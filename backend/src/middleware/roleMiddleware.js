function requireRole(roles = []) {
  const allowedRoles = roles.map((role) => String(role).toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح',
      });
    }

    const normalizedRole = String(req.user.role || '').toUpperCase();

    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية',
      });
    }

    next();
  };
}

module.exports = requireRole;