const db = require("../helpers/DBHelper");
const { randomUUID } = require("crypto");

class OrderRepository {
  async create(order, client) {
    const id = randomUUID();

    await client.query(
      `
      INSERT INTO orders
      (id, customer_id, marketer_id, branch_id, delivery_point_id, coupon_id, discount_percentage, discount_amount, total_main_price, total_sold_price, notes, status)

      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDING')
      `,
      [
        id,
        order.customer_id,
        order.marketer_id,
        order.branch_id,
        order.delivery_point_id || null,
        order.coupon_id || null,
        order.discount_percentage || null,
        order.discount_amount || 0,
        order.total_price,
        order.sold_price,
        order.notes,
      ],
    );

    return id;
  }

  async findById(id) {
    const { rows } = await db.query(
      `
    SELECT *
    FROM orders
    WHERE id = $1
  `,
      [id],
    );

    return rows[0] || null;
  }

  async updateStatus(id, status, client = null) {
    const queryClient = client || db;
    await queryClient.query(
      `
    UPDATE orders
    SET status = $1
    WHERE id = $2
  `,
      [status, id],
    );
  }

  async listPaginated({ user, page = 1, limit = 20, filters = {} }) {
    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];
    let index = 1;

    // Helper function to add parameters
    const addParam = (value) => {
      params.push(value);
      return `$${index++}`;
    };

    // 🎯 Get employee data if not already present in user object
    // The user token only contains id, phone, and role
    // We need to fetch branch_id and employee_id from the employees table
    let employeeData = null;
    if (user.role !== "ADMIN" && user.role !== "CUSTOMER") {
      const { rows } = await db.query(
        `SELECT e.id AS employee_id, e.branch_id FROM employees e WHERE e.user_id = $1`,
        [user.id],
      );
      if (rows.length > 0) {
        employeeData = rows[0];
      }
    }

    // 🎯 Role-based filtering with hierarchy support
    if (user.role === "ADMIN") {
      // Admin can see all orders, but can filter by branch if specified
      if (filters.branch_id) {
        whereConditions.push(`o.branch_id = ${addParam(filters.branch_id)}`);
      }
    } else if (user.role === "BRANCH_MANAGER") {
      // Branch manager sees orders in their branch only
      whereConditions.push(`o.branch_id = ${addParam(employeeData.branch_id)}`);
    } else if (user.role === "GENERAL_SUPERVISOR") {
      // General supervisor sees:
      // 1. Their own orders
      // 2. Orders from supervisors under them
      // 3. Orders from marketers under them and their supervisors
      whereConditions.push(`(
                o.marketer_id = ${addParam(employeeData.employee_id)} OR
                o.marketer_id IN (
                    SELECT e.id FROM employees e
                    WHERE e.supervisor_id = ${addParam(employeeData.employee_id)}
                ) OR
                o.marketer_id IN (
                    SELECT e.id FROM employees e
                    WHERE e.supervisor_id IN (
                        SELECT e2.id FROM employees e2
                        WHERE e2.supervisor_id = ${addParam(employeeData.employee_id)}
                    )
                )
            )`);
    } else if (user.role === "SUPERVISOR") {
      // Supervisor sees:
      // 1. Their own orders
      // 2. Orders from marketers under them
      whereConditions.push(`(
                o.marketer_id = ${addParam(employeeData.employee_id)} OR
                o.marketer_id IN (
                    SELECT e.id FROM employees e
                    WHERE e.supervisor_id = ${addParam(employeeData.employee_id)}
                )
            )`);
    } else if (user.role === "MARKETER") {
      // Marketer sees only their own orders
      whereConditions.push(
        `o.marketer_id = ${addParam(employeeData.employee_id)}`,
      );
    } else if (user.role === "CUSTOMER") {
      // Customer sees only their own orders
      whereConditions.push(`o.customer_id = ${addParam(user.customer_id)}`);
    }

