const db = require('../helpers/DBHelper');

module.exports = {
  name: '0008_create_order_comments_table',
  up: async () => {
    await db.runInTransaction(async (client) => {
      // Create order_comments table
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          added_by UUID NOT NULL REFERENCES users(id),
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Add index for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_order_comments_order_id ON order_comments(order_id);
      `);
    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`DROP INDEX IF EXISTS idx_order_comments_order_id;`);
      await client.query(`DROP TABLE IF EXISTS order_comments CASCADE;`);
    });
  }
};