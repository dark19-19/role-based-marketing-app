const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');

async function seedRoles() {

  const roles = [
    'ADMIN',
    'BRANCH_MANAGER',
    'GENERAL_SUPERVISOR',
    'SUPERVISOR',
    'MARKETER',
    "CUSTOMER"
  ];

  try {

    for (const role of roles) {

      await db.query(
        `INSERT INTO roles (id, name)
         VALUES ($1,$2)
         ON CONFLICT (name) DO NOTHING`,
        [randomUUID(), role]
      );

    }

    console.log('✅ تمت إضافة الأدوار الأساسية بنجاح');

  } catch (err) {

    console.error('❌ حدث خطأ أثناء إضافة الأدوار الأساسية', err);

  }

}

module.exports = seedRoles;