    // 🎯 Additional filters for staff (not customers)
    if (user.role !== "CUSTOMER") {
      // Filter by specific marketer
      if (filters.marketer_id) {
        whereConditions.push(
          `o.marketer_id = ${addParam(filters.marketer_id)}`,
        );
      }

      // Filter by status
      if (filters.status) {
        whereConditions.push(`o.status = ${addParam(filters.status)}`);
      }

      // 🎯 Time-based filters
      if (filters.time_filter) {
        switch (filters.time_filter) {
          case "today":
            whereConditions.push(`DATE(o.created_at) = CURRENT_DATE`);
            break;
          case "week":
            whereConditions.push(
              `o.created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
            );
            break;
          case "month":
            whereConditions.push(
              `o.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            );
            break;
          case "year":
            whereConditions.push(
              `o.created_at >= DATE_TRUNC('year', CURRENT_DATE)`,
            );
            break;
          case "custom":
            if (filters.start_date) {
              whereConditions.push(`o.created_at >= ${addParam(filters.start_date)}`);
            }
            if (filters.end_date) {
              // Add a day to end date to make it inclusive (less than next day at midnight)
              whereConditions.push(`o.created_at < (${addParam(filters.end_date)}::date + interval '1 day')`);
            }
            break;
          case "all":
            // No additional filter
            break;
          case "recent":
          default:
            // Most recent 5 orders by each marketer (default)
            // This will be handled in the main query with window functions
            break;
        }
      }
    }

    // Build WHERE clause
    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // 🎯 Handle "recent" filter (most recent 5 orders by marketer) for non-customers
    let mainQuery;
    if (
      user.role !== "CUSTOMER" &&
      (!filters.time_filter || filters.time_filter === "recent")
    ) {
      // Use window function to get most recent 5 orders per marketer
      mainQuery = `
                WITH ranked_orders AS (
                    SELECT
                        o.*,
                        ROW_NUMBER() OVER (PARTITION BY o.marketer_id ORDER BY o.created_at DESC) as rn
                    FROM orders o
                    ${whereClause}
                )
                SELECT
                    ro.id,
                    ro.created_at,
                    (cu.first_name || ' ' || cu.last_name) AS customer_name,
                    cu.phone AS customer_phone,

                    (mu.first_name || ' ' || mu.last_name) AS marketer_name,
                    mu.phone AS marketer_phone,

                    g.name AS governorate,

                    ro.status,
                    ro.coupon_id,
                    ro.discount_percentage,
                    ro.discount_amount,
                    ro.total_main_price AS total_price,
                    ro.total_sold_price AS sold_price

                FROM ranked_orders ro

                LEFT JOIN customers c ON c.id = ro.customer_id
                LEFT JOIN users cu ON cu.id = c.user_id

                LEFT JOIN employees me ON me.id = ro.marketer_id
                LEFT JOIN users mu ON mu.id = me.user_id

                LEFT JOIN branches b ON b.id = ro.branch_id
                LEFT JOIN governorates g ON g.id = b.governorate_id

                WHERE ro.rn <= 5

                ORDER BY ro.created_at DESC
                LIMIT ${addParam(limit)} OFFSET ${addParam(offset)}
            `;
    } else {
      // Regular query for customers or when specific time filter is applied
      mainQuery = `
                SELECT
                    o.id,
                    o.created_at,
                    (cu.first_name || ' ' || cu.last_name) AS customer_name,
                    cu.phone AS customer_phone,

                    (mu.first_name || ' ' || mu.last_name) AS marketer_name,
                    mu.phone AS marketer_phone,

                    g.name AS governorate,

                    o.status,
                    o.coupon_id,
                    o.discount_percentage,
                    o.discount_amount,
                    o.total_main_price AS total_price,
                    o.total_sold_price AS sold_price

                FROM orders o

                LEFT JOIN customers c ON c.id = o.customer_id
                LEFT JOIN users cu ON cu.id = c.user_id

                LEFT JOIN employees me ON me.id = o.marketer_id
                LEFT JOIN users mu ON mu.id = me.user_id

                LEFT JOIN branches b ON b.id = o.branch_id
                LEFT JOIN governorates g ON g.id = b.governorate_id

                ${whereClause}

                ORDER BY o.created_at DESC
                LIMIT ${addParam(limit)} OFFSET ${addParam(offset)}
            `;
    }

    const { rows } = await db.query(mainQuery, params);

    // 🎯 Count query (similar logic but without LIMIT/OFFSET)
    let countQuery;
    let countParams = [];
    let countIndex = 1;

    const addCountParam = (value) => {
      countParams.push(value);
      return `$${countIndex++}`;
    };

