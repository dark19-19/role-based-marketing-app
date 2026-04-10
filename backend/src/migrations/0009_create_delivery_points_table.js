const db = require('../helpers/DBHelper');

module.exports = {
  up: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS delivery_points (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          fee NUMERIC(12,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_delivery_points_branch_id
        ON delivery_points(branch_id);
      `);

      await client.query(`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS delivery_point_id UUID
        REFERENCES delivery_points(id) ON DELETE SET NULL;
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_delivery_point_id
        ON orders(delivery_point_id);
      `);
    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        ALTER TABLE orders
        DROP COLUMN IF EXISTS delivery_point_id;
      `);
      await client.query(`DROP TABLE IF EXISTS delivery_points CASCADE;`);
    });
  },
};

