const express = require("express");
const cors = require("cors");
const routes = require("./routes");
const rateLimiter = require("./middleware/rateLimiter");
const config = require("./config");
const {
  getConfiguredUploadsRoot,
  ensureDirectoryExists,
} = require("./utils/uploadPaths");

const app = express();
app.set("trust proxy", config.trustProxy);

// TEMPORARY: For testing 5xx error screen
// app.use((req, res, next) => {
//   if (req.path.startsWith('/api')) {
//     return res.status(500).json({
//       success: false,
//       message: "Testing 5xx error screen - Server is under heavy traffic"
//     });
//   }
//   next();
// });

const uploadsDir = getConfiguredUploadsRoot();
ensureDirectoryExists(uploadsDir);
console.log("Uploads directory:", uploadsDir);
console.log("Trust proxy:", config.trustProxy);

// خدمة الصور
app.use("/uploads", express.static(uploadsDir));

app.use(cors());
app.use(express.json());
if (process.env.NODE_ENV !== "development") {
  app.use(rateLimiter);
}

app.use(routes);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  res.status(400).json({
    success: false,
    error: err.message || "Error",
  });
});

module.exports = app;
