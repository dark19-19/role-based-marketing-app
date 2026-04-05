const config = require('../config');
const notificationRepository = require('../data/notificationRepository');

const LOG_PREFIX = '[NotificationsPurgeJob]';
const WEEKLY_RUN_DAY = 0;

function msUntilNextWeeklyRun({ dayOfWeek, hour }) {
  const now = new Date();
  const next = new Date(now);

  next.setHours(hour, 0, 0, 0);

  const currentDay = next.getDay();
  let daysUntil = dayOfWeek - currentDay;
  if (daysUntil < 0) {
    daysUntil += 7;
  }
  if (daysUntil === 0 && next <= now) {
    daysUntil = 7;
  }

  next.setDate(next.getDate() + daysUntil);

  return next.getTime() - now.getTime();
}

function createNotificationPurgeJob() {
  let timeoutId = null;
  let isRunning = false;

  const runOnce = async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {
      const days = config.notificationsHardDeleteAfterDays;
      const deletedCount = await notificationRepository.hardDeleteSoftDeletedOlderThanDays(days);
      console.log(`${LOG_PREFIX} retentionDays=${days}, hardDeleted=${deletedCount}`);
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

    const delay = msUntilNextWeeklyRun({
      dayOfWeek: WEEKLY_RUN_DAY,
      hour: config.notificationsCleanupHour,
    });

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

module.exports = createNotificationPurgeJob;
