const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const cacheAside = require('../../src/patterns/CacheAside');

describe('Product unit tests', () => {
  beforeEach(() => {
    cacheAside.clear();
  });

  async function createCategoryAsAdmin(token, name = 'ProdCat') {
    const res = await api.request(api.app)
      .post('/api/categories')
      .set(api.authHeader(token))
      .send({ name });
    expect(res.status).toBe(201);
    return res.body.data.id;
  }

  test('admin can create product', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const categoryId = await createCategoryAsAdmin(token, 'ProdCatCreate');

    const res = await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(token))
      .send({
        name: 'Test Product',
        description: 'Test Desc',
        price: 10,
        quantity: 50,
        category_id: categoryId,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.name).toBe('Test Product');
  });

  test('admin fails to create a product due to invalid UUID (category not found)', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(token))
      .send({
        name: 'Bad Product',
        description: 'Bad',
        price: 10,
        quantity: 50,
        category_id: randomUUID(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('all roles can get products paginated', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const categoryId = await createCategoryAsAdmin(adminToken, 'ProdCatList');

    await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(adminToken))
      .send({
        name: 'List Product',
        description: 'List',
        price: 10,
        quantity: 50,
        category_id: categoryId,
      });

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990070000,
    });

    const creds = [
      { phone: chain.branchManager.phone, password: chain.branchManager.password },
      { phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password },
      { phone: chain.supervisor.phone, password: chain.supervisor.password },
      { phone: chain.marketer.phone, password: chain.marketer.password },
    ];

    const tokens = [adminToken];
    for (const c of creds) {
      const login = await api.login(c);
      tokens.push(login.body.data.token);
    }

    for (const token of tokens) {
      const res = await api.request(api.app)
        .get('/api/products?page=1&limit=10')
        .set(api.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.products)).toBe(true);
      expect(res.body.data.pagination).toBeTruthy();
    }
  });

  test('products list can be filtered by category (optional)', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const categoryA = await createCategoryAsAdmin(adminToken, `ProdCatA_${randomUUID().slice(0, 6)}`);
    const categoryB = await createCategoryAsAdmin(adminToken, `ProdCatB_${randomUUID().slice(0, 6)}`);
    const emptyCategory = await createCategoryAsAdmin(adminToken, `ProdCatEmpty_${randomUUID().slice(0, 6)}`);

    await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(adminToken))
      .send({
        name: 'CatA Product',
        description: 'A',
        price: 10,
        quantity: 50,
        category_id: categoryA,
      });

    await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(adminToken))
      .send({
        name: 'CatB Product',
        description: 'B',
        price: 10,
        quantity: 50,
        category_id: categoryB,
      });

    const filtered = await api.request(api.app)
      .get(`/api/products?page=1&limit=10&category_id=${categoryA}`)
      .set(api.authHeader(adminToken));

    expect(filtered.status).toBe(200);
    expect(filtered.body.success).toBe(true);
    expect(filtered.body.data.pagination.total).toBe(1);
    expect(filtered.body.data.products.length).toBe(1);
    expect(filtered.body.data.products[0].category_id).toBe(categoryA);

    const empty = await api.request(api.app)
      .get(`/api/products?page=1&limit=10&category_id=${emptyCategory}`)
      .set(api.authHeader(adminToken));

    expect(empty.status).toBe(200);
    expect(empty.body.success).toBe(true);
    expect(empty.body.data.pagination.total).toBe(0);
    expect(empty.body.data.products).toEqual([]);
  });

  test('products list uses cache-aside and invalidates after product mutation', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const categoryId = await createCategoryAsAdmin(adminToken, `ProdCatCache_${randomUUID().slice(0, 6)}`);

    const created = await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(adminToken))
      .send({
        name: 'Cache Product A',
        description: 'Cache',
        price: 10,
        quantity: 50,
        category_id: categoryId,
      });
    expect(created.status).toBe(201);
    const productId = created.body.data.id;

    const firstList = await api.request(api.app)
      .get('/api/products?page=1&limit=10')
      .set(api.authHeader(adminToken));
    expect(firstList.status).toBe(200);
    expect(firstList.body.success).toBe(true);
    expect(firstList.body.data.products.some((p) => p.name === 'Cache Product A')).toBe(true);

    const createdSecond = await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(adminToken))
      .send({
        name: 'Cache Product B',
        description: 'Cache',
        price: 20,
        quantity: 25,
        category_id: categoryId,
      });
    expect(createdSecond.status).toBe(201);

    const secondList = await api.request(api.app)
      .get('/api/products?page=1&limit=10')
      .set(api.authHeader(adminToken));
    expect(secondList.status).toBe(200);
    expect(secondList.body.data.products.some((p) => p.name === 'Cache Product B')).toBe(true);

    const updated = await api.request(api.app)
      .put(`/api/products/${productId}`)
      .set(api.authHeader(adminToken))
      .send({
        name: 'Cache Product A Updated',
        description: '',
        price: '',
        quantity: '',
        category_id: '',
      });
    expect(updated.status).toBe(200);

    const thirdList = await api.request(api.app)
      .get('/api/products?page=1&limit=10')
      .set(api.authHeader(adminToken));
    expect(thirdList.status).toBe(200);
    expect(thirdList.body.data.products.some((p) => p.name === 'Cache Product A Updated')).toBe(true);
  });

  test('all roles can get a product details; fails if product not found', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const categoryId = await createCategoryAsAdmin(adminToken, 'ProdCatDetails');

    const created = await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(adminToken))
      .send({
        name: 'Detail Product',
        description: 'Detail',
        price: 10,
        quantity: 50,
        category_id: categoryId,
      });
    const productId = created.body.data.id;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990071000,
    });
    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });

    const ok = await api.request(api.app)
      .get(`/api/products/${productId}`)
      .set(api.authHeader(marketerLogin.body.data.token));

    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);
    expect(ok.body.data.product.id).toBe(productId);
    expect(Array.isArray(ok.body.data.images)).toBe(true);

    const missing = await api.request(api.app)
      .get(`/api/products/${randomUUID()}`)
      .set(api.authHeader(marketerLogin.body.data.token));
    expect(missing.status).toBe(404);
    expect(missing.body.success).toBe(false);
    expect(missing.body.error).toBe('product not found');
  });

  test('admin can update product; fails if product not found', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const categoryId = await createCategoryAsAdmin(adminToken, 'ProdCatUpdate');

    const created = await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(adminToken))
      .send({
        name: 'Upd Product',
        description: 'Upd',
        price: 10,
        quantity: 50,
        category_id: categoryId,
      });
    const productId = created.body.data.id;

    const update = await api.request(api.app)
      .put(`/api/products/${productId}`)
      .set(api.authHeader(adminToken))
      .send({
        name: 'Upd Product 2',
        description: '',
        price: '',
        quantity: '',
        category_id: '',
      });
    expect(update.status).toBe(200);
    expect(update.body.success).toBe(true);
    expect(update.body.data.name).toBe('Upd Product 2');

    const missing = await api.request(api.app)
      .put(`/api/products/${randomUUID()}`)
      .set(api.authHeader(adminToken))
      .send({
        name: 'X',
        description: '',
        price: '',
        quantity: '',
        category_id: '',
      });
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);
    expect(missing.body.error).toBe('product not found');
  });

  test('admin can delete a product; fails if product not found', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const categoryId = await createCategoryAsAdmin(adminToken, 'ProdCatDelete');

    const created = await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(adminToken))
      .send({
        name: 'Del Product',
        description: 'Del',
        price: 10,
        quantity: 50,
        category_id: categoryId,
      });
    const productId = created.body.data.id;

    const del = await api.request(api.app)
      .delete(`/api/products/${productId}`)
      .set(api.authHeader(adminToken));
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);
    expect(del.body.data.message).toBe('product deleted');

    const missing = await api.request(api.app)
      .delete(`/api/products/${randomUUID()}`)
      .set(api.authHeader(adminToken));
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);
    expect(missing.body.error).toBe('product not found');
  });
});

