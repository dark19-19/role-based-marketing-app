const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const db = require('../../src/helpers/DBHelper');

describe('Employee unit tests', () => {
  async function createBranchManagerAsAdmin({ branchId, phone = '0997000001' } = {}) {
    const adminLogin = await api.loginAdmin();
    const token = adminLogin.body.data.token;

    const res = await factories.createEmployee(token, {
      first_name: 'BM',
      last_name: 'One',
      phone,
      password: 'pass12345',
      role: 'BRANCH_MANAGER',
      branchId,
    });

    return { adminToken: token, bmUserId: res.body.body.id, bmEmployeeId: res.body.body.employee_id, bmPhone: phone };
  }

  test('(Admin, Branch manager, General supervisor, supervisor) can create a new employee', async () => {
    const branchId = await factories.createBranch();

    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const bmCreate = await factories.createEmployee(adminToken, {
      first_name: 'BM',
      last_name: 'Creator',
      phone: '0997000010',
      password: 'pass12345',
      role: 'BRANCH_MANAGER',
      branchId,
    });
    expect(bmCreate.status).toBe(201);

    const bmLogin = await api.login({ phone: '0997000010', password: 'pass12345' });
    expect(bmLogin.status).toBe(200);
    const bmToken = bmLogin.body.data.token;

    const gsCreate = await factories.createEmployee(bmToken, {
      first_name: 'GS',
      last_name: 'Created',
      phone: '0997000011',
      password: 'pass12345',
      role: 'GENERAL_SUPERVISOR',
      branchId,
    });
    expect(gsCreate.status).toBe(201);

    const gsLogin = await api.login({ phone: '0997000011', password: 'pass12345' });
    const gsToken = gsLogin.body.data.token;
    const gsEmployeeId = gsCreate.body.body.employee_id;

    const svCreate = await factories.createEmployee(gsToken, {
      first_name: 'SV',
      last_name: 'Created',
      phone: '0997000012',
      password: 'pass12345',
      role: 'SUPERVISOR',
      branchId,
      supervisorId: gsEmployeeId,
    });
    expect(svCreate.status).toBe(201);

    const svLogin = await api.login({ phone: '0997000012', password: 'pass12345' });
    const svToken = svLogin.body.data.token;
    const svEmployeeId = svCreate.body.body.employee_id;

    const mkCreate = await factories.createEmployee(svToken, {
      first_name: 'MK',
      last_name: 'Created',
      phone: '0997000013',
      password: 'pass12345',
      role: 'MARKETER',
      branchId,
      supervisorId: svEmployeeId,
    });
    expect(mkCreate.status).toBe(201);
  });

  test('same role fails to create a new employee due to duplicated phone number or invalid input data', async () => {
    const branchId = await factories.createBranch();
    const adminLogin = await api.loginAdmin();
    const token = adminLogin.body.data.token;

    const first = await factories.createEmployee(token, {
      first_name: 'BM',
      last_name: 'Dup',
      phone: '0997000020',
      password: 'pass12345',
      role: 'BRANCH_MANAGER',
      branchId,
    });
    expect(first.status).toBe(201);

    const second = await factories.createEmployee(token, {
      first_name: 'BM',
      last_name: 'Dup2',
      phone: '0997000020',
      password: 'pass12345',
      role: 'BRANCH_MANAGER',
      branchId,
    });
    expect(second.status).toBe(400);
    expect(second.body.success).toBe(false);
    expect(second.body.message).toBe('رقم الهاتف مستخدم مسبقاً');

    const invalid = await factories.createEmployee(token, {
      first_name: 'X',
      phone: '0997000021',
      password: 'pass12345',
      role: 'BRANCH_MANAGER',
      branchId,
    });
    expect(invalid.status).toBe(400);
    expect(invalid.body.success).toBe(false);
  });

  test('same roles can get the hierarchy of an employee', async () => {
    const branchId = await factories.createBranch();
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const bm = await factories.createEmployee(adminToken, {
      first_name: 'BM',
      last_name: 'Root',
      phone: '0997000030',
      password: 'pass12345',
      role: 'BRANCH_MANAGER',
      branchId,
    });
    const bmEmployeeId = bm.body.body.employee_id;

    const bmLogin = await api.login({ phone: '0997000030', password: 'pass12345' });
    const bmToken = bmLogin.body.data.token;

    const gs = await factories.createEmployee(bmToken, {
      first_name: 'GS',
      last_name: 'Child',
      phone: '0997000031',
      password: 'pass12345',
      role: 'GENERAL_SUPERVISOR',
      branchId,
    });
    const gsEmployeeId = gs.body.body.employee_id;

    const gsLogin = await api.login({ phone: '0997000031', password: 'pass12345' });
    const gsToken = gsLogin.body.data.token;

    const sv = await factories.createEmployee(gsToken, {
      first_name: 'SV',
      last_name: 'Child',
      phone: '0997000032',
      password: 'pass12345',
      role: 'SUPERVISOR',
      branchId,
      supervisorId: gsEmployeeId,
    });
    const svEmployeeId = sv.body.body.employee_id;

    const svLogin = await api.login({ phone: '0997000032', password: 'pass12345' });
    const svToken = svLogin.body.data.token;

    const rolesToToken = [adminToken, bmToken, gsToken, svToken];
    for (const token of rolesToToken) {
      const res = await api.request(api.app)
        .get(`/api/employees/hierarchy?root_id=${bmEmployeeId}`)
        .set(api.authHeader(token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.body)).toBe(true);
      expect(res.body.body[0].employee.id).toBe(bmEmployeeId);
    }

    const details = await api.request(api.app)
      .get(`/api/employees/${svEmployeeId}`)
      .set(api.authHeader(adminToken));
    expect(details.status).toBe(200);
  });

  test('same role fails to get the hierarchy due to invalid UUID (root employee not found)', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const res = await api.request(api.app)
      .get(`/api/employees/hierarchy?root_id=${randomUUID()}`)
      .set(api.authHeader(adminToken));

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('الموظف غير موجود');
  });

  test('same roles can get employee details; fails due invalid UUID (employee not found)', async () => {
    const branchId = await factories.createBranch();
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const bm = await factories.createEmployee(adminToken, {
      first_name: 'BM',
      last_name: 'Details',
      phone: '0997000040',
      password: 'pass12345',
      role: 'BRANCH_MANAGER',
      branchId,
    });
    const bmEmployeeId = bm.body.body.employee_id;

    const res = await api.request(api.app)
      .get(`/api/employees/${bmEmployeeId}`)
      .set(api.authHeader(adminToken));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.body.id).toBe(bmEmployeeId);
    expect(res.body.body.user_id).toBeTruthy();

    const missing = await api.request(api.app)
      .get(`/api/employees/${randomUUID()}`)
      .set(api.authHeader(adminToken));

    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);
    expect(missing.body.message).toBe('الموظف غير موجود');
  });

  test('(Admin, Branch manager) can update employee data; fails due to invalid UUID', async () => {
    const branchId = await factories.createBranch();
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const bm = await factories.createEmployee(adminToken, {
      first_name: 'BM',
      last_name: 'Updater',
      phone: '0997000050',
      password: 'pass12345',
      role: 'BRANCH_MANAGER',
      branchId,
    });
    const bmEmployeeId = bm.body.body.employee_id;

    const updateByAdmin = await api.request(api.app)
      .put(`/api/employees/${bmEmployeeId}`)
      .set(api.authHeader(adminToken))
      .send({ current_password: '12345678', phone: '0997000051' });

    expect(updateByAdmin.status).toBe(200);
    expect(updateByAdmin.body.success).toBe(true);

    const bmLogin = await api.login({ phone: '0997000051', password: 'pass12345' });
    const bmToken = bmLogin.body.data.token;

    const gs = await factories.createEmployee(bmToken, {
      first_name: 'GS',
      last_name: 'Target',
      phone: '0997000052',
      password: 'pass12345',
      role: 'GENERAL_SUPERVISOR',
      branchId,
    });
    const gsEmployeeId = gs.body.body.employee_id;

    const updateByBM = await api.request(api.app)
      .put(`/api/employees/${gsEmployeeId}`)
      .set(api.authHeader(bmToken))
      .send({ current_password: 'pass12345', phone: '0997000053' });
    expect(updateByBM.status).toBe(200);
    expect(updateByBM.body.success).toBe(true);

    const missing = await api.request(api.app)
      .put(`/api/employees/${randomUUID()}`)
      .set(api.authHeader(adminToken))
      .send({ current_password: '12345678', phone: '0997000054' });
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);
  });

  test('admin can remove an employee by converting him to a customer; fails with invalid UUID', async () => {
    const branchId = await factories.createBranch();
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const bm = await factories.createEmployee(adminToken, {
      first_name: 'BM',
      last_name: 'Remove',
      phone: '0997000060',
      password: 'pass12345',
      role: 'BRANCH_MANAGER',
      branchId,
    });
    const bmEmployeeId = bm.body.body.employee_id;

    const bmLogin = await api.login({ phone: '0997000060', password: 'pass12345' });
    const bmToken = bmLogin.body.data.token;

    const gs = await factories.createEmployee(bmToken, {
      first_name: 'GS',
      last_name: 'Remove',
      phone: '0997000061',
      password: 'pass12345',
      role: 'GENERAL_SUPERVISOR',
      branchId,
    });
    const gsEmployeeId = gs.body.body.employee_id;

    const gsLogin = await api.login({ phone: '0997000061', password: 'pass12345' });
    const gsToken = gsLogin.body.data.token;

    const sv = await factories.createEmployee(gsToken, {
      first_name: 'SV',
      last_name: 'Remove',
      phone: '0997000062',
      password: 'pass12345',
      role: 'SUPERVISOR',
      branchId,
      supervisorId: gsEmployeeId,
    });
    const svEmployeeId = sv.body.body.employee_id;

    const svLogin = await api.login({ phone: '0997000062', password: 'pass12345' });
    const svToken = svLogin.body.data.token;

    const mk = await factories.createEmployee(svToken, {
      first_name: 'MK',
      last_name: 'Remove',
      phone: '0997000063',
      password: 'pass12345',
      role: 'MARKETER',
      branchId,
      supervisorId: svEmployeeId,
    });
    const mkEmployeeId = mk.body.body.employee_id;

    const removeRes = await api.request(api.app)
      .patch(`/api/employees/${mkEmployeeId}/remove`)
      .set(api.authHeader(adminToken))
      .send({});
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.success).toBe(true);

    const after = await db.query(
      `
        SELECT u.role_id, r.name AS role_name, e.is_active
        FROM employees e
        JOIN users u ON u.id = e.user_id
        JOIN roles r ON r.id = u.role_id
        WHERE e.id = $1
      `,
      [mkEmployeeId],
    );
    expect(after.rows[0].role_name).toBe('CUSTOMER');
    expect(after.rows[0].is_active).toBe(false);

    const missing = await api.request(api.app)
      .patch(`/api/employees/${randomUUID()}/remove`)
      .set(api.authHeader(adminToken))
      .send({});
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);
  });

  test('admin can apply a new employee by converting a customer into an employee; fails for invalid inputs', async () => {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990030000,
    });

    const marketerLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });

    const governorateId = await factories.getAnyGovernorateId();

    const createCustomer = await api.request(api.app)
      .post('/api/customers')
      .set(api.authHeader(marketerLogin.body.data.token))
      .send({
        first_name: 'Cust',
        last_name: 'Apply',
        phone: '0997000070',
        password: 'custpass123',
        governorate_id: governorateId,
      });
    expect(createCustomer.status).toBe(200);
    const customerId = createCustomer.body.data.id;
    const userId = await factories.getUserIdByCustomerId(customerId);
    expect(userId).toBeTruthy();

    const applyRes = await api.request(api.app)
      .patch('/api/employees/apply')
      .set(api.authHeader(adminToken))
      .send({
        userId,
        role: 'MARKETER',
        branchId,
        supervisorId: chain.supervisor.employeeId,
      });
    expect(applyRes.status).toBe(200);
    expect(applyRes.body.success).toBe(true);

    const badUser = await api.request(api.app)
      .patch('/api/employees/apply')
      .set(api.authHeader(adminToken))
      .send({
        userId: randomUUID(),
        role: 'MARKETER',
        branchId,
        supervisorId: chain.supervisor.employeeId,
      });
    expect(badUser.status).toBe(400);
    expect(badUser.body.success).toBe(false);
    expect(badUser.body.message).toBe('User not found');

    const badRole = await api.request(api.app)
      .patch('/api/employees/apply')
      .set(api.authHeader(adminToken))
      .send({
        userId,
        role: 'NOT_A_ROLE',
        branchId,
        supervisorId: chain.supervisor.employeeId,
      });
    expect(badRole.status).toBe(400);
    expect(badRole.body.success).toBe(false);
  });

  test('admin can promote an employee; fails for invalid UUID or general supervisor role', async () => {
    const branchId = await factories.createBranch();
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990031000,
    });

    const promoteMarketer = await api.request(api.app)
      .patch(`/api/employees/${chain.marketer.employeeId}/promote`)
      .set(api.authHeader(adminToken))
      .send({});
    expect(promoteMarketer.status).toBe(200);
    expect(promoteMarketer.body.success).toBe(true);

    const promoteMissing = await api.request(api.app)
      .patch(`/api/employees/${randomUUID()}/promote`)
      .set(api.authHeader(adminToken))
      .send({});
    expect(promoteMissing.status).toBe(400);
    expect(promoteMissing.body.success).toBe(false);

    const promoteGS = await api.request(api.app)
      .patch(`/api/employees/${chain.generalSupervisor.employeeId}/promote`)
      .set(api.authHeader(adminToken))
      .send({});
    expect(promoteGS.status).toBe(400);
    expect(promoteGS.body.success).toBe(false);
    expect(promoteGS.body.message).toBe('General supervisor cannot be promoted further');
  });

  test('admin can demote an employee; fails for invalid UUID or marketer role', async () => {
    const branchId = await factories.createBranch();
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const chain = await factories.createStaffChain({
      token: adminToken,
      branchId,
      phoneBase: 990032000,
    });

    const demoteSupervisor = await api.request(api.app)
      .patch(`/api/employees/${chain.supervisor.employeeId}/demote`)
      .set(api.authHeader(adminToken))
      .send({});
    expect(demoteSupervisor.status).toBe(200);
    expect(demoteSupervisor.body.success).toBe(true);

    const demoteMissing = await api.request(api.app)
      .patch(`/api/employees/${randomUUID()}/demote`)
      .set(api.authHeader(adminToken))
      .send({});
    expect(demoteMissing.status).toBe(400);
    expect(demoteMissing.body.success).toBe(false);

    const demoteMarketer = await api.request(api.app)
      .patch(`/api/employees/${chain.marketer.employeeId}/demote`)
      .set(api.authHeader(adminToken))
      .send({});
    expect(demoteMarketer.status).toBe(400);
    expect(demoteMarketer.body.success).toBe(false);
    expect(demoteMarketer.body.message).toBe('Marketer cannot be demoted further');
  });
});

