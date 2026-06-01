const adminService = require("../services/adminService");
const employeeService = require("../services/employeeService");
const fs = require("fs");
const path = require("path");
const {
  getDefaultLocalUploadsRoot,
  getConfiguredUploadsRoot,
} = require("../utils/uploadPaths");
const { migrateUploadsToConfiguredPath } = require("../utils/uploadsMigration");

function listFilesRecursive(directoryPath, basePath = directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, basePath));
    } else if (entry.isFile()) {
      files.push(path.relative(basePath, fullPath).replace(/\\/g, "/"));
    }
  }

  return files.sort();
}

function buildUploadsDirectoryReport(directoryPath) {
  const exists = fs.existsSync(directoryPath);
  const files = exists ? listFilesRecursive(directoryPath) : [];

  return {
    path: directoryPath,
    exists,
    filesCount: files.length,
    files,
  };
}

class AdminController {
  registerAdmin = async (req, res) => {
    try {
      const { first_name, last_name, phone, password } = req.body;

      const result = await adminService.registerAdmin({
        first_name,
        last_name,
        phone,
        password,
      });

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  };

  listUsers = async (req, res) => {
    try {
      const { page, limit, order } = req.query;
      const result = await adminService.listUsers({ page, limit, order });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  createUser = async (req, res, next) => {
    try {

      const result = await adminService.createUser(req.user,req.body);
      res.status(200).json({
        success: true,
        data: result,
        message: "تم إنشاء الموظف بنجاح",
      });
    } catch (err) {
      res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  };

  searchUsers = async (req, res) => {
    try {
      const { q } = req.query;
      const result = await adminService.searchUsers({ query: q });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  listEmployees = async (req, res) => {
    try {
      const { page, limit } = req.query;

      const result = await employeeService.listEmployees({ limit, page });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  resetUserPassword = async (req, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body || {};
      // Use adminService to perform reset (which has access checks)
      const result = await adminService.resetUserPassword({
        adminUser: req.user,
        targetUserId: userId,
        newPassword,
      });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  verifyUploadsStorage = async (_req, res) => {
    try {
      const legacyUploadsPath = getDefaultLocalUploadsRoot();
      const activeUploadsPath = getConfiguredUploadsRoot();

      const legacyReport = buildUploadsDirectoryReport(legacyUploadsPath);
      const activeReport = buildUploadsDirectoryReport(activeUploadsPath);

      res.status(200).json({
        success: true,
        data: {
          isUsingCustomUploadsPath: path.resolve(legacyUploadsPath) !== path.resolve(activeUploadsPath),
          legacyUploads: legacyReport,
          activeUploads: activeReport,
        },
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };

  migrateUploadsStorage = async (_req, res) => {
    try {
      const migration = migrateUploadsToConfiguredPath();
      const legacyUploadsPath = getDefaultLocalUploadsRoot();
      const activeUploadsPath = getConfiguredUploadsRoot();

      res.status(200).json({
        success: true,
        data: {
          migration,
          isUsingCustomUploadsPath: path.resolve(legacyUploadsPath) !== path.resolve(activeUploadsPath),
          legacyUploads: buildUploadsDirectoryReport(legacyUploadsPath),
          activeUploads: buildUploadsDirectoryReport(activeUploadsPath),
        },
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  };
}

module.exports = new AdminController();
