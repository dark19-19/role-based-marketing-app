const { migrateUploadsToConfiguredPath } = require("../utils/uploadsMigration");

function run() {
  const result = migrateUploadsToConfiguredPath();
  console.log("Uploads source:", result.sourceRoot);
  console.log("Uploads target:", result.targetRoot);
  console.log(result.message);
}

run();
