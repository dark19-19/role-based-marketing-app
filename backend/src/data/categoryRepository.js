const db = require('../helpers/DBHelper');

class CategoryRepository {

  async createCategory({ id, name }) {
    const sql = `
      INSERT INTO categories (id, name)
      VALUES ($1, $2)
      RETURNING id, name
    `;

    const { rows } = await db.query(sql, [id, name]);
    return rows[0];
  }

  async findByName(name) {
    const sql = `
      SELECT id FROM categories
      WHERE name = $1 AND deleted_at IS NULL
    `;

    const { rows } = await db.query(sql, [name]);
    return rows[0];
  }

  async findAll({ limit, offset }) {

  const sql = `
    SELECT id, name, created_at
    FROM categories
    WHERE deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;

  const { rows } = await db.query(sql, [limit, offset]);

  return rows;
}

  async findById(id) {
    const sql = `
      SELECT id, name
      FROM categories
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const { rows } = await db.query(sql, [id]);
    return rows[0];
  }

  async updateCategory({ id, name }) {
    const sql = `
      UPDATE categories
      SET name = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name
    `;

    const { rows } = await db.query(sql, [name, id]);
    return rows[0];
  }

  async softDelete(id) {
    const sql = `
      UPDATE categories
      SET deleted_at = NOW()
      WHERE id = $1
    `;

    await db.query(sql, [id]);
  }

}

module.exports = new CategoryRepository();