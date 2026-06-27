const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const dbUtils = require('../utils/dbUtils');

describe('Notification unit tests', () => {
  async function setupCatalog() {
    const suffix = randomUUID().slice(0, 6);
    const categoryId = await dbUtils.createCategoryDirect(`NotifCat_${suffix}`);
    const productId = await dbUtils.createProductDirect({
      name: `NotifProduct_${suffix}`,
      categoryId,
      price: 10,
      quantity: 100,
    });
    await dbUtils.createCommissionDirect({ productId: null, company: 20, gs: 10, supervisor: 10 });
    return { categoryId, productId };
  }

  async function getBranchGovernorateId(branchId) {
    const db = require('../../src/helpers/DBHelper');
    const { rows } = await db.query(`SELECT governorate_id FROM branches WHERE id = $1`, [branchId]);
    return rows[0]?.governorate_id || null;
  }

  async function createCustomerViaMarketer({ marketerToken, governorateId, phone }) {
    const res = await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(marketerToken))
      .send({
        first_name: 'Cust',
        last_name: 'Notif',
        phone,
        password: 'custpass123',
        governorate_id: governorateId,
      });
    expect(res.status).toBe(200);
    return { customerId: res.body.data.id };
  }

  async function getUnreadCount(token) {
    const res = await api.request(api.app)
      .get('/api/notifications/unread-count')
      .set(api.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    return Number(res.body.data.count);
  }

  async function getLatestNotification(token) {
    const res = await api.request(api.app)
      .get('/api/notifications?page=1&limit=1')
      .set(api.authHeader(token));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    return res.body.data.data[0] || null;
  }

  async function addOrderComment({ token, orderId, content }) {
    const res = await api.request(api.app)
      .post(`/api/orders/${orderId}/comments`)
      .set(api.authHeader(token))
      .send({ content });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    return res.body.body;
  }

  async function createOrderAs({ token, customerId, branchId, productId, note }) {
    const res = await api.request(api.app)
      .post('/api/orders')
      .set(api.authHeader(token))
      .send({
        customer_id: customerId,
        branch_id: branchId,
        sold_price: 10,
        notes: note,
        items: [{ product_id: productId, quantity: 1 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    return res.body.data.id;
  }

  test('comment notification exchange works for marketer/branch manager; repeats correctly on second comment', async () => {
    const { productId } = await setupCatalog();

    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;
    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990080000,
    });

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const bmLogin = await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password });

    const governorateId = await getBranchGovernorateId(branchId);
    const { customerId } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0998000010',
    });

    const bmBeforeOrder = await getUnreadCount(bmLogin.body.data.token);
    const orderId = await createOrderAs({
      token: marketerLogin.body.data.token,
      customerId,
      branchId,
      productId,
      note: 'Marketer order for notif test',
    });
    const bmAfterOrder = await getUnreadCount(bmLogin.body.data.token);
    expect(bmAfterOrder).toBe(bmBeforeOrder + 1);

    const bmBeforeC1 = await getUnreadCount(bmLogin.body.data.token);
    await addOrderComment({ token: marketerLogin.body.data.token, orderId, content: 'MK comment 1' });
    const bmAfterC1 = await getUnreadCount(bmLogin.body.data.token);
    expect(bmAfterC1).toBe(bmBeforeC1 + 1);
    const bmNotif = await getLatestNotification(bmLogin.body.data.token);
    expect(bmNotif.message).toContain(orderId.slice(0, 5));
    expect(bmNotif.message).toContain('meta-order_id=');
    expect(bmNotif.message).toContain('branch_name=');
    expect(bmNotif.message).toContain('governorate_name=');

    const mkBeforeC2 = await getUnreadCount(marketerLogin.body.data.token);
    await addOrderComment({ token: bmLogin.body.data.token, orderId, content: 'BM comment 1' });
    const mkAfterC2 = await getUnreadCount(marketerLogin.body.data.token);
    expect(mkAfterC2).toBe(mkBeforeC2 + 1);
    const mkNotif = await getLatestNotification(marketerLogin.body.data.token);
    expect(mkNotif.message).toContain(orderId.slice(0, 5));
    expect(mkNotif.message).toContain('meta-order_id=');
    expect(mkNotif.message).toContain('branch_name=');
    expect(mkNotif.message).toContain('delivery_point_name=');
    expect(mkNotif.message).toContain('customer_name=');

    const bmBeforeC3 = await getUnreadCount(bmLogin.body.data.token);
    await addOrderComment({ token: marketerLogin.body.data.token, orderId, content: 'MK comment 2' });
    const bmAfterC3 = await getUnreadCount(bmLogin.body.data.token);
    expect(bmAfterC3).toBe(bmBeforeC3 + 1);

    console.log('[NotificationScenario] MARKETER <-> BRANCH_MANAGER: OK');
  });

  test('comment notification exchange works for supervisor/branch manager (order created by supervisor)', async () => {
    const { productId } = await setupCatalog();

    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;
    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990081000,
    });

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const supervisorLogin = await api.login({ phone: chain.supervisor.phone, password: chain.supervisor.password });
    const bmLogin = await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password });

    const governorateId = await getBranchGovernorateId(branchId);
    const { customerId } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0998000020',
    });

    const bmBeforeOrder = await getUnreadCount(bmLogin.body.data.token);
    const orderId = await createOrderAs({
      token: supervisorLogin.body.data.token,
      customerId,
      branchId,
      productId,
      note: 'Supervisor order for notif test',
    });
    const bmAfterOrder = await getUnreadCount(bmLogin.body.data.token);
    expect(bmAfterOrder).toBe(bmBeforeOrder + 1);

    const bmBeforeC1 = await getUnreadCount(bmLogin.body.data.token);
    await addOrderComment({ token: supervisorLogin.body.data.token, orderId, content: 'SV comment 1' });
    const bmAfterC1 = await getUnreadCount(bmLogin.body.data.token);
    expect(bmAfterC1).toBe(bmBeforeC1 + 1);
    const bmNotif = await getLatestNotification(bmLogin.body.data.token);
    expect(bmNotif.message).toContain(orderId.slice(0, 5));
    expect(bmNotif.message).toContain('meta-order_id=');
    expect(bmNotif.message).toContain('branch_name=');
    expect(bmNotif.message).toContain('governorate_name=');

    const svBeforeC2 = await getUnreadCount(supervisorLogin.body.data.token);
    await addOrderComment({ token: bmLogin.body.data.token, orderId, content: 'BM comment 1' });
    const svAfterC2 = await getUnreadCount(supervisorLogin.body.data.token);
    expect(svAfterC2).toBe(svBeforeC2 + 1);
    const svNotif = await getLatestNotification(supervisorLogin.body.data.token);
    expect(svNotif.message).toContain(orderId.slice(0, 5));
    expect(svNotif.message).toContain('meta-order_id=');
    expect(svNotif.message).toContain('branch_name=');
    expect(svNotif.message).toContain('delivery_point_name=');
    expect(svNotif.message).toContain('customer_name=');

    const bmBeforeC3 = await getUnreadCount(bmLogin.body.data.token);
    await addOrderComment({ token: supervisorLogin.body.data.token, orderId, content: 'SV comment 2' });
    const bmAfterC3 = await getUnreadCount(bmLogin.body.data.token);
    expect(bmAfterC3).toBe(bmBeforeC3 + 1);

    console.log('[NotificationScenario] SUPERVISOR <-> BRANCH_MANAGER: OK');
  });

  test('comment notification exchange works for general supervisor/branch manager (order created by general supervisor)', async () => {
    const { productId } = await setupCatalog();

    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;
    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990082000,
    });

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const gsLogin = await api.login({ phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password });
    const bmLogin = await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password });

    const governorateId = await getBranchGovernorateId(branchId);
    const { customerId } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0998000030',
    });

    const bmBeforeOrder = await getUnreadCount(bmLogin.body.data.token);
    const orderId = await createOrderAs({
      token: gsLogin.body.data.token,
      customerId,
      branchId,
      productId,
      note: 'GS order for notif test',
    });
    const bmAfterOrder = await getUnreadCount(bmLogin.body.data.token);
    expect(bmAfterOrder).toBe(bmBeforeOrder + 1);

    const bmBeforeC1 = await getUnreadCount(bmLogin.body.data.token);
    await addOrderComment({ token: gsLogin.body.data.token, orderId, content: 'GS comment 1' });
    const bmAfterC1 = await getUnreadCount(bmLogin.body.data.token);
    expect(bmAfterC1).toBe(bmBeforeC1 + 1);
    const bmNotif = await getLatestNotification(bmLogin.body.data.token);
    expect(bmNotif.message).toContain(orderId.slice(0, 5));
    expect(bmNotif.message).toContain('meta-order_id=');
    expect(bmNotif.message).toContain('branch_name=');
    expect(bmNotif.message).toContain('governorate_name=');

    const gsBeforeC2 = await getUnreadCount(gsLogin.body.data.token);
    await addOrderComment({ token: bmLogin.body.data.token, orderId, content: 'BM comment 1' });
    const gsAfterC2 = await getUnreadCount(gsLogin.body.data.token);
    expect(gsAfterC2).toBe(gsBeforeC2 + 1);
    const gsNotif = await getLatestNotification(gsLogin.body.data.token);
    expect(gsNotif.message).toContain(orderId.slice(0, 5));
    expect(gsNotif.message).toContain('meta-order_id=');
    expect(gsNotif.message).toContain('branch_name=');
    expect(gsNotif.message).toContain('delivery_point_name=');
    expect(gsNotif.message).toContain('customer_name=');

    const bmBeforeC3 = await getUnreadCount(bmLogin.body.data.token);
    await addOrderComment({ token: gsLogin.body.data.token, orderId, content: 'GS comment 2' });
    const bmAfterC3 = await getUnreadCount(bmLogin.body.data.token);
    expect(bmAfterC3).toBe(bmBeforeC3 + 1);

    console.log('[NotificationScenario] GENERAL_SUPERVISOR <-> BRANCH_MANAGER: OK');
  });

  test('all branch managers in the branch get notified when marketer/supervisor/general supervisor adds a comment', async () => {
    const { productId } = await setupCatalog();

    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;
    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990083000,
    });

    const marketerLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });
    const supervisorLogin = await api.login({ phone: chain.supervisor.phone, password: chain.supervisor.password });
    const gsLogin = await api.login({ phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password });
    const bm1Login = await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password });

    const bm2Phone = '0998000099';
    const bm2Password = 'pass12345';
    const createBm2 = await factories.adminCreateUser(adminToken, {
      first_name: 'BM',
      last_name: `Two_${randomUUID().slice(0, 6)}`,
      phone: bm2Phone,
      password: bm2Password,
      role: 'BRANCH_MANAGER',
      branch_id: branchId,
    });
    expect(createBm2.status).toBe(200);

    const bm2Login = await api.login({ phone: bm2Phone, password: bm2Password });

    const governorateId = await getBranchGovernorateId(branchId);
    const { customerId } = await createCustomerViaMarketer({
      marketerToken: marketerLogin.body.data.token,
      governorateId,
      phone: '0998000040',
    });

    const orderId = await createOrderAs({
      token: marketerLogin.body.data.token,
      customerId,
      branchId,
      productId,
      note: 'Multi-BM comment notifications test',
    });

    const actors = [
      { name: 'MARKETER', token: marketerLogin.body.data.token, content: 'MK says hi' },
      { name: 'SUPERVISOR', token: supervisorLogin.body.data.token, content: 'SV says hi' },
      { name: 'GENERAL_SUPERVISOR', token: gsLogin.body.data.token, content: 'GS says hi' },
    ];

    for (const a of actors) {
      const bm1Before = await getUnreadCount(bm1Login.body.data.token);
      const bm2Before = await getUnreadCount(bm2Login.body.data.token);

      await addOrderComment({ token: a.token, orderId, content: a.content });

      const bm1After = await getUnreadCount(bm1Login.body.data.token);
      const bm2After = await getUnreadCount(bm2Login.body.data.token);

      expect(bm1After).toBe(bm1Before + 1);
      expect(bm2After).toBe(bm2Before + 1);
    }
  });

  test('user can list his notifications paginated', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990050000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const marketerToken = marketerLogin.body.data.token;

    await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'N1',
      message: 'M1',
    });
    await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'N2',
      message: 'M2',
    });

    const res = await api.request(api.app)
      .get('/api/notifications?page=1&limit=10')
      .set(api.authHeader(marketerToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
    expect(res.body.data.pagination).toBeTruthy();
  });

  test('user can view the count of his notifications', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990051000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const marketerToken = marketerLogin.body.data.token;

    await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'N1',
      message: 'M1',
    });

    const res = await api.request(api.app)
      .get('/api/notifications/count')
      .set(api.authHeader(marketerToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.count).toBe('number');
    expect(res.body.data.count).toBe(1);
  });

  test('user can view the count of his unread notifications', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990052000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const marketerToken = marketerLogin.body.data.token;

    await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'Unread',
      message: 'U',
      isRead: false,
    });
    await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'Read',
      message: 'R',
      isRead: true,
    });

    const res = await api.request(api.app)
      .get('/api/notifications/unread-count')
      .set(api.authHeader(marketerToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(1);
  });

  test('user can view the details of his notification; fails due to invalid UUID (notification not found)', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990053000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const marketerToken = marketerLogin.body.data.token;

    const notificationId = await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'Detail',
      message: 'Detail',
    });

    const ok = await api.request(api.app)
      .get(`/api/notifications/${notificationId}`)
      .set(api.authHeader(marketerToken));

    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);
    expect(ok.body.data.id).toBe(notificationId);

    const missing = await api.request(api.app)
      .get(`/api/notifications/${randomUUID()}`)
      .set(api.authHeader(marketerToken));
    expect(missing.status).toBe(404);
    expect(missing.body.success).toBe(false);
    expect(missing.body.message).toBe('Notification not found');
  });

  test('user can mark a notification as read; fails due to invalid UUID (notification not found)', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990054000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const marketerToken = marketerLogin.body.data.token;

    const notificationId = await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'ReadMe',
      message: 'ReadMe',
      isRead: false,
    });

    const ok = await api.request(api.app)
      .patch(`/api/notifications/${notificationId}/read`)
      .set(api.authHeader(marketerToken));
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);

    const unread = await api.request(api.app)
      .get('/api/notifications/unread-count')
      .set(api.authHeader(marketerToken));
    expect(unread.body.data.count).toBe(0);

    const missing = await api.request(api.app)
      .patch(`/api/notifications/${randomUUID()}/read`)
      .set(api.authHeader(marketerToken));
    expect(missing.status).toBe(404);
    expect(missing.body.success).toBe(false);
    expect(missing.body.message).toBe('Notification not found');
  });

  test('user can delete a notification; fails due to invalid UUID (notification not found)', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990055000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const marketerToken = marketerLogin.body.data.token;

    const notificationId = await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'Del',
      message: 'Del',
    });

    const ok = await api.request(api.app)
      .delete(`/api/notifications/${notificationId}`)
      .set(api.authHeader(marketerToken));
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);

    const missing = await api.request(api.app)
      .delete(`/api/notifications/${randomUUID()}`)
      .set(api.authHeader(marketerToken));
    expect(missing.status).toBe(404);
    expect(missing.body.success).toBe(false);
    expect(missing.body.message).toBe('Notification not found');
  });

  test('user can mark all his notifications as read; fails when no notifications exist', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990056000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    const marketerToken = marketerLogin.body.data.token;

    const none = await api.request(api.app)
      .put('/api/notifications/read-all')
      .set(api.authHeader(marketerToken));

    expect(none.status).toBe(404);
    expect(none.body.success).toBe(false);
    expect(none.body.message).toBe('Notifications not found');

    await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'A',
      message: 'A',
      isRead: false,
    });
    await dbUtils.createNotificationDirect({
      userId: chain.marketer.userId,
      title: 'B',
      message: 'B',
      isRead: false,
    });

    const ok = await api.request(api.app)
      .put('/api/notifications/read-all')
      .set(api.authHeader(marketerToken));
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);

    const unread = await api.request(api.app)
      .get('/api/notifications/unread-count')
      .set(api.authHeader(marketerToken));
    expect(unread.body.data.count).toBe(0);
  });
});

