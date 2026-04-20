const db = require('../helpers/DBHelper');

class CouponRepository {
  normalizeCode(code) {
    return String(code || '').trim().toUpperCase();
  }

  async create({ code, discount_percentage, number_of_people }) {
    const normalizedCode = this.normalizeCode(code);
    const { rows } = await db.query(
      `
        INSERT INTO coupons (code, discount_percentage, number_of_people)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [normalizedCode, discount_percentage, number_of_people],
    );
    return rows[0];
  }

  async findById(id) {
    const { rows } = await db.query(
      `
        SELECT *
        FROM coupons
        WHERE id = $1
      `,
      [id],
    );
    return rows[0] || null;
  }

  async findByCode(code) {
    const normalizedCode = this.normalizeCode(code);
    const { rows } = await db.query(
      `
        SELECT *
        FROM coupons
        WHERE code = $1
      `,
      [normalizedCode],
    );
    return rows[0] || null;
  }

  async findByCodeForUpdate(client, code) {
    const normalizedCode = this.normalizeCode(code);
    const { rows } = await client.query(
      `
        SELECT *
        FROM coupons
        WHERE code = $1
        FOR UPDATE
      `,
      [normalizedCode],
    );
    return rows[0] || null;
  }

  async listPaginated({ page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const { rows } = await db.query(
      `
        SELECT
          id,
          code,
          discount_percentage,
          number_of_people,
          used_count,
          (number_of_people - used_count) AS remaining_count,
          created_at,
          updated_at
        FROM coupons
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    const { rows: countRows } = await db.query(`SELECT COUNT(*)::int AS total FROM coupons`);
    return {
      data: rows,
      total: countRows[0]?.total || 0,
    };
  }

  async update(id, payload) {
    const { rows } = await db.query(
      `
        UPDATE coupons
        SET code = COALESCE($2, code),
            discount_percentage = COALESCE($3, discount_percentage),
            number_of_people = COALESCE($4, number_of_people),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        id,
        payload.code ? this.normalizeCode(payload.code) : null,
        payload.discount_percentage ?? null,
        payload.number_of_people ?? null,
      ],
    );
    return rows[0] || null;
  }

  async listAvailableForCache() {
    const { rows } = await db.query(
      `
        SELECT
          id,
          code,
          discount_percentage,
          number_of_people,
          used_count,
          (number_of_people - used_count) AS remaining_count
        FROM coupons
        WHERE used_count < number_of_people
      `,
    );
    return rows;
  }

  async hasCustomerUsedCoupon(client, { customerId, couponId }) {
    const { rows } = await client.query(
      `
        SELECT 1
        FROM coupon_usages
        WHERE customer_id = $1 AND coupon_id = $2
        LIMIT 1
      `,
      [customerId, couponId],
    );
    return rows.length > 0;
  }

  async hasCustomerUsedCouponByCode({ customerId, code }) {
    const normalizedCode = this.normalizeCode(code);
    const { rows } = await db.query(
      `
        SELECT 1
        FROM coupon_usages cu
        JOIN coupons c ON c.id = cu.coupon_id
        WHERE cu.customer_id = $1 AND c.code = $2
        LIMIT 1
      `,
      [customerId, normalizedCode],
    );
    return rows.length > 0;
  }

  async attachCouponToOrder(client, { customerId, couponId, orderId }) {
    await client.query(
      `
        INSERT INTO coupon_usages (customer_id, coupon_id, order_id)
        VALUES ($1, $2, $3)
      `,
      [customerId, couponId, orderId],
    );
  }

  async findUsageByOrderId(orderId) {
    const { rows } = await db.query(
      `
        SELECT coupon_id, order_id
        FROM coupon_usages
        WHERE order_id = $1
        LIMIT 1
      `,
      [orderId],
    );
    return rows[0] || null;
  }

  async incrementUsedCount(client, couponId) {
    const { rows } = await client.query(
      `
        UPDATE coupons
        SET used_count = used_count + 1,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [couponId],
    );
    return rows[0] || null;
  }
}

module.exports = new CouponRepository();
