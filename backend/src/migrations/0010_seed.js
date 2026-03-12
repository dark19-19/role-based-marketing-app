const db = require('../helpers/DBHelper');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const roleSeeder = require('../seed/rolesSeed')
const roleRepo = require('../data/roleRepository')

module.exports = {
  name: '0010_seed',

  up: async () => {
    await db.runInTransaction(async (client) => {

      // إضافة عمود is_admin إذا لم يكن موجود
      await client.query(`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;
      `);

      await roleSeeder()
      const adminRole = await roleRepo.findByName('مدير')
      const adminRoleId = adminRole.id;

      const admins = [
        { phone: '1000000001', password: 'ChangeMe!1' },
        { phone: '1000000002', password: 'ChangeMe!2' },
        { phone: '1000000003', password: 'ChangeMe!3' },
      ];

      for (const a of admins) {
        const id = randomUUID();
        const hash = await bcrypt.hash(a.password, 10);

        await client.query(
            `
          INSERT INTO users (id, phone, password, role_id, is_admin)
          VALUES ($1, $2, $3, $4, TRUE)
          ON CONFLICT (phone)
          DO UPDATE SET is_admin = TRUE
          `,
            [id, a.phone, hash, adminRoleId]
        );
      }

    });
  },

  down: async () => {
    await db.runInTransaction(async (client) => {

      // حذف المستخدمين الذين أنشأهم هذا seed
      await client.query(`
        DELETE FROM users
        WHERE phone IN ('1000000001','1000000002','1000000003')
      `);

      // حذف role admin إذا لم يعد مستخدم
      await client.query(`
        DELETE FROM roles
        WHERE name = 'admin'
        AND NOT EXISTS (
          SELECT 1 FROM users WHERE role_id = roles.id
        )
      `);

      // حذف العمود is_admin
      await client.query(`
        ALTER TABLE users
        DROP COLUMN IF EXISTS is_admin
      `);

    });
  }
};