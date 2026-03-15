const db = require('../helpers/DBHelper');

class ProductImageRepository {

async addImage(productId, imageUrl, sortOrder){

const sql = `
INSERT INTO product_images
(product_id, image_url, sort_order)
VALUES ($1,$2,$3)
RETURNING *
`;

const { rows } = await db.query(sql,[productId,imageUrl,sortOrder]);

return rows[0];

}

async findImagesByProduct(productId){

const sql = `
SELECT
id,
image_url,
sort_order
FROM product_images
WHERE product_id = $1
AND deleted_at IS NULL
ORDER BY sort_order ASC
`;

const { rows } = await db.query(sql,[productId]);

return rows;

}

async getMaxSortOrder(productId){

const sql = `
SELECT COALESCE(MAX(sort_order),-1) as max
FROM product_images
WHERE product_id=$1
AND deleted_at IS NULL
`;

const { rows } = await db.query(sql,[productId]);

return rows[0].max;

}

async updateOrder(imageId,newOrder){

const sql = `
UPDATE product_images
SET sort_order=$1
WHERE id=$2
RETURNING *
`;

const { rows } = await db.query(sql,[newOrder,imageId]);

return rows[0];

}

async softDelete(imageId){

const sql = `
UPDATE product_images
SET deleted_at=NOW()
WHERE id=$1
`;

await db.query(sql,[imageId]);

}

}

module.exports = new ProductImageRepository();