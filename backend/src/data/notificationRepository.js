const db = require("../helpers/DBHelper");

class NotificationRepository {
  async create({ userId, title, message }) {
    if (
      !userId ||
      typeof userId !== "string" ||
      !/^[0-9a-fA-F-]{36}$/.test(userId)
    ) {
      throw new Error("Invalid userId: must be a valid UUID");
    }

    const { rows } = await db.query(
      `
      INSERT INTO notifications (
        user_id,
        title,
        message
      )
      VALUES ($1,$2,$3)
      RETURNING *
    `,
      [userId, title, message],
    );

    return rows[0];
  }

  async bulkCreate(notifications) {
    for (const n of notifications) {
      await db.query(
        `
        INSERT INTO notifications
        (user_id,title,message)
        VALUES ($1,$2,$3)
      `,
        [n.userId, n.title, n.message],
      );
    }
  }

  async findById(id) {
    const { rows } = await db.query(
      `
      SELECT *
      FROM notifications
      WHERE id=$1
      AND deleted_at IS NULL
    `,
      [id],
    );

    return rows[0] || null;
  }

  async listPaginated(userId, limit, offset) {
    const { rows } = await db.query(
      `
      SELECT
        id,
        title,
        message,
        is_read,
        created_at
      FROM notifications
      WHERE user_id=$1
      AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [userId, limit, offset],
    );

    const { rows: count } = await db.query(
      `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE user_id=$1
      AND deleted_at IS NULL
    `,
      [userId],
    );

    return {
      data: rows,
      total: Number(count[0].total),
    };
  }

  async markAsRead(id, userId) {
    await db.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id=$1
      AND user_id=$2
    `,
      [id, userId],
    );
  }

  async softDelete(id, userId) {
    await db.query(
      `
      UPDATE notifications
      SET deleted_at = NOW()
      WHERE id=$1
      AND user_id=$2
    `,
      [id, userId],
    );
  }

  async getCount(userId) {
    const { rows } = await db.query(
      `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE user_id=$1
      AND deleted_at IS NULL
    `,
      [userId],
    );

    return Number(rows[0].total);
  }

  async getUnreadCount(userId) {
    const { rows } = await db.query(
      `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE user_id=$1
      AND is_read = FALSE
      AND deleted_at IS NULL
    `,
      [userId],
    );

    return Number(rows[0].total);
  }
}

module.exports = new NotificationRepository();
