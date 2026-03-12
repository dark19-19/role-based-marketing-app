const db = require('../helpers/DBHelper');

class RoleRepository {

  async create({ id, name }) {
    const sql = `
      INSERT INTO roles (id, name)
      VALUES ($1,$2)
      RETURNING id,name,created_at
    `;
    const { rows } = await db.query(sql, [id, name]);
    return rows[0];
  }

  async findByName(name) {
    const sql = `SELECT * FROM roles WHERE name=$1 AND deleted_at IS NULL`;
    const { rows } = await db.query(sql, [name]);
    return rows[0] || null;
  }

  async findById(id) {
    const sql = `SELECT * FROM roles WHERE id=$1 AND deleted_at IS NULL`;
    const { rows } = await db.query(sql, [id]);
    return rows[0] || null;
  }

  async findAll() {
    const sql = `SELECT id,name,created_at FROM roles WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    const { rows } = await db.query(sql);
    return rows;
  }

  async update(id, name) {
    const sql = `
      UPDATE roles
      SET name=$2 , updated_at=NOW()
      WHERE id=$1 AND deleted_at IS NULL
      RETURNING id,name
    `;
    const { rows } = await db.query(sql, [id, name]);
    return rows[0] || null;
  }

  async delete(id) {
    const sql = `
      UPDATE roles
      SET deleted_at=NOW()
      WHERE id=$1
    `;
    await db.query(sql, [id]);
  }

}

module.exports = new RoleRepository();