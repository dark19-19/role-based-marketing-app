const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const imageUtils = require('../utils/imageUtils');

describe('Product image unit tests', () => {
  async function createProductAsAdmin(token) {
    const categoryRes = await api.request(api.app)
      .post('/api/categories')
      .set(api.authHeader(token))
      .send({ name: `ImgCat_${randomUUID().slice(0, 6)}` });
    const categoryId = categoryRes.body.data.id;

    const productRes = await api.request(api.app)
      .post('/api/products')
      .set(api.authHeader(token))
      .send({
        name: `ImgProd_${randomUUID().slice(0, 6)}`,
        description: 'img test',
        price: 10,
        quantity: 10,
        category_id: categoryId,
      });
    return productRes.body.data.id;
  }

  test('admin can upload an image for a product', async () => {
    const adminLogin = await api.loginAdmin();
    const token = adminLogin.body.data.token;

    const productId = await createProductAsAdmin(token);

    const res = await api.request(api.app)
      .post(`/api/products/${productId}/images`)
      .set(api.authHeader(token))
      .attach('image', imageUtils.pngBuffer(), 'test.png');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeTruthy();
    expect(res.body.data.product_id).toBe(productId);
  });

  test('admin fails to upload an image due to invalid UUID (product not found)', async () => {
    const adminLogin = await api.loginAdmin();
    const token = adminLogin.body.data.token;

    const res = await api.request(api.app)
      .post(`/api/products/${randomUUID()}/images`)
      .set(api.authHeader(token))
      .attach('image', imageUtils.pngBuffer(), 'test.png');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('product not found');
  });

  test('admin fails to upload an image due to invalid image extension', async () => {
    const adminLogin = await api.loginAdmin();
    const token = adminLogin.body.data.token;

    const productId = await createProductAsAdmin(token);

    const res = await api.request(api.app)
      .post(`/api/products/${productId}/images`)
      .set(api.authHeader(token))
      .attach('image', Buffer.from('x'), 'bad.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('all roles can show images of the product; fails if product not found', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const productId = await createProductAsAdmin(adminToken);

    const upload = await api.request(api.app)
      .post(`/api/products/${productId}/images`)
      .set(api.authHeader(adminToken))
      .attach('image', imageUtils.pngBuffer(), 'test.png');
    expect(upload.status).toBe(201);

    const branchId = await factories.createBranch();
    const phoneBase = Math.floor(100000000 + Math.random() * 900000000);
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase,
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
        .get(`/api/products/${productId}/images`)
        .set(api.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    }

    const missing = await api.request(api.app)
      .get(`/api/products/${randomUUID()}/images`)
      .set(api.authHeader(adminToken));
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);
    expect(missing.body.error).toBe('product not found');
  });

  test('admin can delete an image; fails for invalid UUID (image not found)', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const productId = await createProductAsAdmin(adminToken);

    const upload = await api.request(api.app)
      .post(`/api/products/${productId}/images`)
      .set(api.authHeader(adminToken))
      .attach('image', imageUtils.pngBuffer(), 'test.png');
    const imageId = upload.body.data.id;

    const del = await api.request(api.app)
      .delete(`/api/product-images/${imageId}`)
      .set(api.authHeader(adminToken));
    expect(del.status).toBe(200);
    expect(del.body.success).toBe(true);

    const missing = await api.request(api.app)
      .delete(`/api/product-images/${randomUUID()}`)
      .set(api.authHeader(adminToken));
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);
    expect(missing.body.error).toBe('image not found');
  });

  test('admin can reorder images (bulk) and reorder one image', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const productId = await createProductAsAdmin(adminToken);

    const img1 = await api.request(api.app)
      .post(`/api/products/${productId}/images`)
      .set(api.authHeader(adminToken))
      .attach('image', imageUtils.pngBuffer(), 'a.png');
    const img2 = await api.request(api.app)
      .post(`/api/products/${productId}/images`)
      .set(api.authHeader(adminToken))
      .attach('image', imageUtils.pngBuffer(), 'b.png');
    const img3 = await api.request(api.app)
      .post(`/api/products/${productId}/images`)
      .set(api.authHeader(adminToken))
      .attach('image', imageUtils.pngBuffer(), 'c.png');

    const ids = [img1.body.data.id, img2.body.data.id, img3.body.data.id];
    const reversed = [...ids].reverse();

    const bulk = await api.request(api.app)
      .put('/api/product-images/reorder')
      .set(api.authHeader(adminToken))
      .send({ imageIds: reversed });
    expect(bulk.status).toBe(200);
    expect(bulk.body.success).toBe(true);

    const listedAfterBulk = await api.request(api.app)
      .get(`/api/products/${productId}/images`)
      .set(api.authHeader(adminToken));
    expect(listedAfterBulk.body.data[0].id).toBe(reversed[0]);

    const one = await api.request(api.app)
      .put(`/api/product-images/${ids[2]}/order`)
      .set(api.authHeader(adminToken))
      .send({ sort_order: 0 });
    expect(one.status).toBe(200);
    expect(one.body.success).toBe(true);
    expect(one.body.data.sort_order).toBe(0);
  });
});

