const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const userRepo = require('../data/userRepository');
const { buildAccessToken } = require('../helpers/JWTHelper');
const { isString } = require('../helpers/GeneralHelper');

class AuthService {
  // ✳️ التسجيل المربوط مع ichancy
  async register({ username, password, tele_id, ref_code }) {
    username = isString(username, 'username is required');
    password = isString(password, 'password is required');

    const ichancy = await registerIchancyAccount(username, password, { tele_id, ref_code });
    if (!ichancy.success) {
      throw new Error(ichancy.message || 'ichancy registration failed');
    }

    return {
      username: ichancy.username,
      email: ichancy.email,
      token: ichancy.token,
    };
  }

  async myReferral(userId) {
    const info = await userRepo.getReferralInfoByUserId(userId);
    if (!info) throw new Error('user not found');

    const ref_bonus_percent = await settingsService.getBonusPercent('ref');

    return {
      ref_code: info.ref_code,
      referrals_count: Number(info.referrals_count || 0),
      pending_balance: Number(info.pending_balance || 0),
      ref_bonus_percent,
    };
  }

  // ✳️ احتفظنا بالنسخة المحلية القديمة باسم registerLocal (اختياري)
  async registerLocal({ username, password, tele_id }) {
    username = isString(username, 'username is required');
    password = isString(password, 'password is required');
    const existing = await userRepo.findByUsername(username);
    if (existing) throw new Error('username already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    const id = randomUUID();
    await userRepo.createUser({ id, username, passwordHash, teleId: tele_id || null });
    const token = buildAccessToken({ id, username });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await userRepo.insertJwtToken({ id: randomUUID(), userId: id, token, expiresAt, revoked: false });
    return { id, username, token };
  }

  async login({ username, password }) {
    username = isString(username, 'username is required');
    password = isString(password, 'password is required');
    const user = await userRepo.findByUsername(username);
    if (!user) throw new Error('invalid credentials');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new Error('invalid credentials');
    const token = buildAccessToken({ id: user.id, username: user.username });
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await userRepo.insertJwtToken({ id: randomUUID(), userId: user.id, token, expiresAt, revoked: false });
    return { id: user.id, username: user.username, token };
  }

  async me(userId) {
    const user = await userRepo.findById(userId);
    if (!user) throw new Error('user not found');
    return { id: user.id, username: user.username, tele_id: user.tele_id, balance: user.balance };
  }

  async logout({ userId, token }) {
    const rec = await userRepo.getTokenByValue(token);
    if (!rec) return { success: true }; // token not tracked; treat as logged out
    if (rec.user_id !== userId) throw new Error('invalid token for user');
    await userRepo.revokeToken(token);
    return { success: true };
  }
}

module.exports = new AuthService();