const db = require("../helpers/DBHelper");

class BranchRepository {
  async create({ id, governorate_id }) {
    const sql = `
      INSERT INTO branches (id, governorate_id)
      VALUES ($1,$2)
    `;

    await db.query(sql, [id, governorate_id]);
  }

  async updateStatus({ id, status }) {
    const sql = `
      UPDATE branches
      SET
        status = $2
      WHERE id = $1
    `;

    const { rowCount } = await db.query(sql, [id, governorate_id]);

    return rowCount > 0;
  }

  async delete(id) {
    const { rowCount } = await db.query(`DELETE FROM branches WHERE id = $1`, [
      id,
    ]);

    return rowCount > 0;
  }

  async findById(id) {
    const { rows } = await db.query(`SELECT * FROM branches WHERE id = $1`, [
      id,
    ]);

    return rows[0] || null;
  }

  async list({ limit, offset }) {
    const sql = `
      SELECT 
        b.id,
        g.name as governorate,
        b.is_active
      FROM branches b
      LEFT JOIN governorates g ON g.id = b.governorate_id
      ORDER BY g.name
      LIMIT $1 OFFSET $2
    `;

    const { rows } = await db.query(sql, [limit, offset]);

    return rows;
  }

  async count() {
    const { rows } = await db.query(
      `SELECT COUNT(*)::int as count FROM branches`,
    );

    return rows[0].count;
  }

  async findByGovernorate(governorateId) {
    const { rows } = await db.query(
      `
      SELECT *
      FROM branches
      WHERE governorate_id = $1
      LIMIT 1
      `,
      [governorateId],
    );

    return rows[0] || null;
  }

  async getBranchDetails(branchId) {
    // 1. Get branch with governorate and branch manager
    const branchRes = await db.query(
      `
            SELECT
                b.id,
                g.name AS governorate,
                g.id AS governorate_id,
                bm_user.first_name || ' ' || bm_user.last_name AS manager_name,
                bm_user.phone AS manager_phone
            FROM branches b
            JOIN governorates g ON g.id = b.governorate_id
            LEFT JOIN employees bm ON bm.branch_id = b.id
                AND bm.id IN (
                    SELECT e.id FROM employees e
                    JOIN users u ON u.id = e.user_id
                    JOIN roles r ON r.id = u.role_id
                    WHERE r.name = 'BRANCH_MANAGER'
                    LIMIT 1
                )
            LEFT JOIN users bm_user ON bm_user.id = bm.user_id
            WHERE b.id = $1
        `,
      [branchId],
    );

    if (!branchRes.rows.length) return null;

    const branch = branchRes.rows[0];

    // 2. Get all employees in this branch with their full name and phone
    const employeesRes = await db.query(
      `
            SELECT
                e.id,
                u.first_name || ' ' || u.last_name AS full_name,
                u.phone,
                r.name AS role
            FROM employees e
            JOIN users u ON u.id = e.user_id
            JOIN roles r ON r.id = u.role_id
            WHERE e.branch_id = $1
            ORDER BY r.name, u.first_name
        `,
      [branchId],
    );

    // 3. Get count of orders in this branch
    const ordersCountRes = await db.query(
      `
            SELECT COUNT(*)::int AS orders_count
            FROM orders
            WHERE branch_id = $1
        `,
      [branchId],
    );

    return {
      ...branch,
      employees: employeesRes.rows,
      orders_count: ordersCountRes.rows[0].orders_count,
    };
  }
  async updateStatus({ id, is_active }) {
    try {
      const query = `
            UPDATE branches 
            SET is_active = $1, updated_at = NOW()
            WHERE id = $2 AND deleted_at IS NULL
            RETURNING id, is_active, governorate_id, created_at, updated_at
        `;
      const result = await db.query(query, [is_active, id]);
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  async getBranchManager(branch_id) {
    const sql = `
      SELECT u.id as user_id, e.id as employee_id 
      FROM employees e 
      INNER JOIN users u ON e.user_id = u.id
      INNER JOIN roles r ON r.id = u.role_id
      WHERE e.branch_id = $1 
      AND r.name = 'BRANCH_MANAGER'
      LIMIT 1
    `
    const { rows } = await db.query(sql, [branch_id]);
    return rows[0];
  }
}

module.exports = new BranchRepository();
