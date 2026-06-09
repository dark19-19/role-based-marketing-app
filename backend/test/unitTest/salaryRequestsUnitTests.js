const { randomUUID } = require('crypto');
const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const dbUtils = require('../utils/dbUtils');
const db = require('../../src/helpers/DBHelper');

describe('Salary requests unit tests', () => {
  async function freshAdminToken() {
    return await api.getAdminToken();
  }

  function buildValidDetails(seed) {
    return {
      full_name: `Full Name ${seed}`,
      phone_number: `09${String(90000000 + (seed % 90000000)).padStart(8, '0')}`,
      address: `Address ${seed}`,
      payment_method: 'SHAM_CASH',
      note: `Note ${seed}`,
    };
  }

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
    const details = buildValidDetails(Date.now());
    return await api.request(api.app)
      .post('/api/salary-requests')
      .set(api.authHeader(token))
      .send(details);
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
    const payloadA = buildValidDetails(Date.now());
    const reqA = await api.request(api.app)
      .post('/api/salary-requests')
      .set(api.authHeader(a.tokens.marketer))
      .send(payloadA);
    expect(reqA.status).toBe(201);

    await dbUtils.createWalletTransactionDirect({ employeeId: b.chain.marketer.employeeId, amount: 20 });
    const payloadB = buildValidDetails(Date.now() + 1);
    const reqB = await api.request(api.app)
      .post('/api/salary-requests')
      .set(api.authHeader(b.tokens.marketer))
      .send(payloadB);
    expect(reqB.status).toBe(201);

    const listRes = await listSalaryRequests(await freshAdminToken(), '?page=1&limit=50');
    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data.data)).toBe(true);

    const ids = listRes.body.data.data.map((r) => r.id);
    expect(ids).toEqual(expect.arrayContaining([reqA.body.data.id, reqB.body.data.id]));

    const foundA = listRes.body.data.data.find((r) => r.id === reqA.body.data.id);
    expect(foundA.full_name).toBe(payloadA.full_name);
    expect(foundA.phone_number).toBe(payloadA.phone_number);
    expect(foundA.address).toBe(payloadA.address);
    expect(foundA.payment_method).toBe(payloadA.payment_method);
  });

  test('admin can filter salary requests by payment method', async () => {
    const setup = await setupBranchAndChain();
    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.supervisor.employeeId, amount: 12 });

    const p1 = { ...buildValidDetails(Date.now()), payment_method: 'SHAM_CASH' };
    const r1 = await api.request(api.app)
      .post('/api/salary-requests')
      .set(api.authHeader(setup.tokens.marketer))
      .send(p1);
    expect(r1.status).toBe(201);

    const p2 = { ...buildValidDetails(Date.now() + 1), payment_method: 'AL_FOAD' };
    const r2 = await api.request(api.app)
      .post('/api/salary-requests')
      .set(api.authHeader(setup.tokens.supervisor))
      .send(p2);
    expect(r2.status).toBe(201);

    const res = await listSalaryRequests(await freshAdminToken(), '?page=1&limit=50&payment_method=SHAM_CASH');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const ids = res.body.data.data.map((x) => x.id);
    expect(ids).toEqual(expect.arrayContaining([r1.body.data.id]));
    expect(ids).not.toEqual(expect.arrayContaining([r2.body.data.id]));
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

  test('employee fails to create salary request due to empty required fields', async () => {
    const setup = await setupBranchAndChain();
    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });

    const res = await api.request(api.app)
      .post('/api/salary-requests')
      .set(api.authHeader(setup.tokens.marketer))
      .send({
        full_name: '',
        phone_number: '',
        address: '',
        payment_method: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('employee fails to create salary request due to invalid payment method', async () => {
    const setup = await setupBranchAndChain();
    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });

    const res = await api.request(api.app)
      .post('/api/salary-requests')
      .set(api.authHeader(setup.tokens.marketer))
      .send({
        ...buildValidDetails(Date.now()),
        payment_method: 'INVALID_METHOD',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('employee can see attached details for his salary request', async () => {
    const setup = await setupBranchAndChain();
    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });

    const details = buildValidDetails(Date.now());
    const created = await api.request(api.app)
      .post('/api/salary-requests')
      .set(api.authHeader(setup.tokens.marketer))
      .send(details);

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);

    const id = created.body.data.id;
    const got = await getSalaryRequestDetails(setup.tokens.marketer, id);
    expect(got.status).toBe(200);
    expect(got.body.success).toBe(true);
    expect(got.body.data.full_name).toBe(details.full_name);
    expect(got.body.data.phone_number).toBe(details.phone_number);
    expect(got.body.data.address).toBe(details.address);
    expect(got.body.data.payment_method).toBe(details.payment_method);
    expect(got.body.data.note).toBe(details.note);
  });

  test('admin and branch manager can approve salary requests', async () => {
    const a = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: a.chain.marketer.employeeId, amount: 10 });
    const reqA = await createSalaryRequest(a.tokens.marketer);
    const requestAId = reqA.body.data.id;

    const approveAsAdmin = await approveSalaryRequest(await freshAdminToken(), requestAId);
    expect(approveAsAdmin.status).toBe(200);
    expect(approveAsAdmin.body.success).toBe(true);

    const detailsAfter = await getSalaryRequestDetails(await freshAdminToken(), requestAId);
    expect(detailsAfter.status).toBe(200);
    expect(detailsAfter.body.data.status).toBe('APPROVED');

    const b = await setupBranchAndChain();
    await dbUtils.createWalletTransactionDirect({ employeeId: b.chain.marketer.employeeId, amount: 10 });
    const reqB = await createSalaryRequest(b.tokens.marketer);
    const requestBId = reqB.body.data.id;

    const approveAsBM = await approveSalaryRequest(b.tokens.branchManager, requestBId);
    expect(approveAsBM.status).toBe(200);
    expect(approveAsBM.body.success).toBe(true);

    const detailsB = await getSalaryRequestDetails(await freshAdminToken(), requestBId);
    expect(detailsB.body.data.status).toBe('APPROVED');
  });

  test('admin and branch manager fails to approve salary requests if the request status is not pending, or due to invalid UUID', async () => {
    const setup = await setupBranchAndChain();

    const missing = await approveSalaryRequest(await freshAdminToken(), randomUUID());
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    const id = created.body.data.id;

    const ok = await approveSalaryRequest(await freshAdminToken(), id);
    expect(ok.status).toBe(200);

    const again = await approveSalaryRequest(await freshAdminToken(), id);
    expect(again.status).toBe(400);
    expect(again.body.success).toBe(false);
  });

  test('admin and branch manager can reject salary requests', async () => {
    const setup = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    const id = created.body.data.id;

    const rejected = await rejectSalaryRequest(await freshAdminToken(), id);
    expect(rejected.status).toBe(200);
    expect(rejected.body.success).toBe(true);

    const details = await getSalaryRequestDetails(await freshAdminToken(), id);
    expect(details.body.data.status).toBe('REJECTED');
  });

  test('admin and branch manager fails to reject salary requests if the request is not pending, or due to invalid UUID', async () => {
    const setup = await setupBranchAndChain();

    const missing = await rejectSalaryRequest(await freshAdminToken(), randomUUID());
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    const id = created.body.data.id;

    const ok = await rejectSalaryRequest(await freshAdminToken(), id);
    expect(ok.status).toBe(200);

    const again = await rejectSalaryRequest(await freshAdminToken(), id);
    expect(again.status).toBe(400);
    expect(again.body.success).toBe(false);
  });

  test('admin and branch manager can remove transaction from a salary request', async () => {
    const setup = await setupBranchAndChain();

    const t1 = await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const t2 = await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 5 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    const requestId = created.body.data.id;

    const res = await removeTransaction(await freshAdminToken(), requestId, t1);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.newAmount)).toBe(5);

    const details = await getSalaryRequestDetails(await freshAdminToken(), requestId);
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

    const missing = await removeTransaction(await freshAdminToken(), randomUUID(), randomUUID());
    expect(missing.status).toBe(400);
    expect(missing.body.success).toBe(false);

    const emptyId = await dbUtils.createSalaryRequestDirect({
      employeeId: setup.chain.marketer.employeeId,
      amount: 0,
      status: 'PENDING',
    });

    const empty = await removeTransaction(await freshAdminToken(), emptyId, randomUUID());
    expect(empty.status).toBe(400);
    expect(empty.body.success).toBe(false);
  });

  test('admin and branch manager can show details of a request', async () => {
    const setup = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 10 });
    const detailsPayload = buildValidDetails(Date.now());
    const created = await api.request(api.app)
      .post('/api/salary-requests')
      .set(api.authHeader(setup.tokens.marketer))
      .send(detailsPayload);
    const id = created.body.data.id;

    const asAdmin = await getSalaryRequestDetails(await freshAdminToken(), id);
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.success).toBe(true);
    expect(Array.isArray(asAdmin.body.data.transactions)).toBe(true);
    expect(asAdmin.body.data.full_name).toBe(detailsPayload.full_name);
    expect(asAdmin.body.data.phone_number).toBe(detailsPayload.phone_number);
    expect(asAdmin.body.data.address).toBe(detailsPayload.address);
    expect(asAdmin.body.data.payment_method).toBe(detailsPayload.payment_method);
    expect(asAdmin.body.data.note).toBe(detailsPayload.note);

    const asBM = await getSalaryRequestDetails(setup.tokens.branchManager, id);
    expect(asBM.status).toBe(200);
    expect(asBM.body.success).toBe(true);
    expect(Array.isArray(asBM.body.data.transactions)).toBe(true);
    expect(asBM.body.data.full_name).toBe(detailsPayload.full_name);
    expect(asBM.body.data.phone_number).toBe(detailsPayload.phone_number);
    expect(asBM.body.data.address).toBe(detailsPayload.address);
    expect(asBM.body.data.payment_method).toBe(detailsPayload.payment_method);
    expect(asBM.body.data.note).toBe(detailsPayload.note);
  });

  test('admin can approve a salary request with a BONUS adjustment', async () => {
    const setup = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.marketer.employeeId, amount: 100 });
    const created = await createSalaryRequest(setup.tokens.marketer);
    expect(created.status).toBe(201);
    const requestId = created.body.data.id;

    // Approve with a BONUS of 50
    const approveRes = await api.request(api.app)
      .patch(`/api/salary-requests/${requestId}/approve`)
      .set(api.authHeader(await freshAdminToken()))
      .send({ adjustment_type: 'BONUS', adjustment_amount: 50 });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    // Status should be APPROVED
    const details = await getSalaryRequestDetails(await freshAdminToken(), requestId);
    expect(details.status).toBe(200);
    expect(details.body.data.status).toBe('APPROVED');

    // adjustment fields stored on the request
    expect(details.body.data.adjustment_type).toBe('BONUS');
    expect(Number(details.body.data.adjustment_amount)).toBe(50);

    // A BONUS wallet transaction should exist for the marketer
    const { rows } = await db.query(
      `SELECT type, amount FROM wallet_transactions
       WHERE employee_id = $1 AND type = 'BONUS'`,
      [setup.chain.marketer.employeeId]
    );
    expect(rows.length).toBe(1);
    expect(Number(rows[0].amount)).toBe(50);
  });

  test('admin can approve a salary request with a DISCOUNT adjustment', async () => {
    const setup = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.supervisor.employeeId, amount: 200 });
    const created = await createSalaryRequest(setup.tokens.supervisor);
    expect(created.status).toBe(201);
    const requestId = created.body.data.id;

    // Approve with a DISCOUNT of 30
    const approveRes = await api.request(api.app)
      .patch(`/api/salary-requests/${requestId}/approve`)
      .set(api.authHeader(await freshAdminToken()))
      .send({ adjustment_type: 'DISCOUNT', adjustment_amount: 30 });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    // Status should be APPROVED
    const details = await getSalaryRequestDetails(await freshAdminToken(), requestId);
    expect(details.status).toBe(200);
    expect(details.body.data.status).toBe('APPROVED');

    // adjustment fields stored on the request
    expect(details.body.data.adjustment_type).toBe('DISCOUNT');
    expect(Number(details.body.data.adjustment_amount)).toBe(30);

    // A DISCOUNT wallet transaction should exist for the supervisor
    const { rows } = await db.query(
      `SELECT type, amount FROM wallet_transactions
       WHERE employee_id = $1 AND type = 'DISCOUNT'`,
      [setup.chain.supervisor.employeeId]
    );
    expect(rows.length).toBe(1);
    expect(Number(rows[0].amount)).toBe(30);
  });

  test('admin can approve a salary request with zero adjustment (no extra tx created)', async () => {
    const setup = await setupBranchAndChain();

    await dbUtils.createWalletTransactionDirect({ employeeId: setup.chain.generalSupervisor.employeeId, amount: 80 });
    const created = await createSalaryRequest(setup.tokens.generalSupervisor);
    expect(created.status).toBe(201);
    const requestId = created.body.data.id;

    // Approve with amount 0 (no adjustment)
    const approveRes = await api.request(api.app)
      .patch(`/api/salary-requests/${requestId}/approve`)
      .set(api.authHeader(await freshAdminToken()))
      .send({ adjustment_type: 'BONUS', adjustment_amount: 0 });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);

    // Status APPROVED and no BONUS/DISCOUNT transactions created
    const details = await getSalaryRequestDetails(await freshAdminToken(), requestId);
    expect(details.body.data.status).toBe('APPROVED');

    const { rows } = await db.query(
      `SELECT type FROM wallet_transactions
       WHERE employee_id = $1 AND type IN ('BONUS','DISCOUNT')`,
      [setup.chain.generalSupervisor.employeeId]
    );
    expect(rows.length).toBe(0);
  });
});
