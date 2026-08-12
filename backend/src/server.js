const http = require("http");
const app = require("./app");
const config = require("./config");
const createNotificationCleanupJob = require("./jobs/notificationCleanupJob");
const createNotificationPurgeJob = require("./jobs/notificationPurgeJob");
const couponAvailabilityService = require("./services/couponAvailabilityService");
const applySlowlorisProtection = require("./utils/slowlorisProtection");

const port = config.port || 3000;

// // Runtime IP tracking set
// const seenIPs = new Set();
//
// // Debug middleware to log new IPs
// const debugIPLogger = (req, res, next) => {
//   const clientIP = req.ip || req.connection.remoteAddress;
//   const forwardedFor = req.headers['x-forwarded-for'];
//   const realIP = req.headers['x-real-ip'];
//
//   // Extract the first IP from x-forwarded-for if it exists
//   const primaryIP = forwardedFor ? forwardedFor.split(',')[0].trim() : clientIP;
//
//   // Only log if we haven't seen this IP before
//   if (!seenIPs.has(primaryIP)) {
//     seenIPs.add(primaryIP);
//
//     console.log('\n' + '='.repeat(60));
//     console.log(`🆕 NEW IP DETECTED: ${primaryIP}`);
//     console.log('-'.repeat(60));
//     console.log(`📋 Request Details:`);
//     console.log(`   • Express req.ip: ${clientIP}`);
//     console.log(`   • X-Forwarded-For: ${forwardedFor || 'Not set'}`);
//     console.log(`   • X-Real-IP: ${realIP || 'Not set'}`);
//     console.log(`   • Connection Remote Address: ${req.connection.remoteAddress}`);
//     console.log(`   • Socket Remote Address: ${req.socket.remoteAddress}`);
//     console.log(`   • Method: ${req.method}`);
//     console.log(`   • Path: ${req.path}`);
//     console.log(`   • User-Agent: ${(req.headers['user-agent'] || 'Not set').substring(0, 100)}...`);
//     console.log(`   • Total Unique IPs Seen: ${seenIPs.size}`);
//     console.log('='.repeat(60) + '\n');
//   }
//
//   next();
// };

// // Apply debug middleware early in the chain
// app.use(debugIPLogger);

console.log("\n");
console.log("notificaiton cron job initialized");
createNotificationCleanupJob().start();
console.log("\n");
console.log("notificaiton purge cron job initialized");
createNotificationPurgeJob().start();

couponAvailabilityService.initialize().catch((err) => {
  console.error("coupon availability cache initialization failed:", err.message);
});

const server = http.createServer(app);
if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") {
  applySlowlorisProtection(server, { ...config.serverHardening, logger: console });
}

server.listen(port, () => {
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
  console.log('\n');
  // console.log('🔍 IP DEBUG LOGGING: ENABLED');
  // console.log('   Only logging first occurrence of each unique IP');
  console.log("\n");
});

// // Optional: Add endpoint to view all seen IPs
// app.get('/debug/seen-ips', (req, res) => {
//   res.json({
//     totalUniqueIPs: seenIPs.size,
//     ips: Array.from(seenIPs)
//   });
// });
//
// // Optional: Add endpoint to reset the IP tracking
// app.get('/debug/reset-ips', (req, res) => {
//   seenIPs.clear();
//   res.json({
//     message: 'IP tracking reset',
//     totalUniqueIPs: 0
//   });
// });