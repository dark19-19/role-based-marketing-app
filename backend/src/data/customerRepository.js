const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');

class CustomerRepository {

    async create(data) {

        const id = randomUUID();

        await db.query(
            `
      INSERT INTO customers
      (id, user_id, referred_by, first_marketer_id, governorate_id)

      VALUES ($1,$2,$3,$4,$5)
      `,
            [
                id,
                data.user_id,
                data.referred_by,
                data.first_marketer_id,
                data.governorate_id
            ]
        );

        return id;

    }

    async listPaginated({ page = 1, limit = 20, search = null, employeeId = null, role = null, userId = null }) {

        const offset = (page - 1) * limit;

        let whereConditions = ['c.is_active = true'];
        let params = [];
        let paramIndex = 1;

        if (search) {
            whereConditions.push(
                `(u.first_name || ' ' || u.last_name ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`
            );
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Role-based filtering
        if (role === 'MARKETER') {
            // Marketer sees only their own customers
            whereConditions.push(`c.referred_by = $${paramIndex}`);
            params.push(employeeId);
            paramIndex++;
        } else if (role === 'SUPERVISOR') {
            // Supervisor sees their own customers + customers of marketers under them
            const eid1 = `$${paramIndex}`;
            const eid2 = `$${paramIndex + 1}`;
            params.push(employeeId, employeeId);
            paramIndex += 2;
            whereConditions.push(`(
                c.referred_by = ${eid1}
                OR c.referred_by IN (
                    SELECT e.id FROM employees e
                    WHERE e.supervisor_id = ${eid2}
                )
            )`);
        } else if (role === 'GENERAL_SUPERVISOR') {
            // General supervisor sees their own + supervisors' + marketers' customers
            const eid1 = `$${paramIndex}`;
            const eid2 = `$${paramIndex + 1}`;
            const eid3 = `$${paramIndex + 2}`;
            params.push(employeeId, employeeId, employeeId);
            paramIndex += 3;
            whereConditions.push(`(
                c.referred_by = ${eid1}
                OR c.referred_by IN (
                    SELECT e.id FROM employees e
                    WHERE e.supervisor_id = ${eid2}
                )
                OR c.referred_by IN (
                    SELECT e.id FROM employees e
                    WHERE e.supervisor_id IN (
                        SELECT e2.id FROM employees e2
                        WHERE e2.supervisor_id = ${eid3}
                    )
                )
            )`);
        }
        // ADMIN and BRANCH_MANAGER see all active customers (no additional filter)

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        const { rows } = await db.query(
            `
    SELECT
       c.id as customer_id,
       u.id as customer_user_id,
      u.first_name || ' ' || u.last_name AS name,
      u.phone,
      u.is_active,
      c.is_active as customer_is_active,

      g.name AS governorate,

      ref_u.first_name || ' ' || ref_u.last_name AS referred_by_name,
      ref_r.name AS referred_by_role,

      fm_u.first_name || ' ' || fm_u.last_name AS first_marketer_name,
      fm_r.name AS first_marketer_role

    FROM customers c

    JOIN users u
      ON u.id = c.user_id

    LEFT JOIN governorates g
      ON g.id = c.governorate_id

    LEFT JOIN employees ref_e
      ON ref_e.id = c.referred_by

    LEFT JOIN users ref_u
      ON ref_u.id = ref_e.user_id

    LEFT JOIN roles ref_r
      ON ref_r.id = ref_u.role_id

    LEFT JOIN employees fm_e
      ON fm_e.id = c.first_marketer_id

    LEFT JOIN users fm_u
      ON fm_u.id = fm_e.user_id

    LEFT JOIN roles fm_r
      ON fm_r.id = fm_u.role_id

    ${whereClause}

    ORDER BY u.first_name, c.id DESC

    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
            [...params, limit, offset]
        );

        const countQuery = `
    SELECT COUNT(*) FROM customers c
    JOIN users u ON u.id = c.user_id
    ${whereClause}
    `;
        const count = await db.query(countQuery, params);

        return {
            data: rows,
            total: parseInt(count.rows[0].count)
        };

    }

    async findById(customerId) {

        const { rows } = await db.query(`
    SELECT
      c.id,
      c.user_id,
      c.referred_by,
      c.first_marketer_id,
      c.governorate_id,

      (u.first_name || ' ' || u.last_name) AS full_name,
      u.phone,

      g.name AS governorate,

      (ru.first_name || ' ' || ru.last_name) AS referred_by_name,
      ru.phone AS referred_by_phone,

      (mu.first_name || ' ' || mu.last_name) AS first_marketer_name,
      mu.phone AS first_marketer_phone

    FROM customers c

    JOIN users u ON u.id = c.user_id

    LEFT JOIN governorates g
      ON g.id = c.governorate_id

    LEFT JOIN employees re
      ON re.id = c.referred_by

    LEFT JOIN users ru
      ON ru.id = re.user_id

    LEFT JOIN employees me
      ON me.id = c.first_marketer_id

    LEFT JOIN users mu
      ON mu.id = me.user_id

    WHERE c.id = $1
  `, [customerId]);

        return rows[0] || null;

    }

    async findByPhoneNumber(phone) {
        const { rows } = await db.query(
            `
                SELECT
                    c.id AS customer_id,
                    c.user_id,
                    u.phone,
                    u.first_name,
                    u.last_name
                FROM customers c
                JOIN users u ON u.id = c.user_id
                WHERE u.phone = $1
                LIMIT 1
            `,
            [phone]
        );
        return rows[0] || null;
    }

    async findByUserId(userId) {
        const { rows } = await db.query(
            `
            SELECT *
            FROM customers 
            WHERE user_id = $1
            `,
            [userId]
        );
        return rows[0] || null;
    }

    async findByUserIdWithActive(userId) {
        const { rows } = await db.query(
            `
            SELECT c.*
            FROM customers c
            WHERE c.user_id = $1 AND c.is_active = true
            `,
            [userId]
        );
        return rows[0] || null;
    }

    async createWithClient(client, data) {
        const id = randomUUID();
        await client.query(
            `
            INSERT INTO customers
            (id, user_id, referred_by, first_marketer_id, governorate_id, is_active)
            VALUES ($1, $2, $3, $4, $5, $6)
            `,
            [
                id,
                data.user_id,
                data.referred_by || null,
                data.first_marketer_id || null,
                data.governorate_id,
                data.is_active !== undefined ? data.is_active : true
            ]
        );
        return id;
    }

    async updateIsActive(customerId, isActive, client) {
        const queryClient = client || db;
        await queryClient.query(
            `
            UPDATE customers
            SET is_active = $2
            WHERE id = $1
            `,
            [customerId, isActive]
        );
    }

    async clearMarketerReferences(employeeId, client) {
        await client.query(
            `
            UPDATE customers
            SET referred_by = NULL,
                first_marketer_id = NULL
            WHERE referred_by = $1 OR first_marketer_id = $2
            `,
            [employeeId, employeeId]
        );
    }

    async getCustomersByMarketerId(employeeId) {
        const { rows } = await db.query(
            `
            SELECT id, user_id
            FROM customers
            WHERE referred_by = $1 OR first_marketer_id = $2
            `,
            [employeeId, employeeId]
        );
        return rows;
    }


}

module.exports = new CustomerRepository();
