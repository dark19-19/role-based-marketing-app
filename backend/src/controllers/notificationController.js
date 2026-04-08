const notificationService = require("../services/notificationService");

class NotificationController {
  async list(req, res) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const data = await notificationService.list(req.user.id, page, limit);

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getById(req, res) {
    try {
      const notification = await notificationService.getById(
        req.params.id,
        req.user.id,
      );

      res.json({
        success: true,
        data: notification,
      });
    } catch (err) {
      const status = err.message && err.message.toLowerCase().includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  async markAsRead(req, res) {
    try {
      await notificationService.markAsRead(req.params.id, req.user.id);

      res.json({
        success: true,
      });
    } catch (err) {
      const status = err.message && err.message.toLowerCase().includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  async markAllAsRead(req, res) {
    try {
      await notificationService.markAllAsRead(req.user.id);

      res.json({ success: true });
    } catch (err) {
      const status = err.message && err.message.toLowerCase().includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  async delete(req, res) {
    try {
      await notificationService.delete(req.params.id, req.user.id);

      res.json({
        success: true,
      });
    } catch (err) {
      const status = err.message && err.message.toLowerCase().includes('not found') ? 404 : 400;
      res.status(status).json({ success: false, message: err.message });
    }
  }

  async count(req, res) {
    try {
      const count = await notificationService.getCount(req.user.id);

      res.json({
        success: true,
        data: { count },
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async unreadCount(req, res) {
    try {
      const count = await notificationService.getUnreadCount(req.user.id);

      res.json({
        success: true,
        data: { count },
      });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = new NotificationController();
