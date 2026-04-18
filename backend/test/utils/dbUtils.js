const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../../src/helpers/DBHelper');
const couponAvailabilityService = require('../../src/services/couponAvailabilityService');

async function resetDatabase() {
  await db.query(`
    TRUNCATE TABLE
      jwt_tokens,
      reset_keys,
      coupon_usages,
      coupons,
      notifications,
      salary_requests,
      delivery_points,
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

async function createWalletTransactionDirect({
  employeeId,
  amount,
  type = 'BALANCE',
  orderId = null,
}) {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO wallet_transactions (id, employee_id, order_id, amount, type)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [id, employeeId, orderId, amount, type],
  );
  return id;
}

async function createSalaryRequestDirect({ employeeId, amount = 0, status = 'PENDING' }) {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO salary_requests (id, employee_id, requested_amount, status)
      VALUES ($1, $2, $3, $4)
    `,
    [id, employeeId, amount, status],
  );
  return id;
}

async function createDeliveryPointDirect({ branchId, name, fee = 0 }) {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO delivery_points (id, branch_id, name, fee)
      VALUES ($1, $2, $3, $4)
    `,
    [id, branchId, name, fee],
  );
  return id;
}

async function createCouponDirect({
  code,
  discountPercentage = 10,
  numberOfPeople = 10,
  usedCount = 0,
}) {
  const id = randomUUID();
  await db.query(
    `
      INSERT INTO coupons (id, code, discount_percentage, number_of_people, used_count)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [id, String(code).trim().toUpperCase(), discountPercentage, numberOfPeople, usedCount],
  );
  await couponAvailabilityService.syncCoupon({
    id,
    code: String(code).trim().toUpperCase(),
    discount_percentage: discountPercentage,
    number_of_people: numberOfPeople,
    used_count: usedCount,
  });
  return id;
}

async function attachCouponUsageDirect({ customerId, couponId, orderId }) {
  await db.query(
    `
      INSERT INTO coupon_usages (customer_id, coupon_id, order_id)
      VALUES ($1, $2, $3)
    `,
    [customerId, couponId, orderId],
  );
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
  createWalletTransactionDirect,
  createSalaryRequestDirect,
  createDeliveryPointDirect,
  createCouponDirect,
  attachCouponUsageDirect,
};
