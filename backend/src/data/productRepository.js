const db = require('../helpers/DBHelper');

class ProductRepository {

  async createProductWithImage(product) {

    const client = await db.getClient();

      const sql = `
        INSERT INTO products
        (name, description, price, quantity, category_id)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING name, description, price, quantity, category_id
      `;

      const {rows} = await client.query(sql, [
        product.name,
        product.description,
        product.price,
        product.quantity,
        product.category_id
      ]);
       return rows[0] || null;

  }

  async findAll({ limit, offset }) {

    const sql = `
      SELECT
        p.id,
        p.name,
        p.price,
        p.quantity,
        c.name AS category,
        pi.image_url

      FROM products p

      LEFT JOIN categories c
      ON c.id = p.category_id

      LEFT JOIN product_images pi
      ON pi.product_id = p.id
      AND pi.sort_order = 0
      AND pi.deleted_at IS NULL

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
        p.name, p.description, p.price, p.quantity, p.in_stock, p.is_active, p.category_id,
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

}

module.exports = new ProductRepository();