const db = require('../helpers/DBHelper');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const roleSeeder = require('../seed/rolesSeed')
const governorateSeeder = require('../seed/governoratesSeed')
const roleRepo = require('../data/roleRepository')

module.exports = {
  name: '0010_seed',

  up: async () => {
    await db.runInTransaction(async (client) => {

      await roleSeeder()
      await governorateSeeder()
      const adminRole = await roleRepo.findByName('مدير')
      const adminRoleId = adminRole.id;

      const admins = [
        {first_name: "Asef", last_name: "Tritona", phone: '0912345678', password: '12345678' },
        {first_name: "Dev", last_name: "Hub", phone: '0932068925', password: 'admin@admin.admin' },
      ];

      for (const a of admins) {
        const id = randomUUID();
        const hash = await bcrypt.hash(a.password, 10);

        await client.query(
            `
          INSERT INTO users (id,first_name, last_name, phone, password, role_id)
          VALUES ($1,$2,$3, $4, $5, $6)
          ON CONFLICT (phone) DO NOTHING
          `,
            [id,a.first_name, a.last_name, a.phone, hash, adminRoleId]
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