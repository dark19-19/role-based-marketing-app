const config = require('../config');
const notificationRepository = require('../data/notificationRepository');

const LOG_PREFIX = '[NotificationsCleanupJob]';

function msUntilNextRun(hour) {
  const now = new Date();
  const next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function createNotificationCleanupJob() {
  let timeoutId = null;
  let isRunning = false;

  const runOnce = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {
      const keepCount = config.notificationsMaxCount;
      const activeCount = await notificationRepository.getActiveCount();

      if (activeCount <= keepCount) {
        console.log(`${LOG_PREFIX} active=${activeCount}, keep=${keepCount}, deleted=0`);
        return;
      }

      const deletedCount = await notificationRepository.softDeleteOldestExcess(keepCount);
      console.log(`${LOG_PREFIX} active=${activeCount}, keep=${keepCount}, deleted=${deletedCount}`);
    } catch (err) {
      console.error(`${LOG_PREFIX} failed`, err);
    } finally {
      isRunning = false;
    }
  };

  const scheduleNext = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    const delay = msUntilNextRun(config.notificationsCleanupHour);
    timeoutId = setTimeout(async () => {
      await runOnce();
      scheduleNext();
    }, delay);
  };

  const start = () => {
    scheduleNext();
    return {
      runOnce,
      stop: () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      },
    };
  };

  return { start, runOnce };
}

module.exports = createNotificationCleanupJob;
