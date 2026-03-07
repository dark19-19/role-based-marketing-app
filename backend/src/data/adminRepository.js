const db = require('../helpers/DBHelper');

class AdminRepository {
  async findAdminByUsername(username) {
    const sql = `SELECT id, username, password, is_admin FROM users WHERE username = $1 AND is_admin = TRUE`;
    const { rows } = await db.query(sql, [username]);
    return rows[0] || null;
  }

  async getUserIsAdminById(userId) {
    const sql = `SELECT is_admin FROM users WHERE id = $1`;
    const { rows } = await db.query(sql, [userId]);
    return rows[0] ? !!rows[0].is_admin : false;
  }


}

module.exports = new AdminRepository();