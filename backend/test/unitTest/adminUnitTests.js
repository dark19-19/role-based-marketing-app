const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const db = require('../../src/helpers/DBHelper');
const dbUtils = require('../utils/dbUtils');

describe('Admin unit tests', () => {
  test('admin can create a new branch manager', async () => {
    const loginRes = await api.loginAdmin();
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.data.token;

    const { governorateId } = await dbUtils.seedBaseData();
    const branchId = await dbUtils.createBranch(governorateId);

    const res = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'BM',
        last_name: 'One',
        phone: '0990000001',
        password: 'pass12345',
        role: 'BRANCH_MANAGER',
        branch_id: branchId,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.role).toBe('BRANCH_MANAGER');
  });

  test('admin can create general supervisor linked to branch manager', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const { governorateId } = await dbUtils.seedBaseData();
    const branchId = await dbUtils.createBranch(governorateId);

    const bmRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'BM',
        last_name: 'One',
        phone: '0990000002',
        password: 'pass12345',
        role: 'BRANCH_MANAGER',
        branch_id: branchId,
      });

    const bmUserId = bmRes.body.data.id;
    const bmEmployeeId = await dbUtils.getEmployeeIdByUserId(bmUserId);

    const gsRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'GS',
        last_name: 'One',
        phone: '0990000003',
        password: 'pass12345',
        role: 'GENERAL_SUPERVISOR',
        branch_id: branchId,
        supervisor_id: bmEmployeeId,
      });

    expect(gsRes.status).toBe(200);
    expect(gsRes.body.success).toBe(true);
    expect(gsRes.body.data.role).toBe('GENERAL_SUPERVISOR');

    const gsEmployeeId = await dbUtils.getEmployeeIdByUserId(gsRes.body.data.id);
    const { rows } = await db.query(
      `SELECT supervisor_id FROM employees WHERE id = $1`,
      [gsEmployeeId],
    );
    expect(rows[0].supervisor_id).toBe(bmEmployeeId);
  });

  test('admin can create supervisor linked to general supervisor', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const { governorateId } = await dbUtils.seedBaseData();
    const branchId = await dbUtils.createBranch(governorateId);

    const bmRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'BM',
        last_name: 'One',
        phone: '0990000004',
        password: 'pass12345',
        role: 'BRANCH_MANAGER',
        branch_id: branchId,
      });

    const bmEmployeeId = await dbUtils.getEmployeeIdByUserId(bmRes.body.data.id);

    const gsRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'GS',
        last_name: 'One',
        phone: '0990000005',
        password: 'pass12345',
        role: 'GENERAL_SUPERVISOR',
        branch_id: branchId,
        supervisor_id: bmEmployeeId,
      });
    const gsEmployeeId = await dbUtils.getEmployeeIdByUserId(gsRes.body.data.id);

    const supRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'SV',
        last_name: 'One',
        phone: '0990000006',
        password: 'pass12345',
        role: 'SUPERVISOR',
        branch_id: branchId,
        supervisor_id: gsEmployeeId,
      });

    expect(supRes.status).toBe(200);
    expect(supRes.body.success).toBe(true);
    expect(supRes.body.data.role).toBe('SUPERVISOR');
  });

  test('admin can create marketer linked to supervisor', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const { governorateId } = await dbUtils.seedBaseData();
    const branchId = await dbUtils.createBranch(governorateId);

    const bmRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'BM',
        last_name: 'One',
        phone: '0990000007',
        password: 'pass12345',
        role: 'BRANCH_MANAGER',
        branch_id: branchId,
      });

    const bmEmployeeId = await dbUtils.getEmployeeIdByUserId(bmRes.body.data.id);

    const gsRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'GS',
        last_name: 'One',
        phone: '0990000008',
        password: 'pass12345',
        role: 'GENERAL_SUPERVISOR',
        branch_id: branchId,
        supervisor_id: bmEmployeeId,
      });
    const gsEmployeeId = await dbUtils.getEmployeeIdByUserId(gsRes.body.data.id);

    const supRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'SV',
        last_name: 'One',
        phone: '0990000009',
        password: 'pass12345',
        role: 'SUPERVISOR',
        branch_id: branchId,
        supervisor_id: gsEmployeeId,
      });
    const supEmployeeId = await dbUtils.getEmployeeIdByUserId(supRes.body.data.id);

    const mkRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'MK',
        last_name: 'One',
        phone: '0990000010',
        password: 'pass12345',
        role: 'MARKETER',
        branch_id: branchId,
        supervisor_id: supEmployeeId,
      });

    expect(mkRes.status).toBe(200);
    expect(mkRes.body.success).toBe(true);
    expect(mkRes.body.data.role).toBe('MARKETER');
  });

  test('admin fails creating branch manager due to invalid branch id', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'BM',
        last_name: 'BadBranch',
        phone: '0990000011',
        password: 'pass12345',
        role: 'BRANCH_MANAGER',
        branch_id: randomUUID(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('admin fails creating user due to duplicate phone number', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const { governorateId } = await dbUtils.seedBaseData();
    const branchId = await dbUtils.createBranch(governorateId);

    const firstRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'MK',
        last_name: 'Dup',
        phone: '0990000012',
        password: 'pass12345',
        role: 'MARKETER',
        branch_id: branchId,
        supervisor_id: randomUUID(),
      });

    expect(firstRes.status).toBe(400);

    const bmRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'BM',
        last_name: 'One',
        phone: '0990000013',
        password: 'pass12345',
        role: 'BRANCH_MANAGER',
        branch_id: branchId,
      });
    const bmEmployeeId = await dbUtils.getEmployeeIdByUserId(bmRes.body.data.id);

    const okRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'GS',
        last_name: 'Ok',
        phone: '0990000012',
        password: 'pass12345',
        role: 'GENERAL_SUPERVISOR',
        branch_id: branchId,
        supervisor_id: bmEmployeeId,
      });

    expect(okRes.status).toBe(400);

    const dupRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'SV',
        last_name: 'Dup2',
        phone: '0990000012',
        password: 'pass12345',
        role: 'SUPERVISOR',
        branch_id: branchId,
        supervisor_id: bmEmployeeId,
      });

    expect(dupRes.status).toBe(400);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.error).toBe('رقم الهاتف مستخدم مسبقاً');
  });

  test('admin can list the users', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .get('/api/admin/users/list?page=1&limit=20')
      .set(api.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
  });

  test('admin can list employees', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const res = await api.request(api.app)
      .get('/api/admin/employees/list?page=1&limit=20')
      .set(api.authHeader(token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.data)).toBe(true);
  });

  test('admin can reset user password', async () => {
    const loginRes = await api.loginAdmin();
    const token = loginRes.body.data.token;

    const { governorateId } = await dbUtils.seedBaseData();
    const branchId = await dbUtils.createBranch(governorateId);

    const bmRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'BM',
        last_name: 'One',
        phone: '0990000014',
        password: 'pass12345',
        role: 'BRANCH_MANAGER',
        branch_id: branchId,
      });
    const bmEmployeeId = await dbUtils.getEmployeeIdByUserId(bmRes.body.data.id);

    const userRes = await api.request(api.app)
      .post('/api/admin/create-user')
      .set(api.authHeader(token))
      .send({
        first_name: 'GS',
        last_name: 'Reset',
        phone: '0990000015',
        password: 'pass12345',
        role: 'GENERAL_SUPERVISOR',
        branch_id: branchId,
        supervisor_id: bmEmployeeId,
      });

    const targetUserId = userRes.body.data.id;

    const resetRes = await api.request(api.app)
      .patch(`/api/admin/users/${targetUserId}/password`)
      .set(api.authHeader(token))
      .send({ newPassword: 'newpass123' });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    const loginTarget = await api.login({
      phone: '0990000015',
      password: 'newpass123',
    });
    expect(loginTarget.status).toBe(200);
    expect(loginTarget.body.success).toBe(true);
  });
});

