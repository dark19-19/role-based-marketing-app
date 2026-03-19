const db = require('../helpers/DBHelper');

class BranchRepository {

    async create({ id, governorate_id }) {

        const sql = `
      INSERT INTO branches (id, governorate_id)
      VALUES ($1,$2)
    `;

        await db.query(sql, [id, governorate_id]);
    }

    async update({ id, governorate_id }) {

        const sql = `
      UPDATE branches
      SET
        governorate_id = $2
      WHERE id = $1
    `;

        const { rowCount } = await db.query(sql, [id, governorate_id]);

        return rowCount > 0;
    }

    async delete(id) {

        const { rowCount } = await db.query(
            `DELETE FROM branches WHERE id = $1`,
            [id]
        );

        return rowCount > 0;
    }

    async findById(id) {

        const { rows } = await db.query(
            `SELECT * FROM branches WHERE id = $1`,
            [id]
        );

        return rows[0] || null;
    }

    async list({ limit, offset }) {

        const sql = `
      SELECT 
        b.id,
        g.name as governorate
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
            `SELECT COUNT(*)::int as count FROM branches`
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
            [governorateId]
        );

        return rows[0] || null;

    }


}

module.exports = new BranchRepository();