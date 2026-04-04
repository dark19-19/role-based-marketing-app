const db = require("../helpers/DBHelper");

class UserRepository {
  async findById(id) {
    const sql = `SELECT * FROM users WHERE id = $1`;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  }

  async insertJwtToken({ id, user_id, token, expiresAt, revoked = false }) {
    const sql = `INSERT INTO jwt_tokens (id, user_id, token, expires_at, revoked) VALUES ($1, $2, $3, $4, $5)`;
    await db.query(sql, [id, user_id, token, expiresAt, revoked]);
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

  async findAllUsers({ limit, offset, order = "DESC" }) {
    const validOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";
    const sql = `
SELECT u.id, u.first_name, u.last_name, u.phone, r.name AS role
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
ORDER BY u.created_at ${order}
LIMIT $1 OFFSET $2
`;
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
      SELECT u.id , u.first_name, u.last_name, u.phone, u.is_active, r.name 
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE first_name LIKE $1 OR last_name LIKE $1 OR phone LIKE $1
      ORDER BY u.created_at DESC
      LIMIT 20
    `;
    const { rows } = await db.query(sql, [`%${query}%`]);
    return rows;
  }
  async findUserByPhone(phone) {
    const result = await db.query(
      `SELECT id, phone FROM users WHERE phone = $1 LIMIT 1`,
      [phone],
    );

    return result.rows[0];
  }

  async createUser({
    id,
    first_name,
    last_name,
    phone,
    passwordHash,
    role_id,
  }) {
    await db.query(
      `INSERT INTO users (id, first_name,last_name,phone, password, role_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, first_name, last_name, phone, passwordHash, role_id],
    );
  }

  async updatePassword(userId, passwordHash) {
    const sql = `UPDATE users SET password = $2, updated_at = NOW() WHERE id = $1 RETURNING id, first_name, last_name, phone`;
    const { rows } = await db.query(sql, [userId, passwordHash]);
    return rows[0] || null;
  }

  async revokeAllTokensForUser(userId) {
    const sql = `UPDATE jwt_tokens SET revoked = TRUE WHERE user_id = $1`;
    await db.query(sql, [userId]);
  }

  async updateRole(userId, roleId, client) {
    const queryClient = client || db;
    await queryClient.query(
      `UPDATE users SET role_id = $2, updated_at = NOW() WHERE id = $1`,
      [userId, roleId]
    );
  }
}

module.exports = new UserRepository();
