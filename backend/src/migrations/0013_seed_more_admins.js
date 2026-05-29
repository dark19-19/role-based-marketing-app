const db = require('../helpers/DBHelper');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const roleSeeder = require('../seed/rolesSeed');
const config = require('../config');

module.exports = {
  name: '0013_seed_more_admins',

  up: async () => {
    await db.runInTransaction(async (client) => {
      await roleSeeder();

      if (!config.admin3Phone || !config.admin3Password || !config.admin4Phone || !config.admin4Password) {
        throw new Error('Missing ADMIN_3_* or ADMIN_4_* env vars');
      }

      const roleRes = await client.query(`SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1`);
      const adminRoleId = roleRes.rows[0]?.id;
      if (!adminRoleId) {
        throw new Error('ADMIN role not found');
      }

      const admins = [
        { first_name: 'Weaam', last_name: 'Saleh', phone: config.admin3Phone, password: config.admin3Password },
        { first_name: 'Ahmad', last_name: 'Abod', phone: config.admin4Phone, password: config.admin4Password },
      ];

      for (const a of admins) {
        const hash = await bcrypt.hash(a.password, 10);
        const newId = randomUUID();

        const userRes = await client.query(
          `
            INSERT INTO users (id, first_name, last_name, phone, password, role_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (phone) DO UPDATE SET
              first_name = EXCLUDED.first_name,
              last_name = EXCLUDED.last_name,
              password = EXCLUDED.password,
              role_id = EXCLUDED.role_id
            RETURNING id
          `,
          [newId, a.first_name, a.last_name, a.phone, hash, adminRoleId],
        );

        const userId = userRes.rows[0]?.id;
        if (!userId) {
          throw new Error(`Failed to upsert admin user ${a.phone}`);
        }

        await client.query(
          `
            INSERT INTO employees (user_id, branch_id, supervisor_id)
            VALUES ($1, NULL, NULL)
            ON CONFLICT (user_id) DO NOTHING
          `,
          [userId],
        );
      }
    });
  },

  down: async () => {
    await db.runInTransaction(async (client) => {
      const phones = [config.admin3Phone, config.admin4Phone].filter(Boolean);
      if (phones.length === 0) return;

      await client.query(`DELETE FROM users WHERE phone = ANY($1::text[])`, [phones]);
    });
  },
};
