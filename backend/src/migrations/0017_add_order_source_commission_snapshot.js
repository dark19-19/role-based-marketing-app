const db = require('../helpers/DBHelper');

module.exports = {
  name: '0017_add_order_source_commission_snapshot',
  up: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        ALTER TABLE IF EXISTS orders
          ADD COLUMN IF NOT EXISTS order_source VARCHAR(32),
          ADD COLUMN IF NOT EXISTS commission_mode VARCHAR(32) NOT NULL DEFAULT 'LEGACY',
          ADD COLUMN IF NOT EXISTS commission_employee_id UUID REFERENCES employees(id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_order_source
          ON orders (order_source);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_commission_mode
          ON orders (commission_mode);
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_commission_employee_id
          ON orders (commission_employee_id);
      `);
    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`DROP INDEX IF EXISTS idx_orders_commission_employee_id;`);
      await client.query(`DROP INDEX IF EXISTS idx_orders_commission_mode;`);
      await client.query(`DROP INDEX IF EXISTS idx_orders_order_source;`);

      await client.query(`
        ALTER TABLE IF EXISTS orders
          DROP COLUMN IF EXISTS commission_employee_id,
          DROP COLUMN IF EXISTS commission_mode,
          DROP COLUMN IF EXISTS order_source;
      `);
    });
  },
};

