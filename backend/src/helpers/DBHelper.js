const { Pool } = require("pg");
const config = require("../config");

class DBHelper {
  constructor() {
    const basePoolConfig = {
      connectionString: config.databaseUrl,
      idleTimeoutMillis: config.dbPools.idleTimeoutMs,
      connectionTimeoutMillis: config.dbPools.connectionTimeoutMs,
      query_timeout: config.dbPools.queryTimeoutMs,
      statement_timeout: config.dbPools.statementTimeoutMs,
      allowExitOnIdle: config.env === "test",
    };

    this.readPool = new Pool({
      ...basePoolConfig,
      max: config.dbPools.readMax,
    });

    this.writePool = new Pool({
      ...basePoolConfig,
      max: config.dbPools.writeMax,
    });
  }

  async query(text, params = []) {
    const pool = this._pickPool(text);
    try {
      return await pool.query(text, params);
    } catch (err) {
      throw this._normalizeDbError(err);
    }
  }

  async getClient(mode = "write") {
    const pool = mode === "read" ? this.readPool : this.writePool;
    try {
      return await pool.connect();
    } catch (err) {
      throw this._normalizeDbError(err);
    }
  }

  async runInTransaction(cb) {
    const client = await this.getClient("write");
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
    await Promise.all([this.readPool.end(), this.writePool.end()]);
  }

  _pickPool(queryInput) {
    return this._isReadQuery(queryInput) ? this.readPool : this.writePool;
  }

  _isReadQuery(queryInput) {
    const sqlText =
      typeof queryInput === "string" ? queryInput : queryInput?.text;

    if (typeof sqlText !== "string") {
      return false;
    }

    const normalized = sqlText
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/--.*$/gm, " ")
      .trim()
      .toUpperCase();

    if (!normalized) {
      return false;
    }

    if (
      normalized.startsWith("SELECT") ||
      normalized.startsWith("SHOW") ||
      normalized.startsWith("EXPLAIN") ||
      normalized.startsWith("VALUES")
    ) {
      return true;
    }

    if (normalized.startsWith("WITH")) {
      const firstKeyword = normalized.match(
        /\b(INSERT|UPDATE|DELETE|MERGE|SELECT)\b/,
      )?.[1];
      return firstKeyword === "SELECT";
    }

    return false;
  }

  _normalizeDbError(err) {
    const message = String(err?.message || "");

    if (message.includes("timeout exceeded when trying to connect")) {
      const normalized = new Error(
        "Database pool timeout exceeded while waiting for a connection",
      );
      normalized.code = "DB_POOL_TIMEOUT";
      normalized.cause = err;
      return normalized;
    }

    if (
      message.toLowerCase().includes("query read timeout") ||
      err?.code === "57014"
    ) {
      const normalized = new Error("Database query timeout exceeded");
      normalized.code = "DB_QUERY_TIMEOUT";
      normalized.cause = err;
      return normalized;
    }

    return err;
  }
}

const db = new DBHelper();
module.exports = db;
