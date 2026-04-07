const db = require("../helpers/DBHelper");

class OrderCommentRepository {
  async create({ orderId, addedBy, content }) {
    const { rows } = await db.query(
      `
      INSERT INTO order_comments (order_id, added_by, content)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [orderId, addedBy, content]
    );

    return rows[0];
  }

  async findByOrderId(orderId) {
    const { rows } = await db.query(
      `
      SELECT
        oc.id,
        oc.order_id,
        oc.content,
        oc.created_at,
        u.id as added_by,
        u.first_name,
        u.last_name,
        r.name as added_by_role
      FROM order_comments oc
      JOIN users u ON u.id = oc.added_by
      JOIN roles r ON r.id = u.role_id
      WHERE oc.order_id = $1
      ORDER BY oc.created_at DESC
    `,
      [orderId]
    );

    return rows;
  }

  async deleteByOrderId(orderId, client) {
    const queryClient = client || db;
    await queryClient.query(
      `
      DELETE FROM order_comments WHERE order_id = $1
    `,
      [orderId]
    );
  }
}

module.exports = new OrderCommentRepository();