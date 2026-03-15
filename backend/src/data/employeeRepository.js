const db = require('../helpers/DBHelper');

class EmployeeRepository {

    async create({
                     id,
                     userId,
                     branchId,
                     supervisorId
                 }) {

        const sql = `
      INSERT INTO employees
      (id, user_id, branch_id, supervisor_id)
      VALUES ($1,$2,$3,$4)
    `;

        await db.query(sql, [
            id,
            userId,
            branchId,
            supervisorId
        ]);

    }

    async findByUserId(userId) {

        const { rows } = await db.query(
            `SELECT * FROM employees WHERE user_id = $1`,
            [userId]
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
            [employeeId]
        );

        return rows[0] || null;

    }

    async getEmployees({limit, offset}){
        const {rows} = await db.query(`
            SELECT

  u.first_name || ' ' || u.last_name AS name,
  u.phone,
  u.is_active,
  u.last_login,

  r.name AS role,

  g.name AS branch,

  sup_u.first_name || ' ' || sup_u.last_name AS supervisor_name,

  gs_u.first_name || ' ' || gs_u.last_name AS general_supervisor_name


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

ORDER BY name
            LIMIT $1 OFFSET $2
        `, [limit, offset])

        return rows
    }

    async count() {

        const { rows } = await db.query(
            `SELECT COUNT(*)::int as count FROM employees`
        );

        return rows[0].count;

    }

}

module.exports = new EmployeeRepository();