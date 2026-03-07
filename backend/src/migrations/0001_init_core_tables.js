const db = require('../helpers/DBHelper');

module.exports = {
  name: '0001_init_core_tables',
  up: async () => {
    await db.runInTransaction(async (client) => {
      // migrations table for tracking applied files
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          applied_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      // users
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          tele_id TEXT NULL,
          balance NUMERIC(18,2) NOT NULL DEFAULT 0
        );
      `);






      // jwt_tokens
      await client.query(`
        CREATE TABLE IF NOT EXISTS jwt_tokens (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          revoked BOOLEAN NOT NULL DEFAULT FALSE
        );
      `);
    });
  },
};