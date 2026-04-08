const notificationRepo = require("../data/notificationRepository");

class NotificationService {
  async list(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const result = await notificationRepo.listPaginated(userId, limit, offset);

    return {
      data: result.data,
      pagination: {
        total: result.total,
        page,
        limit,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  async getById(id, userId) {
    const notification = await notificationRepo.findById(id);

    if (!notification || notification.user_id !== userId)
      throw new Error("Notification not found");

    return notification;
  }

  async markAsRead(id, userId) {
    const updated = await notificationRepo.markAsRead(id, userId);
    if (!updated) {
      throw new Error("Notification not found");
    }
  }

  async markAllAsRead(userId) {
    const updated = await notificationRepo.markAllAsRead(userId);
    if (!updated) {
      throw new Error("Notifications not found");
    }
  }

  async delete(id, userId) {
    const updated = await notificationRepo.softDelete(id, userId);
    if (!updated) {
      throw new Error("Notification not found");
    }
  }

  async getCount(userId) {
    return notificationRepo.getCount(userId);
  }

  async getUnreadCount(userId) {
    return notificationRepo.getUnreadCount(userId);
  }
}

module.exports = new NotificationService();
