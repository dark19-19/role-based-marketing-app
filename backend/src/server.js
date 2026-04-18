const app = require("./app");
const config = require("./config");
const createNotificationCleanupJob = require("./jobs/notificationCleanupJob");
const createNotificationPurgeJob = require("./jobs/notificationPurgeJob");
const couponAvailabilityService = require("./services/couponAvailabilityService");

const port = config.port || 3000;
console.log("\n");
console.log("notificaiton cron job initialized");
createNotificationCleanupJob().start();
console.log("\n");
console.log("notificaiton purge cron job initialized");
createNotificationPurgeJob().start();

couponAvailabilityService.initialize().catch((err) => {
  console.error("coupon availability cache initialization failed:", err.message);
});

app.listen(port, () => {
  console.log("\n");
  console.log(
    "██████╗   ██████╗    ███████╗  ███████╗  ██╗   ██╗ ███████╗  ██╗     ████████╗ version 1.0",
  );
  console.log(
    "██╔══██╗ ██╔═══██╗   ██╔════╝  ██╔════╝  ██║   ██║ ██╔════╝  ██║     ╚══██╔══╝",
  );
  console.log(
    "██████╔╝ ██║   ██║   ███████╗  █████╗    ██║   ██║ █████╗    ██║        ██║   ",
  );
  console.log(
    "██╔══██╗ ██║   ██║   ╚════██║  ██╔══╝    ╚██╗ ██╔╝ ██╔══╝    ██║        ██║   ",
  );
  console.log(
    "██║  ██║ ╚██████╔╝   ███████║  ███████╗   ╚████╔╝  ███████╗  ███████╗   ██║   ",
  );
  console.log(
    "╚═╝  ╚═╝   ╚═════╝   ╚══════╝  ╚══════╝    ╚═══╝   ╚══════╝  ╚══════╝   ╚═╝   ",
  );
  console.log("\n");
  console.log(`🚀 SERVER RUNNING ON PORT ${port}`);
  console.log(`📡 http://localhost:${port}`);
  console.log("\n");
});
