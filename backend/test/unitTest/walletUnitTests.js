const api = require('../utils/apiUtils');
const factories = require('../utils/factories');
const dbUtils = require('../utils/dbUtils');
const db = require('../../src/helpers/DBHelper');

describe('Wallet unit tests', () => {
  async function setupAllTokens() {
    const adminLogin = await api.loginAdmin();
    const adminToken = adminLogin.body.data.token;

    const branchId = await factories.createBranch();
    const phoneBase = Math.floor(100000000 + Math.random() * 900000000);
    const chain = await factories.createStaffChain({ token: adminToken, branchId, phoneBase });

    const bmLogin = await api.login({ phone: chain.branchManager.phone, password: chain.branchManager.password });
    const gsLogin = await api.login({ phone: chain.generalSupervisor.phone, password: chain.generalSupervisor.password });
    const svLogin = await api.login({ phone: chain.supervisor.phone, password: chain.supervisor.password });
    const mkLogin = await api.login({ phone: chain.marketer.phone, password: chain.marketer.password });

    return {
      adminToken,
      chain,
      tokens: {
        admin: adminToken,
        branchManager: bmLogin.body.data.token,
        generalSupervisor: gsLogin.body.data.token,
        supervisor: svLogin.body.data.token,
        marketer: mkLogin.body.data.token,
      },
    };
  }

  function normalizeSummary(data) {
    if (!data) return null;
    if (Object.prototype.hasOwnProperty.call(data, 'current_balance')) {
      return {
        currentBalance: Number(data.current_balance),
        totalWithdrawn: Number(data.total_withdrawn),
        pendingRequestsTotal: Number(data.pending_requests_total),
        totalEarned: Number(data.total_earned),
      };
    }
    return {
      currentBalance: Number(data.currentBalance),
      totalWithdrawn: Number(data.totalWithdrawn),
      pendingRequestsTotal: Number(data.pendingRequestsTotal),
      totalEarned: Number(data.totalEarned),
    };
  }

  async function getAdminEmployeeId() {
    const { rows } = await db.query(`SELECT id FROM users WHERE phone = $1 LIMIT 1`, ['0912345678']);
    const adminUserId = rows[0]?.id || null;
    if (!adminUserId) return null;
    return await dbUtils.getEmployeeIdByUserId(adminUserId);
  }

  test('each role can show the summary of his balance transactions', async () => {
    const setup = await setupAllTokens();

    const adminEmployeeId = await getAdminEmployeeId();

    const targets = [
      { role: 'ADMIN', token: setup.tokens.admin, employeeId: adminEmployeeId },
      { role: 'BRANCH_MANAGER', token: setup.tokens.branchManager, employeeId: setup.chain.branchManager.employeeId },
      { role: 'GENERAL_SUPERVISOR', token: setup.tokens.generalSupervisor, employeeId: setup.chain.generalSupervisor.employeeId },
      { role: 'SUPERVISOR', token: setup.tokens.supervisor, employeeId: setup.chain.supervisor.employeeId },
      { role: 'MARKETER', token: setup.tokens.marketer, employeeId: setup.chain.marketer.employeeId },
    ];

    for (const t of targets) {
      expect(t.employeeId).toBeTruthy();
      await dbUtils.createWalletTransactionDirect({ employeeId: t.employeeId, amount: 10, type: 'BALANCE' });
      await dbUtils.createWalletTransactionDirect({ employeeId: t.employeeId, amount: 5, type: 'REQUESTED' });
      await dbUtils.createWalletTransactionDirect({ employeeId: t.employeeId, amount: 2, type: 'WITHDREW' });

      const res = await api.request(api.app).get('/api/wallet/summary').set(api.authHeader(t.token));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const summary = normalizeSummary(res.body.data);
      expect(summary).toEqual({
        currentBalance: 10,
        totalWithdrawn: 2,
        pendingRequestsTotal: 5,
        totalEarned: 17,
      });
    }
  });

  test('each role can show all the transactions he has', async () => {
    const setup = await setupAllTokens();

    const adminEmployeeId = await getAdminEmployeeId();

    const targets = [
      { role: 'ADMIN', token: setup.tokens.admin, employeeId: adminEmployeeId },
      { role: 'BRANCH_MANAGER', token: setup.tokens.branchManager, employeeId: setup.chain.branchManager.employeeId },
      { role: 'GENERAL_SUPERVISOR', token: setup.tokens.generalSupervisor, employeeId: setup.chain.generalSupervisor.employeeId },
      { role: 'SUPERVISOR', token: setup.tokens.supervisor, employeeId: setup.chain.supervisor.employeeId },
      { role: 'MARKETER', token: setup.tokens.marketer, employeeId: setup.chain.marketer.employeeId },
    ];

    for (const t of targets) {
      expect(t.employeeId).toBeTruthy();
      await dbUtils.createWalletTransactionDirect({ employeeId: t.employeeId, amount: 10, type: 'BALANCE' });
      await dbUtils.createWalletTransactionDirect({ employeeId: t.employeeId, amount: 5, type: 'REQUESTED' });
      await dbUtils.createWalletTransactionDirect({ employeeId: t.employeeId, amount: 2, type: 'WITHDREW' });

      const res = await api.request(api.app).get('/api/wallet/transactions').set(api.authHeader(t.token));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(3);

      const types = res.body.data.map((x) => x.type);
      expect(types).toEqual(expect.arrayContaining(['BALANCE', 'REQUESTED', 'WITHDREW']));
    }
  });
});
