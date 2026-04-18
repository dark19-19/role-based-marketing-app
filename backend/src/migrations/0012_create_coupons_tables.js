const db = require('../helpers/DBHelper');

module.exports = {
  name: '0012_create_coupons_tables',
  up: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        CREATE TABLE IF NOT EXISTS coupons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          code VARCHAR(255) NOT NULL UNIQUE,
          discount_percentage INT NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
          number_of_people INT NOT NULL CHECK (number_of_people > 0),
          used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS coupon_usages (
          customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
          order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (customer_id, coupon_id)
        );
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_coupon_usages_coupon_id
        ON coupon_usages(coupon_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_coupon_usages_customer_id
        ON coupon_usages(customer_id);
      `);

      await client.query(`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL;
      `);

      await client.query(`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS discount_percentage INT;
      `);

      await client.query(`
        ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0;
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_coupon_id
        ON orders(coupon_id);
      `);
    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount;`);
      await client.query(`ALTER TABLE orders DROP COLUMN IF EXISTS discount_percentage;`);
      await client.query(`ALTER TABLE orders DROP COLUMN IF EXISTS coupon_id;`);
      await client.query(`DROP TABLE IF EXISTS coupon_usages CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS coupons CASCADE;`);
    });
  },
};

