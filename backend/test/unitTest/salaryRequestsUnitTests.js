const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const dbUtils = require('../utils/dbUtils');
const db = require('../../src/helpers/DBHelper');

describe('Salary requests unit tests', () => {
  async function setupBranchAndChain() {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const phoneBase = Math.floor(100000000 + Math.random() * 900000000);
    const chain = await factories.createStaffChain({ token: adminToken, branchId, phoneBase });

    const bmLogin = await api.login({
      phone: chain.branchManager.phone,
      password: chain.branchManager.password,
    });
    const gsLogin = await api.login({
      phone: chain.generalSupervisor.phone,
      password: chain.generalSupervisor.password,
    });
    const svLogin = await api.login({
      phone: chain.supervisor.phone,
      password: chain.supervisor.password,
    });
    const mkLogin = await api.login({
      phone: chain.marketer.phone,
      password: chain.marketer.password,
    });

    return {
      adminToken,
      branchId,
      chain,
      tokens: {
        branchManager: bmLogin.body.data.token,
        generalSupervisor: gsLogin.body.data.token,
        supervisor: svLogin.body.data.token,
        marketer: mkLogin.body.data.token,
      },
    };
  }

  async function createSalaryRequest(token) {
    return await api.request(api.app).post('/api/salary-requests').set(api.authHeader(token));
  }

  async function listSalaryRequests(token, query = '') {
    return await api.request(api.app)
      .get(`/api/salary-requests${query}`)
      .set(api.authHeader(token));
  }

  async function getSalaryRequestDetails(token, id) {
    return await api.request(api.app)
      .get(`/api/salary-requests/${id}`)
      .set(api.authHeader(token));
  }

  async function approveSalaryRequest(token, id) {
    return await api.request(api.app)
      .patch(`/api/salary-requests/${id}/approve`)
      .set(api.authHeader(token));
  }

  async function rejectSalaryRequest(token, id) {
    return await api.request(api.app)
      .patch(`/api/salary-requests/${id}/reject`)
      .set(api.authHeader(token));
  }

  async function removeTransaction(token, id, transactionId) {
    return await api.request(api.app)
      .patch(`/api/salary-requests/${id}/remove-transaction`)
      .set(api.authHeader(token))
      .send({ transactionId });
  }

  test('admin can show all salary requests', async () => {
    const a = await setupBranchAndChain();
    const b = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: a.chain.marketer.employeeId, amount: 10 });
    const reqA = await createSalaryRequest(a.tokens.marketer);
    expect(reqA.status).toBe(201);

    await dbUtils.createWalletTransactionDirect({ employeeId: b.chain.marketer.employeeId, amount: 20 });
    const reqB = await createSalaryRequest(b.tokens.marketer);
    expect(reqB.status).toBe(201);

    const listRes = await listSalaryRequests(a.adminToken, '?page=1&limit=50');
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data.data)).toBe(true);

    const ids = listRes.body.data.data.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([reqA.body.data.id, reqB.body.data.id]));
  });

  test('branch manager can show salary made by employees in his branch', async () => {
    const inBranch = await setupBranchAndChain();
    const otherBranch = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: inBranch.chain.marketer.employeeId, amount: 10 });
    const reqIn = await createSalaryRequest(inBranch.tokens.marketer);
    expect(reqIn.status).toBe(201);

    await dbUtils.createWalletTransactionDirect({ employeeId: otherBranch.chain.marketer.employeeId, amount: 10 });
    const reqOther = await createSalaryRequest(otherBranch.tokens.marketer);
    expect(reqOther.status).toBe(201);

    const listRes = await listSalaryRequests(inBranch.tokens.branchManager, '?page=1&limit=50');
    expect(listRes.status).toBe(200);
    const ids = listRes.body.data.data.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([reqIn.body.data.id]));
    expect(ids).not.toEqual(expect.arrayContaining([reqOther.body.data.id]));
  });

  test('other employees can show only their made salary requests', async () => {
    const setup = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const mkReq = await createSalaryRequest(setup.tokens.marketer);
    expect(mkReq.status).toBe(201);

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.supervisor.employeeId, amount: 12 });
    const svReq = await createSalaryRequest(setup.tokens.supervisor);
    expect(svReq.status).toBe(201);

    const listAsMarketer = await listSalaryRequests(setup.tokens.marketer, '?page=1&limit=50');
    expect(listAsMarketer.status).toBe(200);
    const ids = listAsMarketer.body.data.data.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([mkReq.body.data.id]));
    expect(ids).not.toEqual(expect.arrayContaining([svReq.body.data.id]));
  });

  test('(Marketer, supervisor, general supervisor) can make salary requests', async () => {
    const setup = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.supervisor.employeeId, amount: 11 });
    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.generalSupervisor.employeeId, amount: 12 });

    const mk = await createSalaryRequest(setup.tokens.marketer);
    expect(mk.status).toBe(201);
    const sv = await createSalaryRequest(setup.tokens.supervisor);
    expect(sv.status).toBe(201);
    const gs = await createSalaryRequest(setup.tokens.generalSupervisor);
    expect(gs.status).toBe(201);
  });

  test('same roles fails to make salary requests if they do not have wallet transactions with type balance', async () => {
    const setup = await setupBranchAndChain();

    const res = await createSalaryRequest(setup.tokens.marketer);
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('admin and branch manager can approve salary requests', async () => {
    const a = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: a.chain.marketer.employeeId, amount: 10 });
    const reqA = await createSalaryRequest(a.tokens.marketer);
    const requestAId = reqA.body.data.id;

    const approveAsAdmin = await approveSalaryRequest(a.adminToken, requestAId);
    expect(approveAsAdmin.status).toBe(200);
    expect(approveAsAdmin.body.success).toBe(true);

    const detailsAfter = await getSalaryRequestDetails(a.adminToken, requestAId);
    expect(detailsAfter.status).toBe(200);
    expect(detailsAfter.body.data.status).toBe('APPROVED');

    const b = await setupBranchAndChain();
    await dbUtils.createWalletTransactionDirect({ employeeId: b.chain.marketer.employeeId, amount: 10 });
    const reqB = await createSalaryRequest(b.tokens.marketer);
    const requestBId = reqB.body.data.id;

    const approveAsBM = await approveSalaryRequest(b.tokens.branchManager, requestBId);
    expect(approveAsBM.status).toBe(200);
    expect(approveAsBM.body.success).toBe(true);

    const detailsB = await getSalaryRequestDetails(b.adminToken, requestBId);
    expect(detailsB.body.data.status).toBe('APPROVED');
  });

  test('admin and branch manager fails to approve salary requests if the request status is not pending, or due to invalid UUID', async () => {
    const setup = await setupBranchAndChain();

    const missing = await approveSalaryRequest(setup.adminToken, randomUUID());
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    const id = created.body.data.id;

    const ok = await approveSalaryRequest(setup.adminToken, id);
    expect(ok.status).toBe(200);

    const again = await approveSalaryRequest(setup.adminToken, id);
    expect(again.status).toBe(400);
    expect(again.body.success).toBe(false);
  });

  test('admin and branch manager can reject salary requests', async () => {
    const setup = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    const id = created.body.data.id;

    const rejected = await rejectSalaryRequest(setup.adminToken, id);
    expect(rejected.status).toBe(200);
    expect(rejected.body.success).toBe(true);

    const details = await getSalaryRequestDetails(setup.adminToken, id);
    expect(details.body.data.status).toBe('REJECTED');
  });

  test('admin and branch manager fails to reject salary requests if the request is not pending, or due to invalid UUID', async () => {
    const setup = await setupBranchAndChain();

    const missing = await rejectSalaryRequest(setup.adminToken, randomUUID());
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    const id = created.body.data.id;

    const ok = await rejectSalaryRequest(setup.adminToken, id);
    expect(ok.status).toBe(200);

    const again = await rejectSalaryRequest(setup.adminToken, id);
    expect(again.status).toBe(400);
    expect(again.body.success).toBe(false);
  });

  test('admin and branch manager can remove transaction from a salary request', async () => {
    const setup = await setupBranchAndChain();

    const t1 = await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const t2 = await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 5 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    const requestId = created.body.data.id;

    const res = await removeTransaction(setup.adminToken, requestId, t1);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.newAmount)).toBe(5);

    const details = await getSalaryRequestDetails(setup.adminToken, requestId);
    expect(details.status).toBe(200);
    expect(Number(details.body.data.amount)).toBe(5);
    expect(Array.isArray(details.body.data.transactions)).toBe(true);
    expect(details.body.data.transactions.length).toBe(1);

    const { rows } = await db.query(
      `SELECT id, type, amount FROM wallet_transactions WHERE id = ANY($1) ORDER BY amount DESC`,
      [[t1, t2]],
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(t1).type).toBe('BALANCE');
    expect(byId.get(t2).type).toBe('REQUESTED');
  });

  test('admin and branch manager fails to remove transactions from a salary request due to invalid UUID (request not found), or empty request', async () => {
    const setup = await setupBranchAndChain();

    const missing = await removeTransaction(setup.adminToken, randomUUID(), randomUUID());
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);

    const emptyId = await dbUtils.createSalaryRequestDirect({
      employeeId: setup.chain.marketer.employeeId,
      amount: 0,
      status: 'PENDING',
    });

    const empty = await removeTransaction(setup.adminToken, emptyId, randomUUID());
    expect(empty.status).toBe(400);
    expect(empty.body.success).toBe(false);
  });

  test('admin and branch manager can show details of a request', async () => {
    const setup = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    const id = created.body.data.id;

    const asAdmin = await getSalaryRequestDetails(setup.adminToken, id);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.success).toBe(true);
    expect(Array.isArray(asAdmin.body.data.transactions)).toBe(true);

    const asBM = await getSalaryRequestDetails(setup.tokens.branchManager, id);
    expect(asBM.status).toBe(200);
    expect(asBM.body.success).toBe(true);
    expect(Array.isArray(asBM.body.data.transactions)).toBe(true);
  });
});

