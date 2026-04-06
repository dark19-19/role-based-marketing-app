const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');

describe('Branch unit tests', () => {
  test('admin can create new branch', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const governorateId = await factories.getAnyGovernorateId();

    const res = await api.request(api.app)
      .post('/api/branches')
      .set(api.authHeader(token))
      .send({ governorate_id: governorateId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.body.governorate_id).toBe(governorateId);
  });

  test('admin fails in creating new branch due to insufficient governorate uuid', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .post('/api/branches')
      .set(api.authHeader(token))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('staff roles can list branches', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();

    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990003000,
    });

    const rolesToLogin = [
      { phone: chain.branchManager.phone, password: chain.branchManager.password },
      { phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password },
      { phone: chain.supervisor.phone, password: chain.supervisor.password },
      { phone: chain.marketer.phone, password: chain.marketer.password },
    ];

    for (const cred of rolesToLogin) {
      const login = await api.login(cred);
      expect(login.status).toBe(200);
      const token = login.body.data.token;

      const res = await api.request(api.app)
        .get('/api/branches?page=1&limit=10')
        .set(api.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.body.data)).toBe(true);
    }
  });

  test('staff roles can get branch by id', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();

    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990004000,
    });

    const rolesToLogin = [
      { phone: chain.branchManager.phone, password: chain.branchManager.password },
      { phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password },
      { phone: chain.supervisor.phone, password: chain.supervisor.password },
      { phone: chain.marketer.phone, password: chain.marketer.password },
    ];

    for (const cred of rolesToLogin) {
      const login = await api.login(cred);
      const token = login.body.data.token;

      const res = await api.request(api.app)
        .get(`/api/branches/${branchId}`)
        .set(api.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.body.id).toBe(branchId);
    }
  });

  test('staff roles fail getting branch by id because branch not found', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();

    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990005000,
    });

    const login = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const token = login.body.data.token;

    const missing = randomUUID();
    const res = await api.request(api.app)
      .get(`/api/branches/${missing}`)
      .set(api.authHeader(token));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('admin can update the status of the branch successfully', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();

    const res = await api.request(api.app)
      .patch(`/api/branches/${branchId}/status`)
      .set(api.authHeader(adminToken))
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.body.id).toBe(branchId);
  });

  test('admin fails updating the status of the branch due to insufficient data', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();

    const res = await api.request(api.app)
      .patch(`/api/branches/${branchId}/status`)
      .set(api.authHeader(adminToken))
      .send({ is_active: 'false' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

