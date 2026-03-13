const authService = require('../services/authService');

class AuthController {
  registerCustomer = async (req, res) => {
    try {

      const {first_name, last_name, phone, password } = req.body || {};

      const result = await authService.registerCustomer({
        first_name,
        last_name,
        phone,
        password
      });

      res.status(201).json({
        success: true,
        body: result,
        message: "تم إنشاء الحساب بنجاح"
      });

    } catch (err) {

      res.status(400).json({
        success: false,
        message: err.message
      });

    }
  }

  login = async (req, res) => {
    try {
      const { phone, password } = req.body || {};
      const result = await authService.login({ phone, password });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  me = async (req, res) => {

    try {

      const result = await authService.me(req.user.id);

      res.status(200).json({
        success: true,
        body: result,
        message: "تم جلب بيانات المستخدم"
      });

    } catch (err) {

      res.status(404).json({
        success: false,
        message: err.message
      });

    }

  }
  logout = async (req, res) => {

    try {

      const result = await authService.logout({
        userId: req.user.id,
        token: req.user.token
      });

      res.status(200).json({
        success: true,
        body: result,
        message: "تم تسجيل الخروج بنجاح"
      });

    } catch (err) {

      res.status(400).json({
        success: false,
        message: err.message
      });

    }

  }



}

module.exports = new AuthController();