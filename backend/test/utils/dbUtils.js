const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../../src/helpers/DBHelper');

async function resetDatabase() {
  await db.query(`
    TRUNCATE TABLE
      jwt_tokens,
      notifications,
      salary_requests,
      wallet_transactions,
      order_commissions,
      order_items,
      orders,
      product_images,
      commission_settings,
      products,
      categories,
      customers,
      employees,
      branches,
      governorates,
      users
    CASCADE
  `);
}

async function ensureRoles() {
  const required = [
    'ADMIN',
    'BRANCH_MANAGER',
    'GENERAL_SUPERVISOR',
    'SUPERVISOR',
    'MARKETER',
    'CUSTOMER',
  ];

  const { rows } = await db.query(`SELECT name FROM roles WHERE deleted_at IS NULL`);
  const existing = new Set(rows.map((r) => r.name));

  for (const roleName of required) {
    if (existing.has(roleName)) continue;
    await db.query(
      `
        INSERT INTO roles (id, name)
        VALUES ($1, $2)
        ON CONFLICT (name) DO NOTHING
      `,
      [randomUUID(), roleName],
    );
  }
}

async function getRoleId(name) {
  const { rows } = await db.query(`SELECT id FROM roles WHERE name = $1`, [name]);
  return rows[0]?.id || null;
}

async function seedBaseData() {
  await ensureRoles();

  const adminRoleId = await getRoleId('ADMIN');
  const adminPasswordHash = await bcrypt.hash('12345678', 10);

  const existingAdmin = await db.query(
    `SELECT id FROM users WHERE phone = $1 LIMIT 1`,
    ['0912345678'],
  );
  const adminUserId = existingAdmin.rows[0]?.id || randomUUID();

  await db.query(
    `
      INSERT INTO users (id, first_name, last_name, phone, password, role_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      ON CONFLICT (phone) DO UPDATE
      SET password = EXCLUDED.password, role_id = EXCLUDED.role_id, is_active = true
    `,
    [adminUserId, 'Asef', 'Tritona', '0912345678', adminPasswordHash, adminRoleId],
  );

  await db.query(
    `
      INSERT INTO employees (id, user_id, branch_id, supervisor_id)
      VALUES ($1, $2, NULL, NULL)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [randomUUID(), adminUserId],
  );

  const governorateId = randomUUID();
  await db.query(
    `
      INSERT INTO governorates (id, name)
      VALUES ($1, $2)
    `,
    [governorateId, `TestGov_${governorateId.slice(0, 8)}`],
  );

  return { governorateId };
}

async function createBranch(governorateId) {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO branches (id, governorate_id)
      VALUES ($1, $2)
    `,
    [id, governorateId],
  );
  return id;
}

async function getEmployeeIdByUserId(userId) {
  const { rows } = await db.query(
    `SELECT id FROM employees WHERE user_id = $1`,
    [userId],
  );
  return rows[0]?.id || null;
}

async function createCategoryDirect(name) {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO categories (id, name)
      VALUES ($1, $2)
    `,
    [id, name],
  );
  return id;
}

async function createProductDirect({ name, categoryId, price = 10, quantity = 100 }) {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO products (id, name, description, price, quantity, category_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [id, name, 'test product', price, quantity, categoryId],
  );
  return id;
}

async function createNotificationDirect({ userId, title, message, isRead = false }) {
  const { rows } = await db.query(
    `
      INSERT INTO notifications (user_id, title, message, is_read)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `,
    [userId, title, message, isRead],
  );
  return rows[0].id;
}

async function createCommissionDirect({ productId = null, company = 30, gs = 10, supervisor = 10 }) {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO commission_settings
      (id, product_id, company_percentage, general_supervisor_percentage, supervisor_percentage)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [id, productId, company, gs, supervisor],
  );
  return id;
}

module.exports = {
  resetDatabase,
  seedBaseData,
  createBranch,
  getEmployeeIdByUserId,
  createCategoryDirect,
  createProductDirect,
  createNotificationDirect,
  createCommissionDirect,
};
