const db = require("../helpers/DBHelper");

class EmployeeRepository {
  async create({ id, userId, branchId, supervisorId }) {
    const sql = `
      INSERT INTO employees
      (id, user_id, branch_id, supervisor_id)
      VALUES ($1,$2,$3,$4)
    `;

    await db.query(sql, [id, userId, branchId, supervisorId]);
  }

  async findByUserId(userId) {
    const { rows } = await db.query(
      `SELECT * FROM employees WHERE user_id = $1`,
      [userId],
    );

    return rows[0] || null;
  }

  async findEmployeeWithRole(employeeId) {
    const { rows } = await db.query(
      `
    SELECT
      e.id,
      e.branch_id,
      r.name as role
    FROM employees e
    JOIN users u ON u.id = e.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE e.id = $1
    `,
      [employeeId],
    );

    return rows[0] || null;
  }

  async getEmployees({ limit, offset, search, role, supervisorId, branchId }) {
    let conditions = [];
    let values = [];
    let idx = 1;

    if (search) {
      conditions.push(
        `(u.first_name || ' ' || u.last_name ILIKE $${idx} OR u.phone ILIKE $${idx})`,
      );
      values.push(`%${search}%`);
      idx++;
    }

    if (role && role !== "ALL") {
      conditions.push(`r.name = $${idx++}`);
      values.push(role);
    }

    if (supervisorId) {
      conditions.push(`e.supervisor_id = $${idx++}`);
      values.push(supervisorId);
    }

    if (branchId) {
      conditions.push(`e.branch_id = $${idx++}`);
      values.push(branchId);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const sql = `
            SELECT
    e.id,
  u.first_name || ' ' || u.last_name AS name,
  u.phone,
  u.is_active,
  u.last_login,

  r.name AS role,

  g.name AS branch,

  sup_u.first_name || ' ' || sup_u.last_name AS supervisor_name,

  gs_u.first_name || ' ' || gs_u.last_name AS general_supervisor_name,
  
  e.supervisor_id,
  e.branch_id


FROM employees e

JOIN users u
ON u.id = e.user_id

JOIN roles r
ON r.id = u.role_id

LEFT JOIN branches b
ON b.id = e.branch_id

JOIN governorates g 
ON g.id = b.governorate_id


-- supervisor

LEFT JOIN employees sup_e
ON sup_e.id = e.supervisor_id

LEFT JOIN users sup_u
ON sup_u.id = sup_e.user_id


-- supervisor role

LEFT JOIN roles sup_r
ON sup_r.id = sup_u.role_id


-- general supervisor employee

LEFT JOIN employees gs_e
ON gs_e.id =
CASE
  WHEN r.name = 'SUPERVISOR'
    THEN e.supervisor_id

  WHEN r.name = 'MARKETER' AND sup_r.name = 'SUPERVISOR'
    THEN sup_e.supervisor_id

  WHEN r.name = 'MARKETER' AND sup_r.name = 'GENERAL_SUPERVISOR'
    THEN e.supervisor_id

  ELSE NULL
END


LEFT JOIN users gs_u
ON gs_u.id = gs_e.user_id

${whereClause}

ORDER BY name
            LIMIT $${idx++} OFFSET $${idx}
        `;

    values.push(limit, offset);

    const { rows } = await db.query(sql, values);
    return rows;
  }

  async count({ search, role, supervisorId, branchId } = {}) {
    let conditions = [];
    let values = [];
    let idx = 1;

    if (search) {
      conditions.push(
        `(u.first_name || ' ' || u.last_name ILIKE $${idx} OR u.phone ILIKE $${idx})`,
      );
      values.push(`%${search}%`);
      idx++;
    }

    if (role && role !== "ALL") {
      conditions.push(`r.name = $${idx++}`);
      values.push(role);
    }

    if (supervisorId) {
      conditions.push(`e.supervisor_id = $${idx++}`);
      values.push(supervisorId);
    }

    if (branchId) {
      conditions.push(`e.branch_id = $${idx++}`);
      values.push(branchId);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const sql = `
            SELECT COUNT(*)::int as count 
            FROM employees e
            JOIN users u ON u.id = e.user_id
            JOIN roles r ON r.id = u.role_id
            ${whereClause}
        `;

    const { rows } = await db.query(sql, values);
    return rows[0].count;
  }
  async findById(id) {
    const { rows } = await db.query(
      `
    SELECT *
    FROM employees
    WHERE id = $1
    `,
      [id],
    );

    return rows[0] || null;
  }

  async getEmployeeDetails(employeeId) {
    const { rows } = await db.query(
      `
            SELECT
                e.id,
                e.user_id,
                e.branch_id,
                e.supervisor_id,
                e.created_at,

                u.first_name,
                u.last_name,
                u.phone,
                u.is_active,

                r.name AS role,

                g.name AS branch_governorate
            FROM employees e
            JOIN users u ON u.id = e.user_id
            JOIN roles r ON r.id = u.role_id
            LEFT JOIN branches b ON b.id = e.branch_id
            LEFT JOIN governorates g ON g.id = b.governorate_id
            WHERE e.id = $1
        `,
      [employeeId],
    );

    return rows[0] || null;
  }

  async getEmployeeSupervisor(employeeId) {
    const { rows } = await db.query(
      `
            SELECT
                sup_e.id,
                sup_u.first_name || ' ' || sup_u.last_name AS supervisor_name,
                sup_r.name AS supervisor_role
            FROM employees e
            LEFT JOIN employees sup_e ON sup_e.id = e.supervisor_id
            LEFT JOIN users sup_u ON sup_u.id = sup_e.user_id
            LEFT JOIN roles sup_r ON sup_r.id = sup_u.role_id
            WHERE e.id = $1
        `,
      [employeeId],
    );

    return rows[0] || null;
  }

  async getEmployeeGeneralSupervisor(employeeId) {
    const { rows } = await db.query(
      `
            SELECT
                gs_e.id,
                gs_u.first_name || ' ' || gs_u.last_name AS general_supervisor_name,
                gs_r.name AS general_supervisor_role
            FROM employees e

            -- Get the immediate supervisor
            LEFT JOIN employees sup_e ON sup_e.id = e.supervisor_id

            -- Get supervisor role
            LEFT JOIN users sup_u ON sup_u.id = sup_e.user_id
            LEFT JOIN roles sup_r ON sup_r.id = sup_u.role_id

            -- Get general supervisor based on role hierarchy
            LEFT JOIN employees gs_e ON gs_e.id = CASE
                WHEN sup_r.name = 'GENERAL_SUPERVISOR' THEN sup_e.id
                WHEN sup_r.name = 'SUPERVISOR' THEN sup_e.supervisor_id
                ELSE NULL
            END

            LEFT JOIN users gs_u ON gs_u.id = gs_e.user_id
            LEFT JOIN roles gs_r ON gs_r.id = gs_u.role_id

            WHERE e.id = $1
        `,
      [employeeId],
    );

    return rows[0] || null;
  }

  async getEmployeeOrders(employeeId) {
    const { rows } = await db.query(
      `
            SELECT
                o.id,
                o.status,
                o.total_main_price,
                o.total_sold_price,
                o.created_at,

                c.id AS customer_id,
                c_u.first_name || ' ' || c_u.last_name AS customer_name,
                c_u.phone AS customer_phone,

                g.name AS governorate
            FROM orders o
            LEFT JOIN customers c ON c.id = o.customer_id
            LEFT JOIN users c_u ON c_u.id = c.user_id
            LEFT JOIN governorates g ON g.id = c.governorate_id
            WHERE o.marketer_id = $1
            ORDER BY o.created_at DESC
        `,
      [employeeId],
    );

    return rows;
  }

  async getEmployeeOrdersCount(employeeId) {
    const { rows } = await db.query(
      `
            SELECT COUNT(*)::int AS order_count
            FROM orders
            WHERE marketer_id = $1
        `,
      [employeeId],
    );

    return rows[0].order_count;
  }

  async getEmployeeCustomers(employeeId) {
    const { rows } = await db.query(
      `
            SELECT
                c.id,
                c.created_at,

                u.first_name || ' ' || u.last_name AS customer_name,
                u.phone,
                u.is_active,

                g.name AS governorate
            FROM customers c
            JOIN users u ON u.id = c.user_id
            LEFT JOIN governorates g ON g.id = c.governorate_id
            WHERE c.referred_by = $1
            ORDER BY c.created_at DESC
        `,
      [employeeId],
    );

    return rows;
  }

  async getEmployeeSalarySum(employeeId) {
    const { rows } = await db.query(
      `
            SELECT COALESCE(SUM(amount), 0)::numeric AS total_salary
            FROM wallet_transactions
            WHERE employee_id = $1
        `,
      [employeeId],
    );

    return parseFloat(rows[0].total_salary);
  }

  async findByIdWithUser(employeeId) {
    const { rows } = await db.query(
      `
    SELECT
      e.id,
      e.branch_id,
      e.user_id,
      u.phone,
      u.password
    FROM employees e
    JOIN users u ON u.id = e.user_id
    WHERE e.id = $1
  `,
      [employeeId],
    );

    return rows[0] || null;
  }

  async updateBranch(employeeId, branchId, client) {
    await client.query(
      `
    UPDATE employees
    SET branch_id = $2
    WHERE id = $1
  `,
      [employeeId, branchId],
    );
  }
  async updatePhone(userId, phone, client) {
    await client.query(
      `
    UPDATE users
    SET phone = $2
    WHERE id = $1
  `,
      [userId, phone],
    );
  }
  async updatePassword(userId, passwordHash, client) {
    await client.query(
      `
    UPDATE users
    SET password = $2
    WHERE id = $1
  `,
      [userId, passwordHash],
    );
  }

  async updateIsActive(employeeId, isActive, client) {
    const queryClient = client || db;
    await queryClient.query(
      `
    UPDATE employees
    SET is_active = $2
    WHERE id = $1
  `,
      [employeeId, isActive],
    );
  }

  async findByIdWithActive(id) {
    const { rows } = await db.query(
      `
    SELECT e.*, u.phone
    FROM employees e
    JOIN users u ON u.id = e.user_id
    WHERE e.id = $1 AND e.is_active = true
  `,
      [id],
    );
    return rows[0] || null;
  }

  async findByUserIdWithActive(userId) {
    const { rows } = await db.query(
      `
    SELECT e.*, u.phone
    FROM employees e
    JOIN users u ON u.id = e.user_id
    WHERE e.user_id = $1 AND e.is_active = true
  `,
      [userId],
    );
    return rows[0] || null;
  }

  async getEmployeeBranch(employeeId) {
    const { rows } = await db.query(
      `
    SELECT b.governorate_id, b.id as branch_id
    FROM employees e
    JOIN branches b ON b.id = e.branch_id
    WHERE e.id = $1
  `,
      [employeeId],
    );
    return rows[0] || null;
  }

  async updateWalletTransactionsToWithdrew(employeeId, client) {
    await client.query(
      `
    UPDATE wallet_transactions
    SET type = 'WITHDREW'
    WHERE employee_id = $1 AND type = 'BALANCE'
  `,
      [employeeId],
    );
  }

  async updateSupervisor(supervisorId, id, client) {
    const { rows } = await client.query(`
      UPDATE employees SET 
      supervisor_id = $1
      WHERE id = $2
    `, [supervisorId, id]);
    return rows[0] || null;
  }

}

module.exports = new EmployeeRepository();
