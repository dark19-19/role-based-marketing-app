const db = require('../helpers/DBHelper');

class AuthRepository {

    async findUserByPhone(phone) {
        const sql = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.phone,
        u.password,
        u.is_active,
        r.name as role,
        e.id as employee_id,
        e.branch_id,
        g.name as branch_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN employees e ON e.user_id = u.id
      LEFT JOIN branches b ON b.id = e.branch_id
      LEFT JOIN governorates g ON g.id = b.governorate_id
      WHERE u.phone = $1
    `;

        const { rows } = await db.query(sql, [phone]);
        return rows[0] || null;
    }

    async createCustomerUser({ id, first_name, last_name, phone, passwordHash, role_id, question, answer }) {
        const sql = `
      INSERT INTO users (id,first_name, last_name, phone, password, role_id, question, answer)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `;

        await db.query(sql, [id, first_name, last_name, phone, passwordHash, role_id, question || null, answer || null]);
    }
    async setLastLogin(phone) {
        const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE phone = $1 AND is_active is true';
        await db.query(sql, [phone]);
    }

    async me(user_id) {
        const sql = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.phone,
        u.is_active,
        r.name as role,
        e.id as employee_id,
        e.branch_id,
        g.name as branch_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN employees e ON e.user_id = u.id
      LEFT JOIN branches b ON b.id = e.branch_id
      LEFT JOIN governorates g ON g.id = b.governorate_id
      WHERE u.id = $1
    `;
        const { rows } = await db.query(sql, [user_id]);
        return rows[0] || null;
    }

    async updateName(userId, firstName, lastName) {
        const sql = `
            UPDATE users
            SET first_name = $2, last_name = $3, updated_at = NOW()
            WHERE id = $1
            RETURNING id, first_name, last_name, phone
        `;
        const { rows } = await db.query(sql, [userId, firstName, lastName]);
        return rows[0] || null;
    }
}

module.exports = new AuthRepository();
