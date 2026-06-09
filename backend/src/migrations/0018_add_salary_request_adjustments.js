const db = require('../helpers/DBHelper');

module.exports = {
  name: '0018_add_salary_request_adjustments',
  up: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        ALTER TABLE IF EXISTS salary_requests
          ADD COLUMN IF NOT EXISTS adjustment_type VARCHAR(50) NOT NULL DEFAULT 'BONUS',
          ADD COLUMN IF NOT EXISTS adjustment_amount INT NOT NULL DEFAULT 0;
      `);
    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        ALTER TABLE IF EXISTS salary_requests
          DROP COLUMN IF EXISTS adjustment_type,
          DROP COLUMN IF EXISTS adjustment_amount;
      `);
    });
  },
};
