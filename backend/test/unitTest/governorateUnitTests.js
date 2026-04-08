const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');

describe('Governorate unit tests', () => {
  test('admin can create a new governorate', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .post('/api/governorates')
      .set(api.authHeader(token))
      .send({ name: 'Test Gov' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.body.name).toBe('Test Gov');
  });

  test('admin fails to create a new governorate if he did not input any name', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .post('/api/governorates')
      .set(api.authHeader(token))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('اسم المحافظة مطلوب');
  });

  test('admin can update a governorate name', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const created = await api.request(api.app)
      .post('/api/governorates')
      .set(api.authHeader(token))
      .send({ name: 'Gov Old' });

    const id = created.body.body.id;

    const res = await api.request(api.app)
      .put(`/api/governorates/${id}`)
      .set(api.authHeader(token))
      .send({ name: 'Gov New' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.body.id).toBe(id);
  });

  test('admin fails to update the governorate name due to invalid UUID (governorate not found)', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .put(`/api/governorates/${randomUUID()}`)
      .set(api.authHeader(token))
      .send({ name: 'Does Not Matter' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('المحافظة غير موجودة');
  });

  test('admin can delete a governorate; fails for invalid UUID (governorate not found)', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const created = await api.request(api.app)
      .post('/api/governorates')
      .set(api.authHeader(token))
      .send({ name: 'Gov Delete' });
    const id = created.body.body.id;

    const del = await api.request(api.app)
      .delete(`/api/governorates/${id}`)
      .set(api.authHeader(token));

    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.body.id).toBe(id);

    const missing = await api.request(api.app)
      .delete(`/api/governorates/${randomUUID()}`)
      .set(api.authHeader(token));

    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);
    expect(missing.body.message).toBe('المحافظة غير موجودة');
  });

  test('(Admin, branch manager, marketer, supervisor, general supervisor) can list the governorates paginated', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    await api.request(api.app)
      .post('/api/governorates')
      .set(api.authHeader(adminToken))
      .send({ name: 'Gov List' });

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990040000,
    });

    const staffCreds = [
      { phone: chain.branchManager.phone, password: chain.branchManager.password },
      { phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password },
      { phone: chain.supervisor.phone, password: chain.supervisor.password },
      { phone: chain.marketer.phone, password: chain.marketer.password },
    ];

    const tokens = [adminToken];
    for (const cred of staffCreds) {
      const login = await api.login(cred);
      tokens.push(login.body.data.token);
    }

    for (const token of tokens) {
      const res = await api.request(api.app)
        .get('/api/governorates?page=1&limit=10')
        .set(api.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.body.data)).toBe(true);
      expect(res.body.body.pagination).toBeTruthy();
    }
  });
});

