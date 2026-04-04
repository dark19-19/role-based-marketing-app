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

    async listPaginated({ page = 1, limit = 20 }) {

        const offset = (page - 1) * limit;

        const { rows } = await db.query(
            `
    SELECT
       c.id as customer_id,
       u.id as customer_user_id,
      u.first_name || ' ' || u.last_name AS name,
      u.phone,
      u.is_active,

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

    -- referred by

    LEFT JOIN employees ref_e
      ON ref_e.id = c.referred_by

    LEFT JOIN users ref_u
      ON ref_u.id = ref_e.user_id

    LEFT JOIN roles ref_r
      ON ref_r.id = ref_u.role_id

    -- first marketer

    LEFT JOIN employees fm_e
      ON fm_e.id = c.first_marketer_id

    LEFT JOIN users fm_u
      ON fm_u.id = fm_e.user_id

    LEFT JOIN roles fm_r
      ON fm_r.id = fm_u.role_id

    ORDER BY u.first_name

    LIMIT $1 OFFSET $2
    `,
            [limit, offset]
        );

        const count = await db.query(
            `
    SELECT COUNT(*) FROM customers
    `
        );

        return {
            data: rows,
            total: parseInt(count.rows[0].count)
        };

    }

    async findById(customerId) {

        const { rows } = await db.query(`
    SELECT
      c.id,

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

}

module.exports = new CustomerRepository();