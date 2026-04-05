const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const roleSeeder = require('./rolesSeed');
const governorateSeeder = require('./governoratesSeed');

const PREFIX = '0000_0000_';
const USER_TAG = 'SD';
const LOG_PREFIX = '🌱 [Seeder]';

const CONFIG = {
  defaultPassword: '12345678',
  branchesToUse: 4,
  generalSupervisorsPerBranch: { min: 2, max: 3 },
  supervisorsPerGeneralSupervisor: { min: 1, max: 2 },
  marketersPerSupervisor: { min: 2, max: 3 },
  customersPerMarketer: { min: 3, max: 5 },
  ordersPerCustomer: { min: 1, max: 3 },
  orderItemsPerOrder: { min: 1, max: 3 },
  daysBack: 120,
  statusWeights: [
    { value: 'APPROVED', weight: 55 },
    { value: 'PENDING', weight: 15 },
    { value: 'REJECTED', weight: 15 },
    { value: 'CANCELLED', weight: 15 },
  ],
  categories: [
    {
      name: 'Personal Care',
      products: [
        { name: 'Hydrating Serum', price: [18, 30] },
        { name: 'Daily Sunscreen', price: [12, 22] },
        { name: 'Vitamin Cleanser', price: [10, 18] },
        { name: 'Night Repair Cream', price: [20, 35] },
      ],
    },
    {
      name: 'Home Essentials',
      products: [
        { name: 'Aroma Diffuser', price: [22, 38] },
        { name: 'Portable Blender', price: [28, 45] },
        { name: 'Mini Vacuum', price: [30, 55] },
        { name: 'LED Desk Lamp', price: [16, 28] },
      ],
    },
    {
      name: 'Accessories',
      products: [
        { name: 'Smart Bottle', price: [14, 26] },
        { name: 'Canvas Tote', price: [8, 15] },
        { name: 'Travel Organizer', price: [11, 19] },
        { name: 'Wireless Charger', price: [18, 32] },
      ],
    },
    {
      name: 'Nutrition',
      products: [
        { name: 'Protein Oats', price: [13, 24] },
        { name: 'Energy Bites', price: [9, 16] },
        { name: 'Detox Tea', price: [7, 14] },
        { name: 'Vitamin Gummies', price: [11, 20] },
      ],
    },
  ],
  commission: {
    company: { min: 22, max: 28 },
    generalSupervisor: { min: 8, max: 12 },
    supervisor: { min: 10, max: 16 },
  },
  withdrawalRatio: { min: 0.2, max: 0.55 },
};

const FIRST_NAMES = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery', 'Quinn', 'Skyler', 'Charlie', 'Sam', 'Peyton', 'Reese', 'Dakota', 'Hayden', 'Blake', 'Cameron'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas'];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const randomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const item of items) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1].value;
}

