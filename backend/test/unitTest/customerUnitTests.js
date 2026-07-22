const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const dbUtils = require('../utils/dbUtils');

describe('Customer unit tests', () => {
  test('(Marketer, Supervisor, General Supervisor) can create a new customer', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990020000,
    });

    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    expect(marketerLogin.status).toBe(200);

    const res = await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(marketerLogin.body.data.token))
      .send({
        first_name: 'Cust',
        last_name: 'One',
        phone: '0991000001',
        password: 'custpass123',
        governorate_id: governorateId,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.id).toBe('string');
  });

  test('(Marketer, Supervisor, General Supervisor) fails creating a new customer due to duplicated phone number', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990021000,
    });

    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const token = marketerLogin.body.data.token;

    const first = await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(token))
      .send({
        first_name: 'Cust',
        last_name: 'Dup',
        phone: '0994000002',
        password: 'custpass123',
        governorate_id: governorateId,
      });
    expect(first.status).toBe(200);

    const second = await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(token))
      .send({
        first_name: 'Cust',
        last_name: 'Dup2',
        phone: '0994000002',
        password: 'custpass123',
        governorate_id: governorateId,
      });

    expect(second.status).toBe(400);
    expect(second.body.success).toBe(false);
    expect(second.body.message).toBe('رقم الهاتف مستخدم مسبقاً');
  });

  test('(Marketer, Supervisor, General Supervisor, Admin) can list customers paginated', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990022000,
    });

    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(marketerLogin.body.data.token))
      .send({
        first_name: 'Cust',
        last_name: 'ForList',
        phone: '0991000003',
        password: 'custpass123',
        governorate_id: governorateId,
      });

    const tokens = [
      adminToken,
      (await api.login({ phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password })).body.data.token,
      (await api.login({ phone: chain.supervisor.phone, password: chain.supervisor.password })).body.data.token,
      marketerLogin.body.data.token,
    ];

    for (const token of tokens) {
      const res = await api.request(api.app)
        .get('/api/customers?page=1&limit=20')
        .set(api.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.data)).toBe(true);
    }
  });

  test('all employees can show customer details', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990023000,
    });

    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const customerCreate = await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(marketerLogin.body.data.token))
      .send({
        first_name: 'Cust',
        last_name: 'Details',
        phone: '0991000004',
        password: 'custpass123',
        governorate_id: governorateId,
      });
    const customerId = customerCreate.body.data.id;

    const staffTokens = [
      adminToken,
      (await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password })).body.data.token,
      (await api.login({ phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password })).body.data.token,
      (await api.login({ phone: chain.supervisor.phone, password: chain.supervisor.password })).body.data.token,
      marketerLogin.body.data.token,
    ];

    for (const token of staffTokens) {
      const res = await api.request(api.app)
        .get(`/api/customers/${customerId}`)
        .set(api.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(customerId);
    }
  });

  test('(Marketer, Supervisor, General Supervisor) cannot see CUSTOMER_APP orders in customer details', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990025000,
    });

    const governorateId = await factories.getAnyGovernorateId();

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const marketerToken = marketerLogin.body.data.token;

    const phone = '0991000100';
    const password = 'custpass123';

    const customerCreate = await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(marketerToken))
      .send({
        first_name: 'Cust',
        last_name: 'Filter',
        phone,
        password,
        governorate_id: governorateId,
      });
    expect(customerCreate.status).toBe(200);
    const customerId = customerCreate.body.data.id;

    const register = await api.registerCustomer({
      first_name: 'Cust',
      last_name: 'Filter',
      phone,
      password,
    });
    expect(register.status).toBe(201);

    const customerLogin = await api.login({ phone, password });
    expect(customerLogin.status).toBe(200);
    const customerToken = customerLogin.body.data.token;

    const deliveryPointId = await factories.createDeliveryPoint(branchId);
    const categoryId = await dbUtils.createCategoryDirect('Cat_Filter');
    const productId = await dbUtils.createProductDirect({
      name: 'Prod_Filter',
      categoryId,
      price: 10,
      quantity: 100,
    });

    const staffOrder = await factories.createOrder(marketerToken, {
      customer_id: customerId,
      branch_id: branchId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(staffOrder.status).toBe(200);
    const staffOrderId = staffOrder.body.data.id;

    const customerOrder = await factories.createOrder(customerToken, {
      branch_id: branchId,
      delivery_point_id: deliveryPointId,
      sold_price: 10,
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(customerOrder.status).toBe(200);
    const customerOrderId = customerOrder.body.data.id;

    const tokens = [
      marketerToken,
      (await api.login({ phone: chain.supervisor.phone, password: chain.supervisor.password })).body.data.token,
      (await api.login({ phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password })).body.data.token,
    ];

    for (const token of tokens) {
      const res = await api.request(api.app)
        .get(`/api/customers/${customerId}`)
        .set(api.authHeader(token));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
      const orderIds = res.body.data.orders.map((o) => o.id);
      expect(orderIds).toContain(staffOrderId);
      expect(orderIds).not.toContain(customerOrderId);
    }
  });

  test('all employees fails to show customer details due to invalid UUID (customer not found)', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990024000,
    });

    const login = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });

    const res = await api.request(api.app)
      .get(`/api/customers/${randomUUID()}`)
      .set(api.authHeader(login.body.data.token));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Customer not found');
  });

  test('customer can list governorates and set governorate_id as many times as he wants (Relaxing Constraints) - (self-registered customer)', async () => {
    const phone = '0991000099';
    const password = 'custpass123';

    const register = await api.registerCustomer({
      first_name: 'Self',
      last_name: 'Gov',
      phone,
      password,
    });
    expect(register.status).toBe(201);

    const login = await api.login({ phone, password });
    expect(login.status).toBe(200);
    const token = login.body.data.token;
    expect(login.body.data.governorate_id).toBeNull();

    const listGovs = await api.request(api.app)
      .get('/api/governorates?page=1&limit=20')
      .set(api.authHeader(token));
    expect(listGovs.status).toBe(200);
    expect(listGovs.body.success).toBe(true);
    expect(Array.isArray(listGovs.body.body.data)).toBe(true);

    const governorateId = await factories.getAnyGovernorateId();
    const update = await api.request(api.app)
      .patch('/api/customers/me/governorate')
      .set(api.authHeader(token))
      .send({ governorate_id: governorateId });
    expect(update.status).toBe(200);
    expect(update.body.success).toBe(true);
    expect(update.body.data.governorate_id).toBe(governorateId);

    const updateAgain = await api.request(api.app)
      .patch('/api/customers/me/governorate')
      .set(api.authHeader(token))
      .send({ governorate_id: governorateId });
    expect(updateAgain.status).toBe(200);
    expect(update.body.success).toBe(true);
    expect(update.body.data.governorate_id).toBe(governorateId);
  });
});
