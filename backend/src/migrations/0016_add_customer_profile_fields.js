const db = require('../helpers/DBHelper');

module.exports = {
  name: '0016_add_customer_profile_fields',
  up: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        ALTER TABLE IF EXISTS customers
          ADD COLUMN IF NOT EXISTS first_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS last_name VARCHAR(255),
          ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
          ADD COLUMN IF NOT EXISTS has_account BOOLEAN NOT NULL DEFAULT false,
          ADD COLUMN IF NOT EXISTS account_created_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS customer_origin VARCHAR(32) NOT NULL DEFAULT 'INTERNAL';
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_phone_unique
          ON customers (phone)
          WHERE phone IS NOT NULL;
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_customer_origin
          ON customers (customer_origin);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_referred_by
          ON customers (referred_by);
      `);
    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`DROP INDEX IF EXISTS idx_customers_referred_by;`);
      await client.query(`DROP INDEX IF EXISTS idx_customers_customer_origin;`);
      await client.query(`DROP INDEX IF EXISTS idx_customers_phone_unique;`);

      await client.query(`
        ALTER TABLE IF EXISTS customers
          DROP COLUMN IF EXISTS first_name,
          DROP COLUMN IF EXISTS last_name,
          DROP COLUMN IF EXISTS phone,
          DROP COLUMN IF EXISTS has_account,
          DROP COLUMN IF EXISTS account_created_at,
          DROP COLUMN IF EXISTS customer_origin;
      `);
    });
  },
};

