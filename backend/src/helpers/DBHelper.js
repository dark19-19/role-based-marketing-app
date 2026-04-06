const { Pool } = require("pg");
const config = require("../config");

class DBHelper {
  constructor() {
    this.pool = new Pool({ connectionString: config.databaseUrl });
  }

  async query(text, params = []) {
    // Use parameterized queries to prevent SQL injection
    return this.pool.query(text, params);
  }

  async getClient() {
    return this.pool.connect();
  }

  async runInTransaction(cb) {
    const client = await this.getClient();
    try {
      await client.query("BEGIN");
      const result = await cb(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
      throw err;
    } finally {
      client.release();
    }
  }

  sanitizeString(input) {
    if (typeof input !== "string") return "";
    return input.trim();
  }

  async ensureMigrationsTable() {
    await this.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
  }

  async close() {
    await this.pool.end();
  }
}

const db = new DBHelper();
module.exports = db;
