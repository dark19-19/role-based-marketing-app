const fs = require('fs');
const path = require('path');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL_TEST ||
    'postgres://postgres:postgres@localhost:5432/Seeder-test';

  const db = require('../src/helpers/DBHelper');
  await db.close();

  if (process.env.NODE_ENV === 'test') {
    const testUploadsDir = path.join(__dirname, '..', 'uploads', 'test_photos');
    if (fs.existsSync(testUploadsDir)) {
      for (const entry of fs.readdirSync(testUploadsDir)) {
        const full = path.join(testUploadsDir, entry);
        try {
          const stat = fs.statSync(full);
          if (!stat.isFile()) continue;
          if (entry === '.gitkeep') continue;
          fs.unlinkSync(full);
        } catch (err) {
          console.error(`Failed to delete ${full}:`, err);
        }
      }
    }
  }
};
