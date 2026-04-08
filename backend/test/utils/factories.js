const { randomUUID } = require('crypto');
const db = require('../../src/helpers/DBHelper');
const dbUtils = require('./dbUtils');
const api = require('./apiUtils');

async function getAnyGovernorateId() {
  const { rows } = await db.query(`SELECT id FROM governorates ORDER BY created_at DESC LIMIT 1`);
  return rows[0]?.id || null;
}

async function createBranch() {
  const governorateId = await getAnyGovernorateId();
  if (!governorateId) {
    throw new Error('No governorate found');
  }
  return await dbUtils.createBranch(governorateId);
}

async function adminCreateUser(token, payload) {
  return await api.request(api.app)
    .post('/api/admin/create-user')
    .set(api.authHeader(token))
    .send(payload);
}

async function createEmployee(token, payload) {
  return await api.request(api.app)
    .post('/api/employees')
    .set(api.authHeader(token))
    .send(payload);
}

async function createOrder(token, payload) {
  return await api.request(api.app)
    .post('/api/orders')
    .set(api.authHeader(token))
    .send(payload);
}

async function getUserIdByCustomerId(customerId) {
  const { rows } = await db.query(
    `SELECT user_id FROM customers WHERE id = $1 LIMIT 1`,
    [customerId],
  );
  return rows[0]?.user_id || null;
}

async function createStaffChain({ token, branchId, phoneBase = 990000100 }) {
  const bmPhone = `09${String(phoneBase).padStart(8, '0')}`;
  const gsPhone = `09${String(phoneBase + 1).padStart(8, '0')}`;
  const svPhone = `09${String(phoneBase + 2).padStart(8, '0')}`;
  const mkPhone = `09${String(phoneBase + 3).padStart(8, '0')}`;
  const password = 'pass12345';

  const bmRes = await adminCreateUser(token, {
    first_name: 'BM',
    last_name: `One_${randomUUID().slice(0, 6)}`,
    phone: bmPhone,
    password,
    role: 'BRANCH_MANAGER',
    branch_id: branchId,
  });
  if (!bmRes.body.data) throw new Error('BM create failed: ' + JSON.stringify(bmRes.body));
  const bmUserId = bmRes.body.data.id;
  const bmEmployeeId = await dbUtils.getEmployeeIdByUserId(bmUserId);

  const gsRes = await adminCreateUser(token, {
    first_name: 'GS',
    last_name: `One_${randomUUID().slice(0, 6)}`,
    phone: gsPhone,
    password,
    role: 'GENERAL_SUPERVISOR',
    branch_id: branchId,
    supervisor_id: bmEmployeeId,
  });
  const gsEmployeeId = await dbUtils.getEmployeeIdByUserId(gsRes.body.data.id);

  const svRes = await adminCreateUser(token, {
    first_name: 'SV',
    last_name: `One_${randomUUID().slice(0, 6)}`,
    phone: svPhone,
    password,
    role: 'SUPERVISOR',
    branch_id: branchId,
    supervisor_id: gsEmployeeId,
  });
  const svEmployeeId = await dbUtils.getEmployeeIdByUserId(svRes.body.data.id);

  const mkRes = await adminCreateUser(token, {
    first_name: 'MK',
    last_name: `One_${randomUUID().slice(0, 6)}`,
    phone: mkPhone,
    password,
    role: 'MARKETER',
    branch_id: branchId,
    supervisor_id: svEmployeeId,
  });
  const mkEmployeeId = await dbUtils.getEmployeeIdByUserId(mkRes.body.data.id);

  return {
    branchManager: { userId: bmUserId, employeeId: bmEmployeeId, phone: bmPhone, password },
    generalSupervisor: { userId: gsRes.body.data.id, employeeId: gsEmployeeId, phone: gsPhone, password },
    supervisor: { userId: svRes.body.data.id, employeeId: svEmployeeId, phone: svPhone, password },
    marketer: { userId: mkRes.body.data.id, employeeId: mkEmployeeId, phone: mkPhone, password },
  };
}

module.exports = {
  getAnyGovernorateId,
  createBranch,
  adminCreateUser,
  createEmployee,
  createOrder,
  getUserIdByCustomerId,
  createStaffChain,
};
