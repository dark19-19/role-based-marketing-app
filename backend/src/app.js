const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const routes = require("./routes");
const rateLimiter = require("./middleware/rateLimiter");

const app = express();

const uploadsDir = path.join(__dirname, "..", "uploads"); 

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(" مجلد uploads تم إنشاؤه في:", uploadsDir);
}

// خدمة الصور
app.use("/uploads", express.static(uploadsDir));

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

app.use(routes);

app.get("/health", (_req, res) => res.json({ ok: true }));

module.exports = app;
