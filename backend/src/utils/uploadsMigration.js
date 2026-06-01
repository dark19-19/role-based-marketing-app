const fs = require("fs");
const path = require("path");
const {
  getDefaultLocalUploadsRoot,
  getConfiguredUploadsRoot,
  ensureDirectoryExists,
} = require("./uploadPaths");

function listFilesRecursive(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function copyDirectoryContents(sourceDir, targetDir) {
  const files = listFilesRecursive(sourceDir);
  let copiedCount = 0;

  for (const sourceFile of files) {
    const relativePath = path.relative(sourceDir, sourceFile);
    const targetFile = path.join(targetDir, relativePath);
    ensureDirectoryExists(path.dirname(targetFile));
    fs.copyFileSync(sourceFile, targetFile);
    copiedCount += 1;
  }

  return copiedCount;
}

function migrateUploadsToConfiguredPath() {
  const sourceRoot = getDefaultLocalUploadsRoot();
  const targetRoot = getConfiguredUploadsRoot();

  const result = {
    sourceRoot,
    targetRoot,
    samePath: path.resolve(sourceRoot) === path.resolve(targetRoot),
    sourceExists: fs.existsSync(sourceRoot),
    copiedCount: 0,
    message: "",
  };

  if (result.samePath) {
    result.message = "Source and target uploads directories are the same. Nothing to migrate.";
    return result;
  }

  if (!result.sourceExists) {
    result.message = "Source uploads directory does not exist. Nothing to migrate.";
    return result;
  }

  ensureDirectoryExists(targetRoot);
  result.copiedCount = copyDirectoryContents(sourceRoot, targetRoot);
  result.message = `Uploads migration completed. Copied ${result.copiedCount} file(s).`;

  return result;
}

module.exports = {
  migrateUploadsToConfiguredPath,
};
