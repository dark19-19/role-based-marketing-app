const db = require('../helpers/DBHelper');

module.exports = {
  name: '0015_add_salary_request_details_fields',
  up: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        ALTER TABLE IF EXISTS salary_requests
          ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT 'empty',
          ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50) NOT NULL DEFAULT 'empty',
          ADD COLUMN IF NOT EXISTS address VARCHAR(500) NOT NULL DEFAULT 'empty',
          ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100) NOT NULL DEFAULT 'empty',
          ADD COLUMN IF NOT EXISTS note TEXT;
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_salary_requests_full_name
          ON salary_requests (full_name);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_salary_requests_phone_number
          ON salary_requests (phone_number);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_salary_requests_address
          ON salary_requests (address);
      `);
    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`DROP INDEX IF EXISTS idx_salary_requests_full_name;`);
      await client.query(`DROP INDEX IF EXISTS idx_salary_requests_phone_number;`);
      await client.query(`DROP INDEX IF EXISTS idx_salary_requests_address;`);

      await client.query(`
        ALTER TABLE IF EXISTS salary_requests
          DROP COLUMN IF EXISTS full_name,
          DROP COLUMN IF EXISTS phone_number,
          DROP COLUMN IF EXISTS address,
          DROP COLUMN IF EXISTS payment_method,
          DROP COLUMN IF EXISTS note;
      `);
    });
  },
};