function pickMany(items, count) {
  const pool = [...items];
  const picked = [];

  while (pool.length > 0 && picked.length < count) {
    const index = randomInt(0, pool.length - 1);
    picked.push(pool.splice(index, 1)[0]);
  }

  return picked;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function seededLastName(roleName, index) {
  const shortRoleMap = {
    ADMIN: 'AD',
    BRANCH_MANAGER: 'BM',
    GENERAL_SUPERVISOR: 'GS',
    SUPERVISOR: 'SV',
    MARKETER: 'MK',
    CUSTOMER: 'CU',
  };

  return `${USER_TAG}_${shortRoleMap[roleName] || 'US'}_${String(index).padStart(3, '0')}`;
}

function seededText(value) {
  return `${PREFIX}${value}`;
}

async function ensureBranchesExist() {
  const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM branches');
  const count = rows[0]?.count || 0;

  if (count === 0) {
    await governorateSeeder();
  }
}

async function loadRoles(client) {
  const { rows } = await client.query(`
    SELECT id, name
    FROM roles
    WHERE name IN ('ADMIN', 'BRANCH_MANAGER', 'GENERAL_SUPERVISOR', 'SUPERVISOR', 'MARKETER', 'CUSTOMER')
  `);

  const roleMap = rows.reduce((acc, row) => {
    acc[row.name] = row.id;
    return acc;
  }, {});

  const missingRoles = ['ADMIN', 'BRANCH_MANAGER', 'GENERAL_SUPERVISOR', 'SUPERVISOR', 'MARKETER', 'CUSTOMER'].filter((roleName) => !roleMap[roleName]);

  if (missingRoles.length > 0) {
    throw new Error(`Missing roles: ${missingRoles.join(', ')}`);
  }

  return roleMap;
}

async function loadBranches(client) {
  const { rows } = await client.query(
    `
      SELECT
        b.id,
        b.governorate_id,
        g.name AS governorate_name
      FROM branches b
      INNER JOIN governorates g ON g.id = b.governorate_id
      ORDER BY g.name ASC, b.created_at ASC
      LIMIT $1
    `,
    [CONFIG.branchesToUse],
  );

  if (rows.length < CONFIG.branchesToUse) {
    throw new Error(`Need at least ${CONFIG.branchesToUse} branches before seeding dummy data`);
  }

  return rows;
}

async function cleanupSeedData(client) {
  const seededUsers = await client.query(
    `
      SELECT id
      FROM users
      WHERE last_name LIKE $1
    `,
    [`${USER_TAG}_%`],
  );

  const userIds = seededUsers.rows.map((row) => row.id);

  const seededEmployees = userIds.length
    ? await client.query(
        `
          SELECT id
          FROM employees
          WHERE user_id = ANY($1::uuid[])
        `,
        [userIds],
      )
    : { rows: [] };

  const seededCustomers = userIds.length
    ? await client.query(
        `
          SELECT id
          FROM customers
          WHERE user_id = ANY($1::uuid[])
        `,
        [userIds],
      )
    : { rows: [] };

  const employeeIds = seededEmployees.rows.map((row) => row.id);
  const customerIds = seededCustomers.rows.map((row) => row.id);

  const seededOrders = await client.query(
    `
      SELECT id
      FROM orders
      WHERE notes LIKE $1
         OR branch_note LIKE $1
         OR ($2::uuid[] IS NOT NULL AND marketer_id = ANY($2::uuid[]))
         OR ($3::uuid[] IS NOT NULL AND customer_id = ANY($3::uuid[]))
    `,
    [seededText('%'), employeeIds.length ? employeeIds : null, customerIds.length ? customerIds : null],
  );

  const orderIds = seededOrders.rows.map((row) => row.id);

  const seededProducts = await client.query(
    `
      SELECT id
      FROM products
      WHERE description LIKE $1
    `,
    [seededText('%')],
  );

  const productIds = seededProducts.rows.map((row) => row.id);

  if (employeeIds.length > 0 || orderIds.length > 0) {
    await client.query(
      `
        DELETE FROM wallet_transactions
        WHERE ($1::uuid[] IS NOT NULL AND employee_id = ANY($1::uuid[]))
           OR ($2::uuid[] IS NOT NULL AND order_id = ANY($2::uuid[]))
      `,
      [employeeIds.length ? employeeIds : null, orderIds.length ? orderIds : null],
    );
  }

  if (orderIds.length > 0) {
    await client.query(`DELETE FROM order_commissions WHERE order_id = ANY($1::uuid[])`, [orderIds]);
    await client.query(`DELETE FROM order_items WHERE order_id = ANY($1::uuid[])`, [orderIds]);
    await client.query(`DELETE FROM orders WHERE id = ANY($1::uuid[])`, [orderIds]);
  }

  if (customerIds.length > 0) {
    await client.query(`DELETE FROM customers WHERE id = ANY($1::uuid[])`, [customerIds]);
  }

  if (employeeIds.length > 0) {
    await client.query(`DELETE FROM employees WHERE id = ANY($1::uuid[])`, [employeeIds]);
  }

  if (userIds.length > 0) {
    await client.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [userIds]);
  }

  if (productIds.length > 0) {
    await client.query(`DELETE FROM commission_settings WHERE product_id = ANY($1::uuid[])`, [productIds]);
    await client.query(`DELETE FROM product_images WHERE product_id = ANY($1::uuid[])`, [productIds]);
    await client.query(`DELETE FROM products WHERE id = ANY($1::uuid[])`, [productIds]);
  }

  await client.query(`DELETE FROM categories WHERE name LIKE $1`, [`${PREFIX}%`]);
}

