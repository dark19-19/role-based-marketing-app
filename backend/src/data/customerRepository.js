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

}

module.exports = new CustomerRepository();