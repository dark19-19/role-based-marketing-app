const db = require('../helpers/DBHelper');

class UserRepository {
  async createUser({ id, username, passwordHash, teleId = null, refCode = null, referredBy = null }) {
    // ✅ التصحيح:
    // قمنا بتغيير $1 داخل دالة REPLACE إلى $8
    // وسنقوم بتمرير الـ id مرة أخرى في نهاية المصفوفة
    const sql = `
      INSERT INTO users (id, username, password, tele_id, balance, ref_code, referred_by, ref_pending_balance)
      VALUES ($1, $2, $3, $4, $5, 
        COALESCE($6, UPPER(SUBSTRING(REPLACE($8::text,'-','') FROM 1 FOR 10))),
        $7,
        0
      )
    `;
    
    // لاحظ: أضفنا id مرة أخرى في نهاية المصفوفة ليقابل $8
    await db.query(sql, [id, username, passwordHash, teleId, 0, refCode, referredBy, id]);
  }

  async findByRefCode(refCode) {
    const sql = `SELECT id, username, ref_code FROM users WHERE ref_code = $1`;
    const { rows } = await db.query(sql, [refCode]);
    return rows[0] || null;
  }

  async getReferralInfoByUserId(userId) {
    const sql = `
      SELECT
        u.ref_code,
        COALESCE(u.ref_pending_balance, 0) AS pending_balance,
        (SELECT COUNT(*)::int FROM users x WHERE x.referred_by = u.id) AS referrals_count
      FROM users u
      WHERE u.id = $1
    `;
    const { rows } = await db.query(sql, [userId]);
    return rows[0] || null;
  }

  async findByUsername(username) {
    const sql = `SELECT id, username, password, tele_id, balance FROM users WHERE username = $1`;
    const { rows } = await db.query(sql, [username]);
    return rows[0] || null;
  }

  async findById(id) {
    const sql = `SELECT id, username, tele_id, balance FROM users WHERE id = $1`;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  }

  async insertJwtToken({ id, userId, token, expiresAt, revoked = false }) {
    const sql = `INSERT INTO jwt_tokens (id, user_id, token, expires_at, revoked) VALUES ($1, $2, $3, $4, $5)`;
    await db.query(sql, [id, userId, token, expiresAt, revoked]);
  }

  async getTokenByValue(token) {
    const sql = `SELECT id, user_id, token, expires_at, revoked FROM jwt_tokens WHERE token = $1`;
    const { rows } = await db.query(sql, [token]);
    return rows[0] || null;
  }

  async revokeToken(token) {
    const sql = `UPDATE jwt_tokens SET revoked = TRUE WHERE token = $1`;
    await db.query(sql, [token]);
  }

  async getReferredBy(userId) {
    const { rows } = await db.query(`SELECT referred_by FROM users WHERE id = $1`, [userId]);
    return rows[0] ? rows[0].referred_by : null;
  }

  async addRefPendingBalance(client, referrerId, amount) {
    const { rows } = await client.query(
      `UPDATE users SET ref_pending_balance = ref_pending_balance + $2 WHERE id = $1 RETURNING ref_pending_balance`,
      [referrerId, amount]
    );
    return rows[0] ? Number(rows[0].ref_pending_balance) : null;
  }

  async findAllUsers({ limit, offset, order = 'DESC' }) {
    const validOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sql = `SELECT id, username, created_at FROM users WHERE is_admin = FALSE ORDER BY created_at ${validOrder} LIMIT $1 OFFSET $2`;
    const { rows } = await db.query(sql, [limit, offset]);
    return rows;
  }

  async countUsers() {
    const sql = `SELECT COUNT(*) as count FROM users`;
    const { rows } = await db.query(sql);
    return parseInt(rows[0].count, 10);
  }

  async searchUsers(query) {
    const sql = `
      SELECT id ,  username , balance , ref_code , referred_by,ref_pending_balance
      FROM users 
      WHERE username ILIKE $1 AND is_admin = FALSE
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const { rows } = await db.query(sql, [`%${query}%`]);
    return rows;
  }
}

module.exports = new UserRepository();