async function ensureCompanyAccount(client, roleMap, nextPhone, passwordHash) {
  const existingAdmin = await client.query(`
    SELECT e.id AS employee_id, u.id AS user_id
    FROM employees e
    INNER JOIN users u ON u.id = e.user_id
    WHERE u.role_id = $1
    ORDER BY u.created_at ASC
    LIMIT 1
  `, [roleMap.ADMIN]);

  if (existingAdmin.rows[0]) {
    return existingAdmin.rows[0];
  }

  const userId = randomUUID();
  const employeeId = randomUUID();

  await client.query(
    `
      INSERT INTO users (id, first_name, last_name, phone, password, role_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [userId, 'Seeded', seededLastName('ADMIN', 1), nextPhone(), passwordHash, roleMap.ADMIN],
  );

  await client.query(
    `
      INSERT INTO employees (id, user_id, branch_id, supervisor_id)
      VALUES ($1, $2, NULL, NULL)
    `,
    [employeeId, userId],
  );

  return { employee_id: employeeId, user_id: userId };
}

async function createUser(client, payload) {
  await client.query(
    `
      INSERT INTO users (id, first_name, last_name, phone, password, role_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [payload.id, payload.first_name, payload.last_name, payload.phone, payload.password, payload.role_id],
  );
}

async function createEmployee(client, payload) {
  await client.query(
    `
      INSERT INTO employees (id, user_id, branch_id, supervisor_id)
      VALUES ($1, $2, $3, $4)
    `,
    [payload.id, payload.user_id, payload.branch_id, payload.supervisor_id],
  );
}

async function createCustomer(client, payload) {
  await client.query(
    `
      INSERT INTO customers (id, user_id, governorate_id, referred_by, first_marketer_id)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [payload.id, payload.user_id, payload.governorate_id, payload.referred_by, payload.first_marketer_id],
  );
}

async function createCategory(client, name) {
  const id = randomUUID();
  await client.query(`INSERT INTO categories (id, name) VALUES ($1, $2)`, [id, name]);
  return id;
}

async function createProduct(client, payload) {
  const id = randomUUID();
  await client.query(
    `
      INSERT INTO products
      (id, name, description, price, quantity, in_stock, is_active, category_id, created_at)
      VALUES ($1, $2, $3, $4, $5, true, true, $6, $7)
    `,
    [id, payload.name, payload.description, payload.price, payload.quantity, payload.category_id, payload.created_at],
  );
  await client.query(
    `
      INSERT INTO product_images (id, product_id, image_url, sort_order)
      VALUES ($1, $2, $3, 0)
    `,
    [randomUUID(), id, payload.image_url],
  );
  return id;
}

async function createCommissionSetting(client, payload) {
  await client.query(
    `
      INSERT INTO commission_settings
      (id, product_id, company_percentage, general_supervisor_percentage, supervisor_percentage)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      randomUUID(),
      payload.product_id,
      payload.company_percentage,
      payload.general_supervisor_percentage,
      payload.supervisor_percentage,
    ],
  );
}

function buildUserProfile(roleName, index) {
  return {
    first_name: randomElement(FIRST_NAMES),
    last_name: seededLastName(roleName, index),
  };
}

