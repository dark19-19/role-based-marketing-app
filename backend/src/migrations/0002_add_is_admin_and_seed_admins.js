const db = require('../helpers/DBHelper');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');

module.exports = {
  name: '0002_add_is_admin_and_seed_admins',
  up: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
      `);

      const admins = [
        { username: 'admin', password: 'ChangeMe!1' },
        { username: 'superadmin', password: 'ChangeMe!2' },
        { username: 'opsadmin', password: 'ChangeMe!3' },
      ];

      for (const a of admins) {
        const id = randomUUID();
        const hash = await bcrypt.hash(a.password, 10);
        await client.query(
          `INSERT INTO users (id, username, password, tele_id, balance, is_admin)
           VALUES ($1, $2, $3, NULL, 0, TRUE)
           ON CONFLICT (username) DO UPDATE SET is_admin = TRUE`,
          [id, a.username, hash]
        );
      }
    });
  },
};