    // Rebuild where conditions for count query
    let countWhereConditions = [];

    // Role-based filtering for count
    if (user.role === "ADMIN") {
      if (filters.branch_id) {
        countWhereConditions.push(
          `o.branch_id = ${addCountParam(filters.branch_id)}`,
        );
      }
    } else if (user.role === "BRANCH_MANAGER") {
      countWhereConditions.push(
        `o.branch_id = ${addCountParam(employeeData.branch_id)}`,
      );
    } else if (user.role === "GENERAL_SUPERVISOR") {
      countWhereConditions.push(`(
                o.marketer_id = ${addCountParam(employeeData.employee_id)} OR
                o.marketer_id IN (
                    SELECT e.id FROM employees e
                    WHERE e.supervisor_id = ${addCountParam(employeeData.employee_id)}
                ) OR
                o.marketer_id IN (
                    SELECT e.id FROM employees e
                    WHERE e.supervisor_id IN (
                        SELECT e2.id FROM employees e2
                        WHERE e2.supervisor_id = ${addCountParam(employeeData.employee_id)}
                    )
                )
            )`);
    } else if (user.role === "SUPERVISOR") {
      countWhereConditions.push(`(
                o.marketer_id = ${addCountParam(employeeData.employee_id)} OR
                o.marketer_id IN (
                    SELECT e.id FROM employees e
                    WHERE e.supervisor_id = ${addCountParam(employeeData.employee_id)}
                )
            )`);
    } else if (user.role === "MARKETER") {
      countWhereConditions.push(
        `o.marketer_id = ${addCountParam(employeeData.employee_id)}`,
      );
    } else if (user.role === "CUSTOMER") {
      countWhereConditions.push(
        `o.customer_id = ${addCountParam(user.customer_id)}`,
      );
    }

    // Additional filters for count
    if (user.role !== "CUSTOMER") {
      if (filters.marketer_id) {
        countWhereConditions.push(
          `o.marketer_id = ${addCountParam(filters.marketer_id)}`,
        );
      }
      if (filters.status) {
        countWhereConditions.push(
          `o.status = ${addCountParam(filters.status)}`,
        );
      }
      if (filters.time_filter) {
        switch (filters.time_filter) {
          case "today":
            countWhereConditions.push(`DATE(o.created_at) = CURRENT_DATE`);
            break;
          case "week":
            countWhereConditions.push(
              `o.created_at >= DATE_TRUNC('week', CURRENT_DATE)`,
            );
            break;
          case "month":
            countWhereConditions.push(
              `o.created_at >= DATE_TRUNC('month', CURRENT_DATE)`,
            );
            break;
          case "year":
            countWhereConditions.push(
              `o.created_at >= DATE_TRUNC('year', CURRENT_DATE)`,
            );
            break;
          case "custom":
            if (filters.start_date) {
              countWhereConditions.push(`o.created_at >= ${addCountParam(filters.start_date)}`);
            }
            if (filters.end_date) {
              countWhereConditions.push(`o.created_at < (${addCountParam(filters.end_date)}::date + interval '1 day')`);
            }
            break;
        }
      }
    }

    const countWhereClause =
      countWhereConditions.length > 0
        ? `WHERE ${countWhereConditions.join(" AND ")}`
        : "";

    if (
      user.role !== "CUSTOMER" &&
      (!filters.time_filter || filters.time_filter === "recent")
    ) {
      countQuery = `
                WITH ranked_orders AS (
                    SELECT
                        o.*,
                        ROW_NUMBER() OVER (PARTITION BY o.marketer_id ORDER BY o.created_at DESC) as rn
                    FROM orders o
                    ${countWhereClause}
                )
                SELECT COUNT(*) FROM ranked_orders WHERE rn <= 5
            `;
    } else {
      countQuery = `
                SELECT COUNT(*)
                FROM orders o
                ${countWhereClause}
            `;
    }

    const countRes = await db.query(countQuery, countParams);

