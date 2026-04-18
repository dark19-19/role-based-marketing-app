const db = require('../helpers/DBHelper');

class ProductRepository {

  async createProductWithImage(product) {
    const sql = `
        INSERT INTO products
        (name, description, price, quantity, category_id)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *
      `;

    const { rows } = await db.query(sql, [
      product.name,
      product.description,
      product.price,
      product.quantity,
      product.category_id,
    ]);

    return rows[0] || null;

  }

  async findAll({ limit, offset }) {

    const sql = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.quantity,
        p.in_stock,
        p.is_active,
        p.category_id,
        c.name AS category,
        (
          SELECT image_url 
          FROM product_images 
          WHERE product_id = p.id 
          AND deleted_at IS NULL 
          ORDER BY sort_order ASC 
          LIMIT 1
        ) AS image_url,
        (
          SELECT COUNT(*) 
          FROM product_images 
          WHERE product_id = p.id 
          AND deleted_at IS NULL
        )::int as image_count

      FROM products p

      LEFT JOIN categories c
      ON c.id = p.category_id

      WHERE p.deleted_at IS NULL

      ORDER BY p.created_at DESC

      LIMIT $1 OFFSET $2
    `;

    const { rows } = await db.query(sql, [limit, offset]);

    return rows;
  }

  async findById(id) {

    const sql = `
      SELECT
        p.id, p.name, p.description, p.price, p.quantity, p.in_stock, p.is_active, p.category_id,
        c.name AS category
      FROM products p

      LEFT JOIN categories c
      ON c.id = p.category_id

      WHERE p.id = $1
      AND p.deleted_at IS NULL
    `;

    const { rows } = await db.query(sql, [id]);

    return rows[0];
  }

  async count() {

    const { rows } = await db.query(
        `SELECT COUNT(*)::int as count FROM products WHERE deleted_at IS NULL`
    );

    return rows[0].count;

  }

  async updateProduct(id, data) {

    const sql = `
      UPDATE products
      SET
        name = $1,
        description = $2,
        price = $3,
        quantity = $4,
        category_id = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `;

    const { rows } = await db.query(sql, [
      data.name,
      data.description,
      data.price,
      data.quantity,
      data.category_id,
      id
    ]);

    return rows[0];
  }

  async softDelete(id) {

    const sql = `
      UPDATE products
      SET deleted_at = NOW()
      WHERE id = $1
    `;

    await db.query(sql, [id]);
  }

  async findByIds(ids) {

    const { rows } = await db.query(
        `
    SELECT id, price
    FROM products
    WHERE id = ANY($1)
    `,
        [ids]
    );

    return rows;

  }
  async decreaseQuantity({ product_id, quantity }, client = null) {
    const queryClient = client || db;

    const { rows } = await queryClient.query(`
      UPDATE products
      SET quantity = quantity - $2,
          in_stock = CASE WHEN (quantity - $2) <= 0 THEN FALSE ELSE TRUE END
      WHERE id = $1
        AND quantity >= $2
      RETURNING id, quantity
    `, [product_id, quantity]);

    if (!rows.length) {
      throw new Error('الكمية غير كافية لهذا المنتج');
    }

    return rows[0];

  }

  async increaseQuantity({ product_id, quantity }, client = null) {
    const queryClient = client || db;
    const { rows } = await queryClient.query(`
      UPDATE products
      SET quantity = quantity + $2,
          in_stock = CASE WHEN (quantity + $2) > 0 THEN TRUE ELSE FALSE END
      WHERE id = $1
      RETURNING id, quantity
    `, [product_id, quantity]);

    return rows[0] || null;
  }

}

module.exports = new ProductRepository();
