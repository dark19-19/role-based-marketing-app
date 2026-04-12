const db = require('../helpers/DBHelper');

class ResetKeyRepository {
  async create({ userId, resetKeyHash, expiresAt }) {
    const { rows } = await db.query(
      `
        INSERT INTO reset_keys (user_id, reset_key_hash, expires_at)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, expires_at
      `,
      [userId, resetKeyHash, expiresAt],
    );
    return rows[0];
  }

  async consumeValid(resetKeyHash) {
    return await db.runInTransaction(async (client) => {
      const { rows } = await client.query(
        `
          SELECT id, user_id
          FROM reset_keys
          WHERE reset_key_hash = $1
            AND used_at IS NULL
            AND expires_at > NOW()
          LIMIT 1
          FOR UPDATE
        `,
        [resetKeyHash],
      );

      const rec = rows[0] || null;
      if (!rec) return null;

      await client.query(
        `
          UPDATE reset_keys
          SET used_at = NOW()
          WHERE id = $1
        `,
        [rec.id],
      );

      return rec;
    });
  }
}

module.exports = new ResetKeyRepository();

