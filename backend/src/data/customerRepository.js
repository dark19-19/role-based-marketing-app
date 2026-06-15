const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');

class CustomerRepository {

    async create(data) {

        const id = randomUUID();

        await db.query(
            `
      INSERT INTO customers
      (
        id,
        user_id,
        referred_by,
        first_marketer_id,
        governorate_id,
        first_name,
        last_name,
        phone,
        has_account,
        account_created_at,
        customer_origin
      )

      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `,
            [
                id,
                data.user_id || null,
                data.referred_by || null,
                data.first_marketer_id || null,
                data.governorate_id || null,
                data.first_name || null,
                data.last_name || null,
                data.phone || null,
                data.has_account === true,
                data.account_created_at || null,
                data.customer_origin || "INTERNAL",
            ]
        );

        return id;

    }

    async listPaginated({ page = 1, limit = 20, search = null, employeeId = null, role = null, userId = null, filterType = 'all' }) {

        const offset = (page - 1) * limit;

        let whereConditions = ['c.is_active = true'];
        let params = [];
        let paramIndex = 1;

        if (search) {
            whereConditions.push(
                `((COALESCE(c.first_name, u.first_name) || ' ' || COALESCE(c.last_name, u.last_name)) ILIKE $${paramIndex} OR COALESCE(c.phone, u.phone) ILIKE $${paramIndex})`
            );
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Filter by employee who created the customer (for "my customers" feature)
        if (employeeId) {
            whereConditions.push(`c.referred_by = $${paramIndex}`);
            params.push(employeeId);
            paramIndex++;
        }

        if (filterType === 'insider') {
            whereConditions.push(`c.user_id IS NULL`);
        } else if (filterType === 'outsider') {
            whereConditions.push(`c.user_id IS NOT NULL`);
        }

        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

        const { rows } = await db.query(
            `
    SELECT
       c.id as customer_id,
      c.user_id as customer_user_id,
      (COALESCE(c.first_name, u.first_name) || ' ' || COALESCE(c.last_name, u.last_name)) AS name,
      COALESCE(c.phone, u.phone) AS phone,
      u.is_active,
      c.is_active as customer_is_active,
      c.has_account,
      c.customer_origin,

      g.name AS governorate,

      ref_u.first_name || ' ' || ref_u.last_name AS referred_by_name,
      ref_r.name AS referred_by_role,

      fm_u.first_name || ' ' || fm_u.last_name AS first_marketer_name,
      fm_r.name AS first_marketer_role

    FROM customers c

    LEFT JOIN users u
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

    ORDER BY COALESCE(c.first_name, u.first_name), c.id DESC

    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `,
            [...params, limit, offset]
        );

        const countQuery = `
    SELECT COUNT(*) FROM customers c
    LEFT JOIN users u ON u.id = c.user_id
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
      c.first_name,
      c.last_name,
      c.phone AS customer_phone,
      c.has_account,
      c.account_created_at,
      c.customer_origin,

      (COALESCE(c.first_name, u.first_name) || ' ' || COALESCE(c.last_name, u.last_name)) AS full_name,
      COALESCE(c.phone, u.phone) AS phone,

      g.name AS governorate,

      (ru.first_name || ' ' || ru.last_name) AS referred_by_name,
      ru.phone AS referred_by_phone,

      (mu.first_name || ' ' || mu.last_name) AS first_marketer_name,
      mu.phone AS first_marketer_phone

    FROM customers c

    LEFT JOIN users u ON u.id = c.user_id

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
                    c.governorate_id,
                    COALESCE(c.phone, u.phone) AS phone,
                    COALESCE(c.first_name, u.first_name) AS first_name,
                    COALESCE(c.last_name, u.last_name) AS last_name
                FROM customers c
                LEFT JOIN users u ON u.id = c.user_id
                WHERE COALESCE(c.phone, u.phone) = $1
                LIMIT 1
            `,
            [phone]
        );
        return rows[0] || null;
    }

    async attachUserToCustomerByPhone({ phone, userId, first_name, last_name, client = null }) {
        const queryClient = client || db;
        const { rows } = await queryClient.query(
            `
            UPDATE customers
            SET
              user_id = $2,
              has_account = true,
              account_created_at = NOW(),
              customer_origin = 'INTERNAL_THEN_CLAIMED',
              first_name = $3,
              last_name = $4,
              phone = $1
            WHERE phone = $1
              AND user_id IS NULL
              AND is_active = true
            RETURNING id
            `,
            [phone, userId, first_name, last_name]
        );
        return rows[0]?.id || null;
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
            (
              id,
              user_id,
              referred_by,
              first_marketer_id,
              governorate_id,
              is_active,
              first_name,
              last_name,
              phone,
              has_account,
              account_created_at,
              customer_origin
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `,
            [
                id,
                data.user_id,
                data.referred_by || null,
                data.first_marketer_id || null,
                data.governorate_id,
                data.is_active !== undefined ? data.is_active : true,
                data.first_name || null,
                data.last_name || null,
                data.phone || null,
                data.has_account === true,
                data.account_created_at || null,
                data.customer_origin || "INTERNAL",
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

    async updateGovernorateId(customerId, governorateId, client = null) {
        const queryClient = client || db;
        const { rows } = await queryClient.query(
            `
            UPDATE customers
            SET governorate_id = $2
            WHERE id = $1
              AND governorate_id IS NULL
              AND is_active = true
            RETURNING id, governorate_id
            `,
            [customerId, governorateId]
        );
        return rows[0] || null;
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
