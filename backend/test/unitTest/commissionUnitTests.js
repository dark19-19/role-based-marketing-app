const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const dbUtils = require('../utils/dbUtils');

describe('Commission unit tests', () => {
  test('admin can create a general commission (no product)', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .post('/api/commissions')
      .set(api.authHeader(token))
      .send({
        company_percentage: 30,
        general_supervisor_percentage: 10,
        supervisor_percentage: 10,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.id).toBe('string');
  });

  test('admin can create a product-specific commission', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const categoryId = await dbUtils.createCategoryDirect('CommissionCat');
    const productId = await dbUtils.createProductDirect({
      name: 'CommissionProduct',
      categoryId,
      price: 20,
      quantity: 50,
    });

    const res = await api.request(api.app)
      .post('/api/commissions')
      .set(api.authHeader(token))
      .send({
        product_id: productId,
        company_percentage: 25,
        general_supervisor_percentage: 10,
        supervisor_percentage: 10,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.id).toBe('string');
  });

  test('admin can update a commission', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const created = await api.request(api.app)
      .post('/api/commissions')
      .set(api.authHeader(token))
      .send({
        company_percentage: 20,
        general_supervisor_percentage: 10,
        supervisor_percentage: 10,
      });

    const id = created.body.data.id;

    const res = await api.request(api.app)
      .put(`/api/commissions/${id}`)
      .set(api.authHeader(token))
      .send({
        company_percentage: 22,
        general_supervisor_percentage: 11,
        supervisor_percentage: 10,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('admin fails updating a commission due to invalid UUID', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .put(`/api/commissions/${randomUUID()}`)
      .set(api.authHeader(token))
      .send({
        company_percentage: 22,
        general_supervisor_percentage: 11,
        supervisor_percentage: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Commission not found');
  });

  test('admin fails updating a commission due to invalid inputted percentages', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const created = await api.request(api.app)
      .post('/api/commissions')
      .set(api.authHeader(token))
      .send({
        company_percentage: 20,
        general_supervisor_percentage: 10,
        supervisor_percentage: 10,
      });

    const id = created.body.data.id;

    const res = await api.request(api.app)
      .put(`/api/commissions/${id}`)
      .set(api.authHeader(token))
      .send({
        company_percentage: 80,
        general_supervisor_percentage: 30,
        supervisor_percentage: 10,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Total percentage cannot exceed 100');
  });

  test('admin can delete a commission', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const created = await api.request(api.app)
      .post('/api/commissions')
      .set(api.authHeader(token))
      .send({
        company_percentage: 20,
        general_supervisor_percentage: 10,
        supervisor_percentage: 10,
      });

    const id = created.body.data.id;

    const res = await api.request(api.app)
      .delete(`/api/commissions/${id}`)
      .set(api.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('admin fails deleting a commission due to invalid UUID', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .delete(`/api/commissions/${randomUUID()}`)
      .set(api.authHeader(token));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Commission not found');
  });

  test('admin can list commissions paginated', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    await api.request(api.app)
      .post('/api/commissions')
      .set(api.authHeader(token))
      .send({
        company_percentage: 20,
        general_supervisor_percentage: 10,
        supervisor_percentage: 10,
      });

    const res = await api.request(api.app)
      .get('/api/commissions?page=1&limit=20')
      .set(api.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.pagination).toBeTruthy();
  });

  test('admin can view commission details', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const created = await api.request(api.app)
      .post('/api/commissions')
      .set(api.authHeader(token))
      .send({
        company_percentage: 20,
        general_supervisor_percentage: 10,
        supervisor_percentage: 10,
      });

    const id = created.body.data.id;

    const res = await api.request(api.app)
      .get(`/api/commissions/${id}`)
      .set(api.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(id);
  });

  test('admin fails viewing commission details due to invalid UUID', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .get(`/api/commissions/${randomUUID()}`)
      .set(api.authHeader(token));

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Commission not found');
  });
});

