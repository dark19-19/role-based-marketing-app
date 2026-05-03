const db = require('../helpers/DBHelper');

class StatsRepository {
  // ==================== ADMIN STATS ====================

  /**
   * Get top 5 branches with most orders
   */
  async getMostSellingBranches(limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        b.id,
        g.name AS governorate,
        COUNT(o.id)::int AS orders_count
      FROM branches b
      LEFT JOIN governorates g ON g.id = b.governorate_id
      LEFT JOIN orders o ON o.branch_id = b.id AND o.status != 'CANCELLED'
      GROUP BY b.id, g.name
      ORDER BY orders_count DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  /**
   * Get top 5 marketers with most orders
   */
  async getMostOrderingMarketers(limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        e.id,
        u.first_name || ' ' || u.last_name AS name,
        COUNT(o.id)::int AS orders_count
      FROM employees e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN orders o ON o.marketer_id = e.id AND o.status != 'CANCELLED'
      JOIN roles r ON r.id = u.role_id
      WHERE e.is_active = true AND r.name IN ('MARKETER', 'SUPERVISOR', 'GENERAL_SUPERVISOR')
      GROUP BY e.id, u.first_name, u.last_name
      ORDER BY orders_count DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  /**
   * Get top 5 customers with most orders
   */
  async getMostOrderingCustomers(limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        c.id,
        u.first_name || ' ' || u.last_name AS name,
        u.phone,
        COUNT(o.id)::int AS orders_count
      FROM customers c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN orders o ON o.customer_id = c.id AND o.status != 'CANCELLED'
      WHERE c.is_active = true
      GROUP BY c.id, u.first_name, u.last_name, u.phone
      ORDER BY orders_count DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  /**
   * Get top 5 most sold products
   */
  async getMostSoldProducts(limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.in_stock,
        COUNT(oi.id)::int AS orders_count,
        SUM(oi.quantity)::int AS total_quantity
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'CANCELLED'
      WHERE p.is_active = true AND p.deleted_at IS NULL
      GROUP BY p.id, p.name, p.price, p.in_stock
      ORDER BY orders_count DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }

  // ==================== BRANCH STATS ====================

  /**
   * Get top 5 marketers with most orders in a specific branch
   */
  async getMostOrderingMarketersByBranch(branchId, limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        e.id,
        u.first_name || ' ' || u.last_name AS name,
        COUNT(o.id)::int AS orders_count
      FROM employees e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN orders o ON o.marketer_id = e.id AND o.branch_id = $1 AND o.status != 'CANCELLED'
      WHERE e.branch_id = $1 AND e.is_active = true
      GROUP BY e.id, u.first_name, u.last_name
      ORDER BY orders_count DESC
      LIMIT $2
    `, [branchId, limit]);
    return rows;
  }

  /**
   * Get top 5 customers with most orders in a specific branch
   */
  async getMostOrderingCustomersByBranch(branchId, limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        c.id,
        u.first_name || ' ' || u.last_name AS name,
        u.phone,
        COUNT(o.id)::int AS orders_count
      FROM customers c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN orders o ON o.customer_id = c.id AND o.branch_id = $1 AND o.status != 'CANCELLED'
      WHERE c.is_active = true
      GROUP BY c.id, u.first_name, u.last_name, u.phone
      ORDER BY orders_count DESC
      LIMIT $2
    `, [branchId, limit]);
    return rows;
  }

  // ==================== EMPLOYEE STATS ====================

  /**
   * Get total profits (withdrew transactions) for an employee
   */
  async getEmployeeProfits(employeeId) {
    const { rows } = await db.query(`
      SELECT 
        COALESCE(SUM(amount), 0)::numeric AS total_profits
      FROM wallet_transactions
      WHERE employee_id = $1 AND type = 'WITHDREW'
    `, [employeeId]);
    return parseFloat(rows[0].total_profits);
  }

  /**
   * Get last 5 orders made by an employee (marketer)
   */
  async getEmployeeLastOrders(employeeId, limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        o.id,
        o.status,
        o.total_main_price,
        o.total_sold_price,
        o.discount_percentage,
        o.discount_amount,
        cp.code AS coupon_code,
        o.created_at,
        cu.first_name || ' ' || cu.last_name AS customer_name,
        cu.phone AS customer_phone,
        g.name AS governorate
      FROM orders o
      LEFT JOIN customers c ON c.id = o.customer_id
      LEFT JOIN users cu ON cu.id = c.user_id
      LEFT JOIN governorates g ON g.id = c.governorate_id
      LEFT JOIN coupons cp ON cp.id = o.coupon_id
      WHERE o.marketer_id = $1 AND o.status != 'CANCELLED'
      ORDER BY o.created_at DESC
      LIMIT $2
    `, [employeeId, limit]);
    return rows;
  }

  /**
   * Get top 5 ordering customers referred by an employee
   */
  async getEmployeeMostOrderingCustomers(employeeId, limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        c.id,
        u.first_name || ' ' || u.last_name AS name,
        u.phone,
        COUNT(o.id)::int AS orders_count,
        COALESCE(SUM(o.total_sold_price), 0)::numeric AS total_spent
      FROM customers c
      JOIN users u ON u.id = c.user_id
      LEFT JOIN orders o ON o.customer_id = c.id AND o.status != 'CANCELLED'
      WHERE c.referred_by = $1 AND c.is_active = true
      GROUP BY c.id, u.first_name, u.last_name, u.phone
      ORDER BY orders_count DESC
      LIMIT $2
    `, [employeeId, limit]);
    return rows;
  }

  // ==================== CUSTOMER STATS ====================

  /**
   * Get last 5 orders for a customer
   */
  async getCustomerLastOrders(customerId, limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        o.id,
        o.status,
        o.total_main_price,
        o.total_sold_price,
        o.discount_percentage,
        o.discount_amount,
        cp.code AS coupon_code,
        o.created_at,
        mu.first_name || ' ' || mu.last_name AS marketer_name,
        mu.phone AS marketer_phone,
        b.id AS branch_id,
        g.name AS governorate
      FROM orders o
      LEFT JOIN employees me ON me.id = o.marketer_id
      LEFT JOIN users mu ON mu.id = me.user_id
      LEFT JOIN branches b ON b.id = o.branch_id
      LEFT JOIN governorates g ON g.id = b.governorate_id
      LEFT JOIN coupons cp ON cp.id = o.coupon_id
      WHERE o.customer_id = $1 AND o.status != 'CANCELLED'
      ORDER BY o.created_at DESC
      LIMIT $2
    `, [customerId, limit]);
    return rows;
  }

  /**
   * Get top 5 most sold products (for customer stats)
   */
  async getMostSoldProductsForCustomer(limit = 5) {
    const { rows } = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.in_stock,
        COUNT(DISTINCT oi.order_id)::int AS orders_count,
        SUM(oi.quantity)::int AS total_quantity
      FROM products p
      LEFT JOIN order_items oi ON oi.product_id = p.id
      LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'CANCELLED'
      WHERE p.is_active = true AND p.deleted_at IS NULL
      GROUP BY p.id, p.name, p.price, p.in_stock
      ORDER BY orders_count DESC
      LIMIT $1
    `, [limit]);
    return rows;
  }
}

module.exports = new StatsRepository();
