const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const dbUtils = require('../utils/dbUtils');
const db = require('../../src/helpers/DBHelper');

describe('Order unit tests', () => {
  async function setupCatalog() {
    const categoryId = await dbUtils.createCategoryDirect('OrdersCat');
    const productId = await dbUtils.createProductDirect({
      name: 'OrdersProduct',
      categoryId,
      price: 10,
      quantity: 100,
    });
    await dbUtils.createCommissionDirect({ productId: null, company: 20, gs: 10, supervisor: 10 });
    return { categoryId, productId };
  }

  async function setupBranchAndChain() {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;
    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990060000,
    });
    return { adminToken, branchId, chain };
  }

  async function createCustomerViaMarketer({ marketerToken, governorateId, phone = '0996000001' }) {
    const res = await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(marketerToken))
      .send({
        first_name: 'Cust',
        last_name: 'Orders',
        phone,
        password: 'custpass123',
        governorate_id: governorateId,
      });
    expect(res.status).toBe(200);
    return { customerId: res.body.data.id, phone, password: 'custpass123' };
  }

  test('(Marketer, supervisor, general supervisor, customer) can create an order', async () => {
    const { productId } = await setupCatalog();
    const { branchId, chain, adminToken } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const supervisorLogin = await api.login({ phone: chain.supervisor.phone, password: chain.supervisor.password });
    const gsLogin = await api.login({ phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password });

    const { customerId, phone: customerPhone, password: customerPass } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0996000010',
    });
    const customerLogin = await api.login({ phone: customerPhone, password: customerPass });

    const creators = [
      { role: 'MARKETER', token: marketerLogin.body.data.token },
      { role: 'SUPERVISOR', token: supervisorLogin.body.data.token },
      { role: 'GENERAL_SUPERVISOR', token: gsLogin.body.data.token },
      { role: 'CUSTOMER', token: customerLogin.body.data.token },
    ];

    for (const creator of creators) {
      const res = await factories.createOrder(creator.token, {
        customer_id: customerId,
        branch_id: branchId,
        sold_price: 10,
        notes: `${creator.role} order`,
        items: [{ product_id: productId, quantity: 1 }],
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('string');
    }
  });

  test('same roles fails to create an order due to undefined creator (invalid token)', async () => {
    const { productId } = await setupCatalog();
    const { branchId } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;
    const chain = await factories.createStaffChain({ token: adminToken, branchId, phoneBase: 990060100 });
    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const { customerId } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0996000020',
    });

    const res = await api.request(api.app).post('/api/orders').send({
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(res.status).toBe(401);
  });

  test('same roles fails to create an order due to undefined customer or invalid UUID (customer not found)', async () => {
    const { productId } = await setupCatalog();
    const { branchId, chain } = await setupBranchAndChain();

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const token = marketerLogin.body.data.token;

    const missingCustomer = await factories.createOrder(token, {
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(missingCustomer.status).toBe(400);
    expect(missingCustomer.body.success).toBe(false);

    const invalidCustomer = await factories.createOrder(token, {
      customer_id: randomUUID(),
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(invalidCustomer.status).toBe(400);
    expect(invalidCustomer.body.message).toBe('Customer not found');
  });

  test('same roles fails to create an order due to invalid UUID (marketer employee not found)', async () => {
    const { productId } = await setupCatalog();
    const { branchId, chain } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const gsLogin = await api.login({ phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password });
    const gsToken = gsLogin.body.data.token;

    const newSupervisorPhone = '0996000031';
    const newSupervisorPassword = 'pass12345';
    const newSupervisorCreate = await factories.createEmployee(gsToken, {
      first_name: 'SV',
      last_name: 'Detached',
      phone: newSupervisorPhone,
      password: newSupervisorPassword,
      role: 'SUPERVISOR',
      branchId,
      supervisorId: chain.generalSupervisor.employeeId,
    });
    expect(newSupervisorCreate.status).toBe(201);
    const detachedSupervisorEmployeeId = newSupervisorCreate.body.body.employee_id;

    const supervisorLogin = await api.login({ phone: newSupervisorPhone, password: newSupervisorPassword });
    const token = supervisorLogin.body.data.token;

    const { customerId } = await createCustomerViaMarketer({
      marketerToken: (await api.login({ phone: chain.marketer.phone, password: chain.marketer.password })).body.data.token,
      governorateId,
      phone: '0996000030',
    });

    await db.query(`DELETE FROM employees WHERE id = $1`, [detachedSupervisorEmployeeId]);

    const res = await factories.createOrder(token, {
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Employee not found');
  });

  test('same roles fails to create an order due to invalid UUID (branch not found)', async () => {
    const { productId } = await setupCatalog();
    const { chain } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const token = marketerLogin.body.data.token;
    const { customerId } = await createCustomerViaMarketer({
      marketerToken: token,
      governorateId,
      phone: '0996000040',
    });

    const res = await factories.createOrder(token, {
      customer_id: customerId,
      branch_id: randomUUID(),
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Branch not found');
  });

  test('same roles fails to create an order due to invalid UUIDs (products not found)', async () => {
    const { branchId, chain } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const token = marketerLogin.body.data.token;

    const { customerId } = await createCustomerViaMarketer({
      marketerToken: token,
      governorateId,
      phone: '0996000050',
    });

    const badProductId = randomUUID();
    const res = await factories.createOrder(token, {
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: badProductId, quantity: 1 }],
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid product');
  });

  test('branch manager can approve order in his branch; fails due to invalid UUID or status not pending', async () => {
    const { productId } = await setupCatalog();
    const { branchId, chain } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const bmLogin = await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password });

    const { customerId } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0996000060',
    });

    const created = await factories.createOrder(marketerLogin.body.data.token, {
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    const orderId = created.body.data.id;

    const approve = await api.request(api.app)
      .put(`/api/orders/${orderId}/approve`)
      .set(api.authHeader(bmLogin.body.data.token));
    expect(approve.status).toBe(200);
    expect(approve.body.success).toBe(true);

    const approveAgain = await api.request(api.app)
      .put(`/api/orders/${orderId}/approve`)
      .set(api.authHeader(bmLogin.body.data.token));
    expect(approveAgain.status).toBe(400);
    expect(approveAgain.body.success).toBe(false);

    const missing = await api.request(api.app)
      .put(`/api/orders/${randomUUID()}/approve`)
      .set(api.authHeader(bmLogin.body.data.token));
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe('Order not found');
  });

  test('branch manager can reject an order; fails due to invalid UUID or status not pending', async () => {
    const { productId } = await setupCatalog();
    const { branchId, chain } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const bmLogin = await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password });

    const { customerId } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0996000070',
    });

    const created = await factories.createOrder(marketerLogin.body.data.token, {
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    const orderId = created.body.data.id;

    const reject = await api.request(api.app)
      .put(`/api/orders/${orderId}/reject`)
      .set(api.authHeader(bmLogin.body.data.token));
    expect(reject.status).toBe(200);
    expect(reject.body.success).toBe(true);

    const rejectAgain = await api.request(api.app)
      .put(`/api/orders/${orderId}/reject`)
      .set(api.authHeader(bmLogin.body.data.token));
    expect(rejectAgain.status).toBe(400);
    expect(rejectAgain.body.success).toBe(false);

    const missing = await api.request(api.app)
      .put(`/api/orders/${randomUUID()}/reject`)
      .set(api.authHeader(bmLogin.body.data.token));
    expect(missing.status).toBe(400);
    expect(missing.body.message).toBe('Order not found');
  });

  test('roles can cancel orders with role rules; fail cases for status and not found', async () => {
    const { productId } = await setupCatalog();
    const { branchId, chain, adminToken } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const bmLogin = await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password });

    const { customerId, phone: customerPhone, password: customerPass } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0996000080',
    });
    const customerLogin = await api.login({ phone: customerPhone, password: customerPass });

    const createdByMarketer = await factories.createOrder(marketerLogin.body.data.token, {
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    const orderId = createdByMarketer.body.data.id;

    const cancelByOwnerCustomer = await api.request(api.app)
      .put(`/api/orders/${orderId}/cancel`)
      .set(api.authHeader(customerLogin.body.data.token));
    expect(cancelByOwnerCustomer.status).toBe(200);
    expect(cancelByOwnerCustomer.body.success).toBe(true);

    const cancelByBM = await api.request(api.app)
      .put(`/api/orders/${orderId}/cancel`)
      .set(api.authHeader(bmLogin.body.data.token));
    expect(cancelByBM.status).toBe(400);
    expect(cancelByBM.body.success).toBe(false);

    const cancelAgain = await api.request(api.app)
      .put(`/api/orders/${orderId}/cancel`)
      .set(api.authHeader(bmLogin.body.data.token));
    expect(cancelAgain.status).toBe(400);
    expect(cancelAgain.body.message).toBe('Order is already cancelled');

    const createdForApprove = await factories.createOrder(marketerLogin.body.data.token, {
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    const orderToApprove = createdForApprove.body.data.id;
    await api.request(api.app)
      .put(`/api/orders/${orderToApprove}/approve`)
      .set(api.authHeader(bmLogin.body.data.token));

    const cancelApproved = await api.request(api.app)
      .put(`/api/orders/${orderToApprove}/cancel`)
      .set(api.authHeader(adminToken));

    expect(cancelApproved.status).toBe(400);
    expect(cancelApproved.body.message).toBe('Only pending orders can be cancelled');

    const cancelMissing = await api.request(api.app)
      .put(`/api/orders/${randomUUID()}/cancel`)
      .set(api.authHeader(bmLogin.body.data.token));
    expect(cancelMissing.status).toBe(400);
    expect(cancelMissing.body.message).toBe('Order not found');
  });

  test('roles can list orders paginated; fails to list orders due to invalid token', async () => {
    const { productId } = await setupCatalog();
    const { branchId, chain, adminToken } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const bmLogin = await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password });

    const { customerId, phone: customerPhone, password: customerPass } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0996000090',
    });
    const customerLogin = await api.login({ phone: customerPhone, password: customerPass });

    await factories.createOrder(marketerLogin.body.data.token, {
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });

    const tokens = [
      adminToken,
      bmLogin.body.data.token,
      marketerLogin.body.data.token,
      customerLogin.body.data.token,
    ];

    for (const token of tokens) {
      const res = await api.request(api.app)
        .get('/api/orders?page=1&limit=10')
        .set(api.authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.body.data)).toBe(true);
    }

    const invalidToken = await api.request(api.app)
      .get('/api/orders?page=1&limit=10')
      .set({ Authorization: 'Bearer invalid.token.value' });
    expect(invalidToken.status).toBe(401);
  });

  test('roles can get the order details; fails due to invalid UUID (order not found)', async () => {
    const { productId } = await setupCatalog();
    const { branchId, chain } = await setupBranchAndChain();
    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });

    const { customerId } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0996000100',
    });

    const created = await factories.createOrder(marketerLogin.body.data.token, {
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    const orderId = created.body.data.id;

    const ok = await api.request(api.app)
      .get(`/api/orders/${orderId}`)
      .set(api.authHeader(marketerLogin.body.data.token));
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);
    expect(ok.body.body.id).toBe(orderId);

    const missing = await api.request(api.app)
      .get(`/api/orders/${randomUUID()}`)
      .set(api.authHeader(marketerLogin.body.data.token));
    expect(missing.status).toBe(404);
    expect(missing.body.success).toBe(false);
  });
});
