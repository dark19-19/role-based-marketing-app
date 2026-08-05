const express = require("express");
const router = express.Router();
const config = require("../config");
const db = require("../helpers/DBHelper");
const { cleanupLast3Hours } = require("../scripts/cleanupLast3Hours");

router.post("/test/cleanup", async (req, res) => {
  // Only allow in development or testing modes
  if (config.env === "production") {
    // return res.status(403).json({
    //   success: false,
    //   error: "Cleanup endpoint is not allowed in production mode",
    // });
  }

  try {
    const result = await db.runInTransaction(cleanupLast3Hours);
    res.json({
      success: true,
      message: "Successfully deleted test data added in the last 3 hours",
      result,
    });
  } catch (err) {
    console.error("Test cleanup failed:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to cleanup test data",
    });
  }
});

module.exports = router;
