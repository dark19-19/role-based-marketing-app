const fs = require('fs');
const path = require('path');
const db = require('./helpers/DBHelper');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

function loadMigrationModule(filePath) {
  const mod = require(filePath);
  if (!mod || typeof mod.up !== 'function') {
    throw new Error(`Invalid migration module: ${filePath}`);
  }
  return mod;
}

async function getAppliedNames(client) {
  const { rows } = await client.query(`SELECT name FROM migrations ORDER BY id ASC`);
  return rows.map(r => r.name);
}

async function insertApplied(client, name) {
  await client.query(
    `INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
    [name]
  );
}

async function deleteApplied(client, name) {
  await client.query(`DELETE FROM migrations WHERE name = $1`, [name]);
}

async function migrateAllPending() {
  const client = await (db.getClient ? db.getClient() : null);
  const runner = client || db; // fallback لو DBHelper ما فيه getClient

  // لو ما فيه client، لازم يكون عندك db.query شغّال
  const q = (...args) => (client ? client.query(...args) : db.query(...args));

  try {
    await ensureMigrationsTable(runner);
    const dir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
    const applied = new Set(await getAppliedNames(runner));
    const pending = files.filter(f => !applied.has(f));
    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }
    console.log(`Found ${pending.length} pending migration(s).`);

    for (const next of pending) {
      const filePath = path.join(dir, next);
      console.log(`Applying migration: ${next}`);
      const mod = loadMigrationModule(filePath);

      // ابدأ ترانزاكشن لكل migration لسلامة التنفيذ
      await q('BEGIN');
      try {
        if (client) {
          await mod.up(client);
        } else {
          await mod.up(db); // في حال الـmigration يستدعي .query مباشرة
        }
        await insertApplied(runner, next);
        await q('COMMIT');
        console.log(`Migration applied: ${next}`);
      } catch (e) {
        await q('ROLLBACK');
        console.error(`❌ Failed migration ${next}:`, e.message);
        throw e;
      }
    }
    console.log('All pending migrations applied successfully.');
  } finally {
    if (client && client.release) client.release();
  }
}

async function rollbackLast() {
  const client = await (db.getClient ? db.getClient() : null);
  const runner = client || db;
  const q = (...args) => (client ? client.query(...args) : db.query(...args));

  try {
    await ensureMigrationsTable(runner);
    const { rows } = await q(
      `SELECT name FROM migrations ORDER BY applied_at DESC, id DESC LIMIT 1`
    );
    if (!rows.length) {
      console.log('No migrations to rollback.');
      return;
    }
    const lastName = rows[0].name;
    const filePath = path.join(__dirname, 'migrations', lastName);
    const mod = loadMigrationModule(filePath);
    if (typeof mod.down !== 'function') {
      throw new Error(`Migration ${lastName} does not support rollback (down missing).`);
    }

    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    await new Promise((resolve, reject) => {
      rl.question("WARNING: all the data could be wiped out on this action. Type 'yes' to continue: ", (answer) => {
        rl.close();
        if (String(answer).trim().toLowerCase() === 'yes') resolve();
        else reject(new Error('Rollback cancelled by user'));
      });
    });

    console.log(`Rolling back migration: ${lastName}`);
    await q('BEGIN');
    try {
      if (client) await mod.down(client); else await mod.down(db);
      await deleteApplied(runner, lastName);
      await q('COMMIT');
      console.log(`Migration rolled back: ${lastName}`);
    } catch (e) {
      await q('ROLLBACK');
      throw e;
    }
  } finally {
    if (client && client.release) client.release();
  }
}

(async () => {
  try {
    const args = process.argv.slice(2);
    const isRollback = args.includes('-r') || args.includes('--rollback');
    if (isRollback) await rollbackLast(); else await migrateAllPending();
    process.exit(0);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();

