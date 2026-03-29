const db = require('../helpers/DBHelper');

class AuthRepository {

    async findUserByPhone(phone) {
        const sql = `
      SELECT 
        u.id,
        u.phone,
        u.password,
        u.is_active,
        r.name as role,
        e.id as employee_id,
        e.branch_id
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN employees e ON e.user_id = u.id
      WHERE u.phone = $1
    `;

        const { rows } = await db.query(sql, [phone]);
        return rows[0] || null;
    }

    async createCustomerUser({ id,first_name, last_name, phone, passwordHash, role_id }) {
        const sql = `
      INSERT INTO users (id,first_name, last_name, phone, password, role_id)
      VALUES ($1,$2,$3,$4,$5,$6)
    `;

        await db.query(sql, [id, first_name, last_name, phone, passwordHash, role_id]);
    }

    async findRoleByName(name) {
        const { rows } = await db.query(
            `SELECT id FROM roles WHERE name = $1`,
            [name]
        );

        return rows[0] || null;
    }
    async setLastLogin(phone) {
        const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE phone = $1 AND is_active is true';
        await db.query(sql, [phone]);
    }

    async me(user_id) {
        const sql = `
      SELECT 
        u.id,
        u.phone,
        u.is_active,
        r.name as role,
        e.id as employee_id,
        e.branch_id
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN employees e ON e.user_id = u.id
      WHERE u.id = $1
    `;
        const { rows } = await db.query(sql, [user_id]);
        return rows[0] || null;
    }
}

module.exports = new AuthRepository();