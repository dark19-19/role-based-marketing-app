const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const dbUtils = require('../utils/dbUtils');

describe('Notification unit tests', () => {
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

