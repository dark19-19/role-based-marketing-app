const fs = require('fs');
const path = require('path');

module.exports = async () => {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL_TEST ||
    'postgres://postgres:postgres@localhost:5432/Seeder-test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'x'.repeat(32);

  const db = require('../src/helpers/DBHelper');

  await db.ensureMigrationsTable();

  const { rows } = await db.query(`SELECT name FROM migrations ORDER BY id ASC`);
  const applied = new Set(rows.map((r) => r.name));

  const dir = path.join(__dirname, '..', 'src', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const mod = require(path.join(dir, file));
    await mod.up();
    await db.query(
      `INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
      [file],
    );
  }
};
