const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');

class CommissionRepository {

    async getAll() {

        const { rows } = await db.query(`
      SELECT *
      FROM commission_settings
    `);

        return rows;

    }
    async create(data) {

        const id = randomUUID();

        await db.query(`
      INSERT INTO commission_settings
      (id, product_id, company_percentage, general_supervisor_percentage, supervisor_percentage)
      VALUES ($1,$2,$3,$4,$5)
    `, [
            id,
            data.product_id || null,
            data.company_percentage,
            data.general_supervisor_percentage,
            data.supervisor_percentage
        ]);

        return id;

    }
    async update(id, data) {

        await db.query(`
      UPDATE commission_settings
      SET
        product_id = $1,
        company_percentage = $2,
        general_supervisor_percentage = $3,
        supervisor_percentage = $4
      WHERE id = $5
    `, [
            data.product_id || null,
            data.company_percentage,
            data.general_supervisor_percentage,
            data.supervisor_percentage,
            id
        ]);

    }
    async delete(id, client) {

        await client.query(`
      DELETE FROM commission_settings
      WHERE id = $1
    `, [id]);

    }
    async findById(id) {

        const { rows } = await db.query(`
      SELECT *
      FROM commission_settings
      WHERE id = $1
    `, [id]);

        return rows[0] || null;

    }
    async findByProductId(productId) {

        const { rows } = await db.query(`
      SELECT *
      FROM commission_settings
      WHERE product_id = $1
    `, [productId]);

        return rows[0] || null;

    }
    async listPaginated({ page = 1, limit = 20 }) {

        const offset = (page - 1) * limit;

        const { rows } = await db.query(`
      SELECT cs.*, p.name as product_name
      FROM commission_settings cs
      LEFT JOIN products p ON p.id = cs.product_id
      ORDER BY cs.created_at DESC NULLS LAST
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

        const count = await db.query(`
      SELECT COUNT(*) FROM commission_settings
    `);

        return {
            data: rows,
            total: parseInt(count.rows[0].count)
        };

    }

}

module.exports = new CommissionRepository();