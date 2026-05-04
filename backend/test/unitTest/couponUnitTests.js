const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const dbUtils = require('../utils/dbUtils');
const factories = require('../utils/factories');

describe('Coupon unit tests', () => {
  test('admin can create, list, get, and update coupons', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const createRes = await api.request(api.app)
      .post('/api/coupons')
      .set(api.authHeader(adminToken))
      .send({
        code: 'xyz',
        discount_percentage: 20,
        number_of_people: 10,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.code).toBe('XYZ');

    const couponId = createRes.body.data.id;

    const listRes = await api.request(api.app)
      .get('/api/coupons?page=1&limit=10')
      .set(api.authHeader(adminToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data.data)).toBe(true);
    expect(listRes.body.data.data.some((x) => x.id === couponId)).toBe(true);

    const getRes = await api.request(api.app)
      .get(`/api/coupons/${couponId}`)
      .set(api.authHeader(adminToken));
    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.code).toBe('XYZ');

    const updateRes = await api.request(api.app)
      .put(`/api/coupons/${couponId}`)
      .set(api.authHeader(adminToken))
      .send({
        code: 'abc',
        number_of_people: 7,
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.code).toBe('ABC');
    expect(Number(updateRes.body.data.number_of_people)).toBe(7);
  });

  test('customer can check coupon availability and sees unavailable after using it', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;
    const branchId = await factories.createBranch();
    await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990095000,
    });
    const deliveryPointId = await dbUtils.createDeliveryPointDirect({
      branchId,
      name: 'Center',
      fee: 5,
    });

    await dbUtils.createCouponDirect({
      code: 'CUSTOM10',
      discountPercentage: 10,
      numberOfPeople: 2,
    });

    const categoryId = await dbUtils.createCategoryDirect(`Cat_${randomUUID().slice(0, 6)}`);
    const productId = await dbUtils.createProductDirect({
      name: `Prod_${randomUUID().slice(0, 6)}`,
      categoryId,
      price: 10,
      quantity: 100,
    });

    const registerRes = await api.request(api.app)
      .post('/api/auth/register')
      .send({
        first_name: 'Cust',
        last_name: 'Coupon',
        phone: '0999111111',
        password: 'custpass123',
        question: 'fav?',
        answer: 'messi',
      });
    expect(registerRes.status).toBe(201);

    const customerToken = await api.getToken({ phone: '0999111111', password: 'custpass123' });

    const checkBefore = await api.request(api.app)
      .get('/api/coupons/check')
      .query({ code: 'CUSTOM10' })
      .set(api.authHeader(customerToken));
    expect(checkBefore.status).toBe(200);
    expect(checkBefore.body.success).toBe(true);
    expect(checkBefore.body.data.available).toBe(true);

    const orderRes = await api.request(api.app)
      .post('/api/orders')
      .set(api.authHeader(customerToken))
      .send({
        branch_id: branchId,
        delivery_point_id: deliveryPointId,
        sold_price: 15,
        coupon_code: 'CUSTOM10',
        items: [{ product_id: productId, quantity: 1 }],
      });
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.success).toBe(true);

    const checkAfter = await api.request(api.app)
      .get('/api/coupons/check')
      .query({ code: 'CUSTOM10' })
      .set(api.authHeader(customerToken));
    expect(checkAfter.status).toBe(200);
    expect(checkAfter.body.success).toBe(true);
    expect(checkAfter.body.data.available).toBe(false);
    expect(checkAfter.body.data.reason).toBe('already_used');

    const orderId = orderRes.body.data.id;
    const orderDetails = await api.request(api.app)
      .get(`/api/orders/${orderId}`)
      .set(api.authHeader(customerToken));
    expect(orderDetails.status).toBe(200);
    expect(orderDetails.body.body.coupon_code).toBe('CUSTOM10');
    expect(Number(orderDetails.body.body.discount_amount)).toBe(1);
    expect(Number(orderDetails.body.body.total_sold_price || orderDetails.body.body.sold_price)).toBe(14);
  });
});
