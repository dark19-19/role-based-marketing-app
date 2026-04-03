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
    await notificationRepo.markAsRead(id, userId);
  }

  async markAllAsRead(userId) {
    await notificationRepo.markAllAsRead(userId);
  }

  async delete(id, userId) {
    await notificationRepo.softDelete(id, userId);
  }

  async getCount(userId) {
    return notificationRepo.getCount(userId);
  }

  async getUnreadCount(userId) {
    return notificationRepo.getUnreadCount(userId);
  }
}

module.exports = new NotificationService();