async function seedHierarchy(client, context) {
  const hierarchy = {
    companyAccount: context.companyAccount,
    branches: [],
    employees: [],
    customers: [],
    marketers: [],
    summaries: {
      BRANCH_MANAGER: 0,
      GENERAL_SUPERVISOR: 0,
      SUPERVISOR: 0,
      MARKETER: 0,
      CUSTOMER: 0,
    },
  };

  let userIndex = 1;
  const nextPhone = context.nextPhone;
  const passwordHash = context.passwordHash;

  const createStaffMember = async ({ roleName, branchId, supervisorId }) => {
    const userId = randomUUID();
    const employeeId = randomUUID();
    const profile = buildUserProfile(roleName, userIndex++);

    await createUser(client, {
      id: userId,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: nextPhone(),
      password: passwordHash,
      role_id: context.roleMap[roleName],
    });

    await createEmployee(client, {
      id: employeeId,
      user_id: userId,
      branch_id: branchId,
      supervisor_id: supervisorId,
    });

    hierarchy.employees.push({ id: employeeId, user_id: userId, role: roleName, branch_id: branchId, supervisor_id: supervisorId });
    hierarchy.summaries[roleName] += 1;

    return { id: employeeId, user_id: userId, role: roleName, branch_id: branchId, supervisor_id: supervisorId };
  };

  const createCustomerNode = async ({ marketer, governorateId }) => {
    const userId = randomUUID();
    const customerId = randomUUID();
    const profile = buildUserProfile('CUSTOMER', userIndex++);

    await createUser(client, {
      id: userId,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: nextPhone(),
      password: passwordHash,
      role_id: context.roleMap.CUSTOMER,
    });

    await createCustomer(client, {
      id: customerId,
      user_id: userId,
      governorate_id: governorateId,
      referred_by: marketer.id,
      first_marketer_id: marketer.id,
    });

    const customer = {
      id: customerId,
      user_id: userId,
      marketer_id: marketer.id,
      branch_id: marketer.branch_id,
      governorate_id: governorateId,
    };

    hierarchy.customers.push(customer);
    hierarchy.summaries.CUSTOMER += 1;

    return customer;
  };

  for (const branch of context.branches) {
    const branchState = { ...branch, manager: null, generalSupervisors: [] };
    const manager = await createStaffMember({
      roleName: 'BRANCH_MANAGER',
      branchId: branch.id,
      supervisorId: null,
    });

    branchState.manager = manager;

    const generalSupervisorCount = randomInt(
      CONFIG.generalSupervisorsPerBranch.min,
      CONFIG.generalSupervisorsPerBranch.max,
    );

    for (let gsIndex = 0; gsIndex < generalSupervisorCount; gsIndex += 1) {
      const generalSupervisor = await createStaffMember({
        roleName: 'GENERAL_SUPERVISOR',
        branchId: branch.id,
        supervisorId: manager.id,
      });

      const generalSupervisorState = { ...generalSupervisor, supervisors: [] };
      const supervisorsCount = randomInt(
        CONFIG.supervisorsPerGeneralSupervisor.min,
        CONFIG.supervisorsPerGeneralSupervisor.max,
      );

      for (let supervisorIndex = 0; supervisorIndex < supervisorsCount; supervisorIndex += 1) {
        const supervisor = await createStaffMember({
          roleName: 'SUPERVISOR',
          branchId: branch.id,
          supervisorId: generalSupervisor.id,
        });

        const supervisorState = { ...supervisor, general_supervisor_id: generalSupervisor.id, marketers: [] };
        const marketersCount = randomInt(
          CONFIG.marketersPerSupervisor.min,
          CONFIG.marketersPerSupervisor.max,
        );

        for (let marketerIndex = 0; marketerIndex < marketersCount; marketerIndex += 1) {
          const marketer = await createStaffMember({
            roleName: 'MARKETER',
            branchId: branch.id,
            supervisorId: supervisor.id,
          });

          const marketerState = {
            ...marketer,
            supervisor_id: supervisor.id,
            general_supervisor_id: generalSupervisor.id,
            customers: [],
          };

          hierarchy.marketers.push(marketerState);

          const customersCount = randomInt(
            CONFIG.customersPerMarketer.min,
            CONFIG.customersPerMarketer.max,
          );

          for (let customerIndex = 0; customerIndex < customersCount; customerIndex += 1) {
            const customer = await createCustomerNode({
              marketer: marketerState,
              governorateId: branch.governorate_id,
            });

            marketerState.customers.push(customer);
          }

          supervisorState.marketers.push(marketerState);
        }

        generalSupervisorState.supervisors.push(supervisorState);
      }

      branchState.generalSupervisors.push(generalSupervisorState);
    }

    hierarchy.branches.push(branchState);
  }

  return hierarchy;
}

