const db = require('../helpers/DBHelper');

class DeliveryPointRepository {
  async create({ branch_id, name, fee }) {
    const { rows } = await db.query(
      `
        INSERT INTO delivery_points (branch_id, name, fee)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [branch_id, name, fee],
    );
    return rows[0];
  }

  async findById(id) {
    const { rows } = await db.query(
      `
        SELECT *
        FROM delivery_points
        WHERE id = $1
      `,
      [id],
    );
    return rows[0] || null;
  }

  async listForBranchPublic(branchId) {
    const { rows } = await db.query(
      `
        SELECT id, name
        FROM delivery_points
        WHERE branch_id = $1
        ORDER BY name ASC
      `,
      [branchId],
    );
    return rows;
  }

  async getPublicDetails(id) {
    const { rows } = await db.query(
      `
        SELECT
          dp.id,
          dp.branch_id,
          dp.name,
          dp.fee,
          g.name AS branch_name
        FROM delivery_points dp
        JOIN branches b ON b.id = dp.branch_id
        JOIN governorates g ON g.id = b.governorate_id
        WHERE dp.id = $1
      `,
      [id],
    );
    return rows[0] || null;
  }

  async listPaginated({ branchId = null, limit = 20, offset = 0 }) {
    const values = [];
    let where = '';
    if (branchId) {
      values.push(branchId);
      where = `WHERE dp.branch_id = $${values.length}`;
    }

    values.push(limit);
    values.push(offset);

    const { rows } = await db.query(
      `
        SELECT
          dp.id,
          dp.branch_id,
          dp.name,
          dp.fee,
          dp.created_at,
          g.name AS branch_name
        FROM delivery_points dp
        JOIN branches b ON b.id = dp.branch_id
        JOIN governorates g ON g.id = b.governorate_id
        ${where}
        ORDER BY dp.created_at DESC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}
      `,
      values,
    );

    const countValues = branchId ? [branchId] : [];
    const { rows: countRows } = await db.query(
      `
        SELECT COUNT(*)::int AS total
        FROM delivery_points dp
        ${branchId ? 'WHERE dp.branch_id = $1' : ''}
      `,
      countValues,
    );

    return { data: rows, total: countRows[0]?.total || 0 };
  }

  async update(id, { name, fee }) {
    const { rows } = await db.query(
      `
        UPDATE delivery_points
        SET name = COALESCE($2, name),
            fee = COALESCE($3, fee)
        WHERE id = $1
        RETURNING *
      `,
      [id, name ?? null, fee ?? null],
    );
    return rows[0] || null;
  }

  async remove(id) {
    await db.query(
      `
        DELETE FROM delivery_points
        WHERE id = $1
      `,
      [id],
    );
    return true;
  }
}

module.exports = new DeliveryPointRepository();

