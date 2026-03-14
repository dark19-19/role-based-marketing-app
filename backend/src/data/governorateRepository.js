const db = require('../helpers/DBHelper');

class GovernorateRepository {

    async create({ id, name }) {

        const sql = `
      INSERT INTO governorates (id, name)
      VALUES ($1,$2)
    `;

        await db.query(sql, [id, name]);

    }

    async update({ id, name }) {

        const { rowCount } = await db.query(
            `
      UPDATE governorates
      SET name = $2
      WHERE id = $1
      `,
            [id, name]
        );

        return rowCount > 0;

    }

    async delete(id) {

        const { rowCount } = await db.query(
            `DELETE FROM governorates WHERE id = $1`,
            [id]
        );

        return rowCount > 0;

    }

    async findById(id) {

        const { rows } = await db.query(
            `SELECT * FROM governorates WHERE id = $1`,
            [id]
        );

        return rows[0] || null;

    }

    async list({ limit, offset }) {

        const sql = `
      SELECT
        g.id,
        g.name
      FROM governorates g
      ORDER BY g.name
      LIMIT $1 OFFSET $2
    `;

        const { rows } = await db.query(sql, [limit, offset]);

        return rows;

    }

    async count() {

        const { rows } = await db.query(
            `SELECT COUNT(*)::int as count FROM governorates`
        );

        return rows[0].count;

    }

}

module.exports = new GovernorateRepository();