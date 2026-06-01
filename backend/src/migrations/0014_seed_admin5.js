const db = require('../helpers/DBHelper');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const roleSeeder = require('../seed/rolesSeed');
const config = require('../config');

module.exports = {
  name: '0014_seed_admin5',

  up: async () => {
    await db.runInTransaction(async (client) => {
      await roleSeeder();

      if (!config.admin5Phone || !config.admin5Password) {
        throw new Error('Missing ADMIN_5_PHONE or ADMIN_5_PASSWORD env vars');
      }

      const roleRes = await client.query(`SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1`);
      const adminRoleId = roleRes.rows[0]?.id;
      if (!adminRoleId) {
        throw new Error('ADMIN role not found');
      }

      const admin = {
        first_name: 'Rahaf',
        last_name: 'Hasan',
        phone: config.admin5Phone,
        password: config.admin5Password,
      };

      const hash = await bcrypt.hash(admin.password, 10);
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
        [newId, admin.first_name, admin.last_name, admin.phone, hash, adminRoleId],
      );

      const userId = userRes.rows[0]?.id;
      if (!userId) {
        throw new Error(`Failed to upsert admin user ${admin.phone}`);
      }

      await client.query(
        `
          INSERT INTO employees (user_id, branch_id, supervisor_id)
          VALUES ($1, NULL, NULL)
          ON CONFLICT (user_id) DO NOTHING
        `,
        [userId],
      );
    });
  },

  down: async () => {
    await db.runInTransaction(async (client) => {
      if (!config.admin5Phone) return;
      await client.query(`DELETE FROM users WHERE phone = $1`, [config.admin5Phone]);
    });
  },
};
