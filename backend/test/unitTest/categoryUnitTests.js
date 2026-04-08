const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');

describe('Category unit tests', () => {
  test('admin can create a new category', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .post('/api/categories')
      .set(api.authHeader(token))
      .send({ name: 'Test Category' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Category');
  });

  test('admin fails to create a new category due to duplicated name', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const first = await api.request(api.app)
      .post('/api/categories')
      .set(api.authHeader(token))
      .send({ name: 'Dup Category' });
    expect(first.status).toBe(201);

    const second = await api.request(api.app)
      .post('/api/categories')
      .set(api.authHeader(token))
      .send({ name: 'Dup Category' });

    expect(second.status).toBe(400);
    expect(second.body.success).toBe(false);
    expect(second.body.error).toBe('category already exists');
  });

  test('employees can list categories', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    await api.request(api.app)
      .post('/api/categories')
      .set(api.authHeader(adminToken))
      .send({ name: 'List Category' });

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990010000,
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
        .get('/api/categories?page=1&limit=20')
        .set(api.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.categories)).toBe(true);
    }
  });

  test('admin can update a category', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const created = await api.request(api.app)
      .post('/api/categories')
      .set(api.authHeader(token))
      .send({ name: 'Old Name' });

    const id = created.body.data.id;

    const res = await api.request(api.app)
      .put(`/api/categories/${id}`)
      .set(api.authHeader(token))
      .send({ name: 'New Name' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('New Name');
  });

  test('admin fails to update a category due to invalid UUID (cat not found)', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .put(`/api/categories/${randomUUID()}`)
      .set(api.authHeader(token))
      .send({ name: 'Does Not Matter' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('category not found');
  });

  test('admin can delete a category', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const created = await api.request(api.app)
      .post('/api/categories')
      .set(api.authHeader(token))
      .send({ name: 'To Delete' });

    const id = created.body.data.id;

    const res = await api.request(api.app)
      .delete(`/api/categories/${id}`)
      .set(api.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('category deleted');
  });

  test('admin fails deleting a category due to invalid UUID (cat not found)', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .delete(`/api/categories/${randomUUID()}`)
      .set(api.authHeader(token));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('category not found');
  });
});

