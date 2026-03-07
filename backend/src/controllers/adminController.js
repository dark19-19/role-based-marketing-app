const adminService = require('../services/adminService');



class AdminController {
  login = async (req, res) => {
    try {
      const { username, password } = req.body || {};
      const result = await adminService.login({ username, password });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  logout = async (req, res) => {
    try {
      const result = await adminService.logout({ userId: req.user.id, token: req.user.token });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  listUsers = async (req, res) => {
    try {
      const { page, limit, order } = req.query;
      const result = await adminService.listUsers({ page, limit, order });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  searchUsers = async (req, res) => {
    try {
      const { q } = req.query;
      const result = await adminService.searchUsers({ query: q });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new AdminController();