    return {
      data: rows,
      total: parseInt(countRes.rows[0].count),
    };
  }

  async getById(orderId) {
    // 🔹 1. Order basic info
    const orderRes = await db.query(
      `
            SELECT
                o.id,
                o.marketer_id,
                o.customer_id,
                o.status,
                o.branch_id,
                o.delivery_point_id,
                o.coupon_id,
                o.discount_percentage,
                o.discount_amount,
                dp.name AS delivery_point_name,
                dp.fee AS delivery_fee,
                o.created_at,
                o.total_main_price AS total_price,
                o.total_sold_price AS sold_price,

                (cu.first_name || ' ' || cu.last_name) AS customer_name,
                cu.phone AS customer_phone,

                (mu.first_name || ' ' || mu.last_name) AS marketer_name,
                mu.phone AS marketer_phone,

                (su.first_name || ' ' || su.last_name) AS supervisor_name,
                (gsu.first_name || ' ' || gsu.last_name) AS general_supervisor_name,

                g.name AS branch_name,

                g.name AS governorate,
                cpn.code AS coupon_code

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
            LEFT JOIN delivery_points dp ON dp.id = o.delivery_point_id
            LEFT JOIN coupons cpn ON cpn.id = o.coupon_id

            WHERE o.id = $1
        `,
      [orderId],
    );

    if (!orderRes.rows.length) return null;

    const order = orderRes.rows[0];

    // 🔹 2. Order items + commission per product
    const itemsRes = await db.query(
      `
      SELECT
        p.name,
        p.description,

        oi.quantity,
        oi.main_price,
        oi.sold_price,

        p.id AS product_id

      FROM order_items oi
      JOIN products p ON p.id = oi.product_id

      WHERE oi.order_id = $1
    `,
      [orderId],
    );

    // 🔹 3. Wallet transactions (if approved)
    let transactions = [];

    if (order.status === "APPROVED") {
      const txRes = await db.query(
        `
        SELECT
          (u.first_name || ' ' || u.last_name) AS employee_name,
          wt.amount
        FROM wallet_transactions wt
        JOIN employees e ON e.id = wt.employee_id
        JOIN users u ON u.id = e.user_id
        WHERE wt.order_id = $1
      `,
        [orderId],
      );

      transactions = txRes.rows;
    }

    return {
      ...order,
      items: itemsRes.rows,
      transactions,
    };
  }

  async getOrdersByCustomerId(customerId) {
    const { rows } = await db.query(
      `
    SELECT
      id,
      status,
      coupon_id,
      discount_percentage,
      discount_amount,
      total_main_price,
      total_sold_price,
      created_at
    FROM orders
    WHERE customer_id = $1
    ORDER BY created_at DESC
  `,
      [customerId],
    );

    return rows;
  }

  async getItemsByOrderIds(orderIds) {
    if (!orderIds.length) return [];

    const { rows } = await db.query(
      `
    SELECT
      oi.order_id,

      p.name,
      p.description,

      oi.quantity,
      oi.main_price,
      oi.sold_price

    FROM order_items oi

    JOIN products p
      ON p.id = oi.product_id

    WHERE oi.order_id = ANY($1)
  `,
      [orderIds],
    );

    return rows;
  }

  async cancelOrder(orderId, client) {
    await client.query(
      `
      UPDATE orders
      SET status = $1
      WHERE id = $2
    `,
      ['CANCELLED', orderId],
    );
  }

  /**
   * Check if a marketer directly reports to a given supervisor
   */
  async _marketerReportsToSupervisor(marketerId, supervisorId) {
    const { rows } = await db.query(
      `
      SELECT 1
      FROM employees
      WHERE id = $1 AND supervisor_id = $2
    `,
      [marketerId, supervisorId],
    );
    return rows.length > 0;
  }

  /**
   * Check if a marketer is anywhere under a general supervisor's hierarchy
   * (direct supervisors under GS + marketers under those supervisors)
   */
  async _marketerReportsToGeneralSupervisor(marketerId, generalSupervisorId) {
    const { rows } = await db.query(
      `
      SELECT 1
      FROM employees m
      WHERE m.id = $1
      AND (
        -- Marketer reports directly to GS
        m.supervisor_id = $2
        OR
        -- Marketer reports to a supervisor who reports to GS
        m.supervisor_id IN (
          SELECT s.id FROM employees s
          WHERE s.supervisor_id = $2
        )
      )
    `,
      [marketerId, generalSupervisorId],
    );
    return rows.length > 0;
  }
}

module.exports = new OrderRepository();
