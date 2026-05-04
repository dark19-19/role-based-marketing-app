const api = require('../utils/apiUtils');
const dbUtils = require('../utils/dbUtils');
const factories = require('../utils/factories');
const db = require('../../src/helpers/DBHelper');

describe('Stats coupon unit tests', () => {
  test('employee customer-spend stats use discounted order totals', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990090000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });

    const { rows } = await db.query(`SELECT governorate_id FROM branches WHERE id = $1`, [branchId]);
    const governorateId = rows[0]?.governorate_id;
    const customerRes = await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(marketerLogin.body.data.token))
      .send({
        first_name: 'Stat',
        last_name: 'Customer',
        phone: '0999222000',
        password: 'custpass123',
        governorate_id: governorateId,
      });
    expect(customerRes.status).toBe(200);
    const customerId = customerRes.body.data.id;

    const suffix = branchId.slice(0, 6);
    const categoryId = await dbUtils.createCategoryDirect(`StatsCouponCat_${suffix}`);
    const productId = await dbUtils.createProductDirect({
      name: `StatsCouponProd_${suffix}`,
      categoryId,
      price: 10,
      quantity: 100,
    });
    await dbUtils.createCommissionDirect({ productId: null, company: 20, gs: 10, supervisor: 10 });

    const couponId = await dbUtils.createCouponDirect({
      code: 'STAT10',
      discountPercentage: 10,
      numberOfPeople: 10,
    });

    expect(couponId).toBeTruthy();

    const deliveryPointId = await dbUtils.createDeliveryPointDirect({
      branchId,
      name: 'StatsPoint',
      fee: 5,
    });

    const customerToken = await api.getToken({
      phone: '0999222000',
      password: 'custpass123',
    });

    const orderRes = await factories.createOrder(customerToken, {
      branch_id: branchId,
      sold_price: 15,
      delivery_point_id: deliveryPointId,
      coupon_code: 'STAT10',
      items: [{ product_id: productId, quantity: 1 }],
    });
    expect(orderRes.status).toBe(200);

    const statsRes = await api.request(api.app)
      .get('/api/stats/employee/most-ordering-customers')
      .set(api.authHeader(marketerLogin.body.data.token));

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.success).toBe(true);
    expect(Array.isArray(statsRes.body.body)).toBe(true);
    expect(statsRes.body.body[0].id).toBe(customerId);
    expect(Number(statsRes.body.body[0].total_spent)).toBe(14);
  });
});