async function seedCatalog(client) {
  const products = [];

  for (const categoryDefinition of CONFIG.categories) {
    const categoryId = await createCategory(client, seededText(categoryDefinition.name));

    for (const productDefinition of categoryDefinition.products) {
      const productId = await createProduct(client, {
        name: productDefinition.name,
        description: seededText(`${categoryDefinition.name} ${productDefinition.name}`),
        price: randomFloat(productDefinition.price[0], productDefinition.price[1]),
        quantity: randomInt(180, 320),
        category_id: categoryId,
        image_url: `https://dummy.local/${PREFIX.toLowerCase()}${productDefinition.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        created_at: randomDate(addDays(new Date(), -CONFIG.daysBack), new Date()),
      });

      const companyPercentage = randomFloat(CONFIG.commission.company.min, CONFIG.commission.company.max);
      const generalSupervisorPercentage = randomFloat(CONFIG.commission.generalSupervisor.min, CONFIG.commission.generalSupervisor.max);
      const supervisorPercentage = randomFloat(CONFIG.commission.supervisor.min, CONFIG.commission.supervisor.max);

      await createCommissionSetting(client, {
        product_id: productId,
        company_percentage: companyPercentage,
        general_supervisor_percentage: generalSupervisorPercentage,
        supervisor_percentage: supervisorPercentage,
      });

      products.push({
        id: productId,
        name: productDefinition.name,
        price: randomFloat(productDefinition.price[0], productDefinition.price[1]),
        commission: {
          company: companyPercentage,
          generalSupervisor: generalSupervisorPercentage,
          supervisor: supervisorPercentage,
        },
      });
    }
  }

  const seededProducts = await client.query(
    `
      SELECT
        p.id,
        p.name,
        p.price::numeric AS price,
        cs.company_percentage,
        cs.general_supervisor_percentage,
        cs.supervisor_percentage
      FROM products p
      INNER JOIN commission_settings cs ON cs.product_id = p.id
      WHERE p.description LIKE $1
    `,
    [seededText('%')],
  );

  return seededProducts.rows.map((row) => ({
    id: row.id,
    name: row.name,
    price: parseFloat(row.price),
    commission: {
      company: parseFloat(row.company_percentage),
      generalSupervisor: parseFloat(row.general_supervisor_percentage),
      supervisor: parseFloat(row.supervisor_percentage),
    },
  }));
}

function buildOrderItems(products) {
  const itemsCount = randomInt(CONFIG.orderItemsPerOrder.min, CONFIG.orderItemsPerOrder.max);
  const chosenProducts = pickMany(products, itemsCount);

  return chosenProducts.map((product) => {
    const quantity = randomInt(1, 4);
    const soldPrice = parseFloat((product.price + randomFloat(0, Math.max(1, product.price * 0.25))).toFixed(2));

    return {
      product_id: product.id,
      quantity,
      main_price: product.price,
      sold_price: soldPrice,
      commission: product.commission,
    };
  });
}

async function createOrder(client, payload) {
  await client.query(
    `
      INSERT INTO orders
      (id, customer_id, marketer_id, branch_id, status, total_main_price, total_sold_price, notes, branch_note, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `,
    [
      payload.id,
      payload.customer_id,
      payload.marketer_id,
      payload.branch_id,
      payload.status,
      payload.total_main_price,
      payload.total_sold_price,
      payload.notes,
      payload.branch_note,
      payload.created_at,
    ],
  );
}

async function createOrderItems(client, orderId, items) {
  for (const item of items) {
    await client.query(
      `
        INSERT INTO order_items
        (id, order_id, product_id, quantity, main_price, sold_price)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [randomUUID(), orderId, item.product_id, item.quantity, item.main_price, item.sold_price],
    );
  }
}

async function createApprovedOrderFinancials(client, payload) {
  await client.query(
    `
      INSERT INTO order_commissions
      (id, order_id, company_amount, general_supervisor_amount, supervisor_amount, marketer_amount, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      randomUUID(),
      payload.order_id,
      payload.company_amount,
      payload.general_supervisor_amount,
      payload.supervisor_amount,
      payload.marketer_amount,
      payload.created_at,
    ],
  );

  if (payload.company_employee_id) {
    await client.query(
      `
        INSERT INTO wallet_transactions
        (id, employee_id, order_id, amount, type, created_at)
        VALUES ($1, $2, $3, $4, 'BALANCE', $5)
      `,
      [randomUUID(), payload.company_employee_id, payload.order_id, payload.company_amount, payload.created_at],
    );
  }

  await client.query(
    `
      INSERT INTO wallet_transactions
      (id, employee_id, order_id, amount, type, created_at)
      VALUES ($1, $2, $3, $4, 'BALANCE', $5)
    `,
    [randomUUID(), payload.general_supervisor_id, payload.order_id, payload.general_supervisor_amount, payload.created_at],
  );

  await client.query(
    `
      INSERT INTO wallet_transactions
      (id, employee_id, order_id, amount, type, created_at)
      VALUES ($1, $2, $3, $4, 'BALANCE', $5)
    `,
    [randomUUID(), payload.supervisor_id, payload.order_id, payload.supervisor_amount, payload.created_at],
  );

  await client.query(
    `
      INSERT INTO wallet_transactions
      (id, employee_id, order_id, amount, type, created_at)
      VALUES ($1, $2, $3, $4, 'BALANCE', $5)
    `,
    [randomUUID(), payload.marketer_id, payload.order_id, payload.marketer_amount, payload.created_at],
  );
}

async function seedOrders(client, hierarchy, products) {
  const orders = [];
  const earnings = new Map();
  const statusSummary = {
    APPROVED: 0,
    PENDING: 0,
    REJECTED: 0,
    CANCELLED: 0,
  };

  const addEarning = (employeeId, amount) => {
    earnings.set(employeeId, parseFloat(((earnings.get(employeeId) || 0) + amount).toFixed(2)));
  };

  for (const marketer of hierarchy.marketers) {
    for (const customer of marketer.customers) {
      const ordersCount = randomInt(CONFIG.ordersPerCustomer.min, CONFIG.ordersPerCustomer.max);

      for (let orderIndex = 0; orderIndex < ordersCount; orderIndex += 1) {
        const status = weightedRandom(CONFIG.statusWeights);
        const createdAt = randomDate(addDays(new Date(), -CONFIG.daysBack), new Date());
        const items = buildOrderItems(products);

        const totalMainPrice = parseFloat(
          items.reduce((sum, item) => sum + item.main_price * item.quantity, 0).toFixed(2),
        );
        const totalSoldPrice = parseFloat(
          items.reduce((sum, item) => sum + item.sold_price * item.quantity, 0).toFixed(2),
        );

        const orderId = randomUUID();
        const branchNote = status === 'PENDING'
          ? null
          : seededText(`${status} order reviewed at branch level`);

        await createOrder(client, {
          id: orderId,
          customer_id: customer.id,
          marketer_id: marketer.id,
          branch_id: marketer.branch_id,
          status,
          total_main_price: totalMainPrice,
          total_sold_price: totalSoldPrice,
          notes: seededText(`Customer ${customer.id} order ${orderIndex + 1}`),
          branch_note: branchNote,
          created_at: createdAt,
        });

        await createOrderItems(client, orderId, items);

        if (status === 'APPROVED') {
          const commissionBase = items.reduce((acc, item) => {
            const lineMainTotal = item.main_price * item.quantity;
            acc.company += lineMainTotal * (item.commission.company / 100);
            acc.generalSupervisor += lineMainTotal * (item.commission.generalSupervisor / 100);
            acc.supervisor += lineMainTotal * (item.commission.supervisor / 100);
            return acc;
          }, { company: 0, generalSupervisor: 0, supervisor: 0 });

          const companyAmount = parseFloat(commissionBase.company.toFixed(2));
          const generalSupervisorAmount = parseFloat(commissionBase.generalSupervisor.toFixed(2));
          const supervisorAmount = parseFloat(commissionBase.supervisor.toFixed(2));
          const marketerAmount = parseFloat(
            (
              totalSoldPrice -
              companyAmount -
              generalSupervisorAmount -
              supervisorAmount
            ).toFixed(2),
          );

          await createApprovedOrderFinancials(client, {
            order_id: orderId,
            company_employee_id: hierarchy.companyAccount.employee_id || null,
            general_supervisor_id: marketer.general_supervisor_id,
            supervisor_id: marketer.supervisor_id,
            marketer_id: marketer.id,
            company_amount: companyAmount,
            general_supervisor_amount: generalSupervisorAmount,
            supervisor_amount: supervisorAmount,
            marketer_amount: marketerAmount,
            created_at: createdAt,
          });

          if (hierarchy.companyAccount.employee_id) {
            addEarning(hierarchy.companyAccount.employee_id, companyAmount);
          }
          addEarning(marketer.general_supervisor_id, generalSupervisorAmount);
          addEarning(marketer.supervisor_id, supervisorAmount);
          addEarning(marketer.id, marketerAmount);
        }

        statusSummary[status] += 1;
        orders.push({
          id: orderId,
          status,
          created_at: createdAt,
          marketer_id: marketer.id,
          customer_id: customer.id,
        });
      }
    }
  }

  return { orders, earnings, statusSummary };
}

async function seedWithdrawals(client, hierarchy, earnings) {
  let withdrawalsCount = 0;

  for (const employee of hierarchy.employees) {
    const earnedAmount = earnings.get(employee.id) || 0;

    if (earnedAmount <= 0 || employee.role === 'BRANCH_MANAGER') {
      continue;
    }

    const withdrawalAmount = parseFloat(
      (earnedAmount * randomFloat(CONFIG.withdrawalRatio.min, CONFIG.withdrawalRatio.max)).toFixed(2),
    );

    if (withdrawalAmount <= 0) {
      continue;
    }

    await client.query(
      `
        INSERT INTO wallet_transactions
        (id, employee_id, order_id, amount, type, created_at)
        VALUES ($1, $2, NULL, $3, 'WITHDREW', $4)
      `,
      [
        randomUUID(),
        employee.id,
        withdrawalAmount,
        randomDate(addDays(new Date(), -Math.ceil(CONFIG.daysBack / 3)), new Date()),
      ],
    );

    withdrawalsCount += 1;
  }

  return withdrawalsCount;
}

async function seed() {
  console.log(`${LOG_PREFIX} Starting comprehensive seed process...`);

  try {
    await roleSeeder();
    await ensureBranchesExist();

    const phoneState = { sequence: 1000000 };
    const nextPhone = () => {
      const phone = `09${String(phoneState.sequence).padStart(8, '0')}`;
      phoneState.sequence += 1;
      return phone;
    };

    const passwordHash = await bcrypt.hash(CONFIG.defaultPassword, 10);

    const summary = await db.runInTransaction(async (client) => {
      await cleanupSeedData(client);

      const roleMap = await loadRoles(client);
      const branches = await loadBranches(client);
      const companyAccount = await ensureCompanyAccount(client, roleMap, nextPhone, passwordHash);
      const context = { roleMap, branches, companyAccount, nextPhone, passwordHash };

      const hierarchy = await seedHierarchy(client, context);
      const products = await seedCatalog(client);
      const orderResult = await seedOrders(client, hierarchy, products);
      const withdrawalsCount = await seedWithdrawals(client, hierarchy, orderResult.earnings);

      return {
        branches: hierarchy.branches.length,
        employees: hierarchy.employees.length,
        customers: hierarchy.customers.length,
        products: products.length,
        orders: orderResult.orders.length,
        withdrawals: withdrawalsCount,
        roles: hierarchy.summaries,
        statuses: orderResult.statusSummary,
      };
    });

    console.log(`${LOG_PREFIX} ✅ Dummy data ready`);
    console.log(`${LOG_PREFIX} Branches: ${summary.branches}`);
    console.log(`${LOG_PREFIX} Employees: ${summary.employees}`);
    console.log(`${LOG_PREFIX} Customers: ${summary.customers}`);
    console.log(`${LOG_PREFIX} Products: ${summary.products}`);
    console.log(`${LOG_PREFIX} Orders: ${summary.orders}`);
    console.log(`${LOG_PREFIX} Withdrawals: ${summary.withdrawals}`);
    console.log(`${LOG_PREFIX} Role counts:`, summary.roles);
    console.log(`${LOG_PREFIX} Status counts:`, summary.statuses);

    return summary;
  } catch (err) {
    console.error(`${LOG_PREFIX} ❌ Seeding failed:`, err);
    process.exit(1);
  }
}

module.exports = seed;

if (require.main === module) {
  seed();
}
