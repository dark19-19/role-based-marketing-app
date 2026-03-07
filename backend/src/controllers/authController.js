const authService = require('../services/authService');

class AuthController {
  register = async (req, res) => {
    try {
      const { username, password, tele_id, ref_code } = req.body || {};
      const result = await authService.register({ username, password, tele_id, ref_code });
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  login = async (req, res) => {
    try {
      const { username, password } = req.body || {};
      const result = await authService.login({ username, password });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  me = async (req, res) => {
    try {
      const user = await authService.me(req.user.id);
      res.status(200).json({ success: true, data: user , message:"Hello world from development 1.1 !" });
    } catch (err) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  logout = async (req, res) => {
    try {
      const result = await authService.logout({ userId: req.user.id, token: req.user.token });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

}

module.exports = new AuthController();