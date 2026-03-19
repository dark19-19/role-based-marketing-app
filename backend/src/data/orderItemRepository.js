const { randomUUID } = require('crypto');
const db = require('../helpers/DBHelper')

class OrderItemRepository {

    async bulkInsert(orderId, items, client) {

        for (const item of items) {

            await client.query(
                `
        INSERT INTO order_items
        (id, order_id, product_id, quantity, main_price, sold_price)

        VALUES ($1,$2,$3,$4,$5,$6)
        `,
                [
                    randomUUID(),
                    orderId,
                    item.product_id,
                    item.quantity,
                    item.price,
                    item.price
                ]
            );

        }

    }

    async findByOrderId(orderId) {

        const { rows } = await db.query(`
    SELECT *
    FROM order_items
    WHERE order_id = $1
  `, [orderId]);

        return rows;

    }

}

module.exports = new OrderItemRepository();