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
    const result = await db.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id=$1
      AND user_id=$2
    `,
      [id, userId],
    );

    return result.rowCount;
  }

  async softDelete(id, userId) {
    const result = await db.query(
      `
      UPDATE notifications
      SET deleted_at = NOW()
      WHERE id=$1
      AND user_id=$2
    `,
      [id, userId],
    );

    return result.rowCount;
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

  async markAllAsRead(userId) {
    const result = await db.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
      AND deleted_at IS NULL
    `,
      [userId],
    );

    return result.rowCount;
  }


  async getActiveCount() {
    const { rows } = await db.query(
      `
        SELECT COUNT(*)::int AS total
        FROM notifications
        WHERE deleted_at IS NULL
      `,
    );

    return Number(rows[0].total);
  }

  async softDeleteOldestExcess(keepCount) {
    const keep = Number.parseInt(String(keepCount), 10);
    if (Number.isNaN(keep) || keep < 1) {
      throw new Error(`Invalid keepCount: ${keepCount}`);
    }

    const result = await db.query(
      `
        WITH to_delete AS (
          SELECT id
          FROM notifications
          WHERE deleted_at IS NULL
          ORDER BY created_at DESC, id DESC
          OFFSET $1
        )
        UPDATE notifications
        SET deleted_at = NOW()
        WHERE id IN (SELECT id FROM to_delete)
      `,
      [keep],
    );

    return result.rowCount;
  }

  async hardDeleteSoftDeletedOlderThanDays(days) {
    const retentionDays = Number.parseInt(String(days), 10);
    if (Number.isNaN(retentionDays) || retentionDays < 1) {
      throw new Error(`Invalid days: ${days}`);
    }

    const result = await db.query(
      `
        DELETE FROM notifications
        WHERE deleted_at IS NOT NULL
          AND deleted_at < (NOW() - ($1 * INTERVAL '1 day'))
      `,
      [retentionDays],
    );

    return result.rowCount;
  }
}

module.exports = new NotificationRepository();
