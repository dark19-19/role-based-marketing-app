const api = require('../utils/apiUtils');
const factories = require('../utils/factories');

describe('Auth unit tests', () => {
  test('admin can login successfully', async () => {
    const res = await api.loginAdmin();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('ADMIN');
    expect(typeof res.body.data.token).toBe('string');
  });

  test('marketer fails to login due to insufficient passed data', async () => {
    const res = await api.request(api.app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('admin can show his profile information', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .get('/api/auth/me')
      .set(api.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.body.role).toBe('ADMIN');
    expect(res.body.body.phone).toBe('0912345678');
  });

  test('admin can logout successfully', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const logoutRes = await api.request(api.app)
      .post('/api/auth/logout')
      .set(api.authHeader(token))
      .send({});

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    const meRes = await api.request(api.app)
      .get('/api/auth/me')
      .set(api.authHeader(token));
    expect(meRes.status).toBe(401);
  });

  test('marketer can change his password', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990002000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });
    expect(marketerLogin.status).toBe(200);
    const marketerToken = marketerLogin.body.data.token;

    const changeRes = await api.request(api.app)
      .patch('/api/auth/password')
      .set(api.authHeader(marketerToken))
      .send({ oldPassword: chain.marketer.password, newPassword: 'newpass123' });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.success).toBe(true);

    const meRes = await api.request(api.app)
      .get('/api/auth/me')
      .set(api.authHeader(marketerToken));
    expect(meRes.status).toBe(401);

    const relogin = await api.login({
      phone: chain.marketer.phone,
      password: 'newpass123',
    });
    expect(relogin.status).toBe(200);
    expect(relogin.body.success).toBe(true);
  });

  // test('customer register requires question and answer', async () => {
  //   const res = await api.request(api.app).post('/api/auth/register').send({
  //     first_name: 'Cust',
  //     last_name: 'One',
  //     phone: '0999000000',
  //     password: 'custpass123',
  //   });
  //   expect(res.status).toBe(400);
  //   expect(res.body.success).toBe(false);
  // });
  //
  // test('customer can reset password via question/answer flow', async () => {
  //   const phone = '0999000000';
  //   const question = 'who is my favorite football player?';
  //   const answer = 'messi';
  //   const password = 'custpass123';
  //
  //   const register = await api.request(api.app).post('/api/auth/register').send({
  //     first_name: 'Cust',
  //     last_name: 'Two',
  //     phone,
  //     password,
  //     question,
  //     answer,
  //   });
  //   expect(register.status).toBe(201);
  //   expect(register.body.success).toBe(true);
  //
  //   const qRes = await api.request(api.app)
  //     .get('/api/auth/forgot-password/question')
  //     .send({ phone });
  //   expect(qRes.status).toBe(200);
  //   expect(qRes.body.success).toBe(true);
  //   expect(qRes.body.data.question).toBe(question);
  //
  //   const aRes = await api.request(api.app)
  //     .post('/api/auth/forgot-password/answer')
  //     .send({phone ,question, answer });
  //   expect(aRes.status).toBe(200);
  //   expect(aRes.body.success).toBe(true);
  //   expect(typeof aRes.body.data.reset_key).toBe('string');
  //
  //   const resetKey = aRes.body.data.reset_key;
  //   const newPass = 'newcustpass123';
  //
  //   const reset = await api.request(api.app)
  //     .post('/api/auth/forgot-password/reset')
  //     .send({ reset_key: resetKey, new_password: newPass, confirmed_password: newPass });
  //   expect(reset.status).toBe(200);
  //   expect(reset.body.success).toBe(true);
  //
  //   const oldLogin = await api.login({ phone, password });
  //   expect(oldLogin.status).toBe(400);
  //
  //   const newLogin = await api.login({ phone, password: newPass });
  //   expect(newLogin.status).toBe(200);
  //   expect(newLogin.body.success).toBe(true);
  // });

});
