const db = require('../helpers/DBHelper');

class ProductRepository {

  async createProductWithImage(product, imageUrl) {

    const client = await db.getClient();

    try {

      await client.query('BEGIN');

      const productSql = `
        INSERT INTO products
        (name, description, price, quantity, category_id)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *
      `;

      const productResult = await client.query(productSql, [
        product.name,
        product.description,
        product.price,
        product.quantity,
        product.category_id
      ]);

      const createdProduct = productResult.rows[0];

      const imageSql = `
        INSERT INTO product_images
        (product_id, image_url, sort_order)
        VALUES ($1,$2,0)
      `;

      await client.query(imageSql, [
        createdProduct.id,
        imageUrl
      ]);

      await client.query('COMMIT');

      return createdProduct;

    } catch (err) {

      await client.query('ROLLBACK');
      throw err;

    } finally {

      client.release();

    }
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
        p.*,
        c.name AS category,
        pi.image_url

      FROM products p

      LEFT JOIN categories c
      ON c.id = p.category_id

      LEFT JOIN product_images pi
      ON pi.product_id = p.id
      AND pi.sort_order = 0
      AND pi.deleted_at IS NULL

      WHERE p.id = $1
      AND p.deleted_at IS NULL
    `;

    const { rows } = await db.query(sql, [id]);

    return rows[0];
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