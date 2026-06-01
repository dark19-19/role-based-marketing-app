const fs = require("fs");
const path = require("path");

function getDefaultLocalUploadsRoot() {
  return path.join(__dirname, "..", "..", "uploads");
}

function getConfiguredUploadsRoot() {
  const configuredRoot = process.env.UPLOADS_FILESYSTEM_PATH;
  if (configuredRoot && configuredRoot.trim() !== "") {
    return path.resolve(configuredRoot.trim());
  }

  return getDefaultLocalUploadsRoot();
}

function getUploadsSubdirectory() {
  return process.env.NODE_ENV === "test" ? "test_photos" : "";
}

function getUploadsDirectory() {
  const subdirectory = getUploadsSubdirectory();
  if (!subdirectory) {
    return getConfiguredUploadsRoot();
  }

  return path.join(getConfiguredUploadsRoot(), subdirectory);
}

function getUploadPublicPath(filename = "") {
  const parts = ["uploads"];
  const subdirectory = getUploadsSubdirectory();

  if (subdirectory) {
    parts.push(subdirectory);
  }

  if (filename) {
    parts.push(filename);
  }

  return `/${parts.join("/")}`;
}

function ensureDirectoryExists(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

module.exports = {
  getDefaultLocalUploadsRoot,
  getConfiguredUploadsRoot,
  getUploadsDirectory,
  getUploadPublicPath,
  ensureDirectoryExists,
};
