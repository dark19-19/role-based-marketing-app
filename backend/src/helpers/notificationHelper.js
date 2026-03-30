const notificationRepo = require('../data/notificationRepository');

class NotificationHelper {

    async notify(userId, title, message) {

        return notificationRepo.create({
            userId,
            title,
            message
        });

    }

    // notify multiple users
    async notifyMany(userIds, title, message) {

        const notifications = userIds.map(userId => ({
            userId,
            title,
            message
        }));

        return notificationRepo.bulkCreate(notifications);

    }

}

module.exports = new NotificationHelper();