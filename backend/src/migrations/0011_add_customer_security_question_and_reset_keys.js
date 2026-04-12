const db = require('../helpers/DBHelper');

module.exports = {
  name: '0011_add_customer_security_question_and_reset_keys',
  up: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS question TEXT;
      `);

      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS answer TEXT;
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS reset_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          reset_key_hash TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_reset_keys_hash
        ON reset_keys(reset_key_hash);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_reset_keys_user_id
        ON reset_keys(user_id);
      `);
    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`DROP TABLE IF EXISTS reset_keys CASCADE;`);
      await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS answer;`);
      await client.query(`ALTER TABLE users DROP COLUMN IF EXISTS question;`);
    });
  },
};

