const notificationRepo = require("../data/notificationRepository");

class NotificationHelper {
  async notify(userId, title, message) {
    if (
      !userId ||
      typeof userId !== "string" ||
      !/^[0-9a-fA-F-]{36}$/.test(userId)
    ) {
      throw new Error("Invalid userId: must be a valid UUID");
    }

    return notificationRepo.create({
      userId,
      title,
      message,
    });
  }

  // notify multiple users
  async notifyMany(userIds, title, message) {
    const notifications = userIds.map((userId) => ({
      userId,
      title,
      message,
    }));

    return notificationRepo.bulkCreate(notifications);
  }
}

module.exports = new NotificationHelper();
