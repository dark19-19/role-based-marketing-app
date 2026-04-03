const notificationService = require("../services/notificationService");

class NotificationController {
  async list(req, res) {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const data = await notificationService.list(req.user.id, page, limit);

    res.json({
      success: true,
      data,
    });
  }

  async getById(req, res) {
    const notification = await notificationService.getById(
      req.params.id,
      req.user.id,
    );

    res.json({
      success: true,
      data: notification,
    });
  }

  async markAsRead(req, res) {
    await notificationService.markAsRead(req.params.id, req.user.id);

    res.json({
      success: true,
    });
  }

  async markAllAsRead(req, res) {
    await notificationService.markAllAsRead(req.user.id);

    res.json({ success: true });
  }

  async delete(req, res) {
    await notificationService.delete(req.params.id, req.user.id);

    res.json({
      success: true,
    });
  }

  async count(req, res) {
    const count = await notificationService.getCount(req.user.id);

    res.json({
      success: true,
      data: { count },
    });
  }

  async unreadCount(req, res) {
    const count = await notificationService.getUnreadCount(req.user.id);

    res.json({
      success: true,
      data: { count },
    });
  }
}

module.exports = new NotificationController();
