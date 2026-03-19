const db = require('../helpers/DBHelper');
const { randomUUID } = require('crypto');

class OrderRepository {

    async create(order, client) {

        const id = randomUUID();

        await client.query(
            `
      INSERT INTO orders
      (id, customer_id, marketer_id, branch_id, total_main_price, total_sold_price, notes, status)

      VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING')
      `,
            [
                id,
                order.customer_id,
                order.marketer_id,
                order.branch_id,
                order.total_price,
                order.sold_price,
                order.notes
            ]
        );

        return id;

    }

    async findById(id) {

        const { rows } = await db.query(`
    SELECT *
    FROM orders
    WHERE id = $1
  `, [id]);

        return rows[0] || null;

    }

    async updateStatus(id, status) {

        await db.query(`
    UPDATE orders
    SET status = $1
    WHERE id = $2
  `, [status, id]);

    }

    async listPaginated({ user, page = 1, limit = 20 }) {

        const offset = (page - 1) * limit;

        let where = '';
        let params = [limit, offset];
        let index = 3;

        // 🎯 Role-based filtering
        if (user.role === 'ADMIN') {
            // no filter
        } else if (user.role === 'BRANCH_MANAGER') {
            where = `WHERE o.branch_id = $${index}`;
            params.push(user.branch_id);
            index++;
        } else if (['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR'].includes(user.role)) {
            where = `WHERE o.marketer_id = $${index}`;
            params.push(user.employee_id);
            index++;
        } else if (user.role === 'CUSTOMER') {
            where = `WHERE o.customer_id = $${index}`;
            params.push(user.customer_id);
            index++;
        }

        const { rows } = await db.query(`
      SELECT
        (cu.first_name || ' ' || cu.last_name) AS customer_name,
        cu.phone AS customer_phone,

        (mu.first_name || ' ' || mu.last_name) AS marketer_name,
        mu.phone AS marketer_phone,

        g.name AS governorate,

        o.status,
        o.total_main_price,
        o.total_sold_price

      FROM orders o

      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN users cu ON cu.id = c.user_id

      LEFT JOIN employees me ON me.id = o.marketer_id
      LEFT JOIN users mu ON mu.id = me.user_id

      LEFT JOIN branches b ON b.id = o.branch_id
      LEFT JOIN governorates g ON g.id = b.governorate_id

      ${where}

      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

        const countParams = [];
        let countWhere = '';

        if (user.role === 'ADMIN') {
            // nothing
        } else if (user.role === 'BRANCH_MANAGER') {
            countWhere = `WHERE o.branch_id = $1`;
            countParams.push(user.branch_id);
        } else if (['MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR'].includes(user.role)) {
            countWhere = `WHERE o.marketer_id = $1`;
            countParams.push(user.employee_id);
        } else if (user.role === 'CUSTOMER') {
            countWhere = `WHERE o.customer_id = $1`;
            countParams.push(user.customer_id);
        }

        const countRes = await db.query(`
      SELECT COUNT(*)
      FROM orders o
      ${countWhere}
    `, countParams);

        return {
            data: rows,
            total: parseInt(countRes.rows[0].count)
        };

    }

    async getById(orderId) {

        // 🔹 1. Order basic info
        const orderRes = await db.query(`
      SELECT
        o.id,
        o.status,
        o.total_main_price,
        o.total_sold_price,

        (cu.first_name || ' ' || cu.last_name) AS customer_name,
        cu.phone AS customer_phone,

        (mu.first_name || ' ' || mu.last_name) AS marketer_name,
        mu.phone AS marketer_phone,

        (su.first_name || ' ' || su.last_name) AS supervisor_name,
        (gsu.first_name || ' ' || gsu.last_name) AS general_supervisor_name,

        g.name AS governorate

      FROM orders o

      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN users cu ON cu.id = c.user_id

      LEFT JOIN employees me ON me.id = o.marketer_id
      LEFT JOIN users mu ON mu.id = me.user_id

      LEFT JOIN employees sup ON sup.id = me.supervisor_id
      LEFT JOIN users su ON su.id = sup.user_id

      LEFT JOIN employees gs ON gs.id = sup.supervisor_id
      LEFT JOIN users gsu ON gsu.id = gs.user_id

      LEFT JOIN branches b ON b.id = o.branch_id
      LEFT JOIN governorates g ON g.id = b.governorate_id

      WHERE o.id = $1
    `, [orderId]);

        if (!orderRes.rows.length) return null;

        const order = orderRes.rows[0];

        // 🔹 2. Order items + commission per product
        const itemsRes = await db.query(`
      SELECT
        p.name,
        p.description,

        oi.quantity,
        oi.main_price,
        oi.sold_price,

        COALESCE(cs.product_id) AS commission_type,

        cs.company_percentage,
        cs.general_supervisor_percentage,
        cs.supervisor_percentage

      FROM order_items oi
      JOIN products p ON p.id = oi.product_id

      LEFT JOIN commission_settings cs
        ON cs.product_id = oi.product_id
        OR cs.product_id IS NULL

      WHERE oi.order_id = $1
    `, [orderId]);

        // 🔹 3. Wallet transactions (if approved)
        let transactions = [];

        if (order.status === 'APPROVED') {

            const txRes = await db.query(`
        SELECT
          (u.first_name || ' ' || u.last_name) AS employee_name,
          wt.amount
        FROM wallet_transactions wt
        JOIN employees e ON e.id = wt.employee_id
        JOIN users u ON u.id = e.user_id
        WHERE wt.order_id = $1
      `, [orderId]);

            transactions = txRes.rows;
        }

        return {
            ...order,
            items: itemsRes.rows,
            transactions
        };

    }

}

module.exports = new OrderRepository();