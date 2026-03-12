const db = require('../helpers/DBHelper');

module.exports = {
  name: '0002_final_indexes',

  up: async () => {
    await db.runInTransaction(async (client) => {

      // ===============================
      // USERS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_username
        ON users(username);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_tele_id
        ON users(tele_id);
      `);


      // ===============================
      // JWT TOKENS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_jwt_tokens_user_id
        ON jwt_tokens(user_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_jwt_tokens_token
        ON jwt_tokens(token);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_jwt_tokens_revoked
        ON jwt_tokens(revoked);
      `);


      // ===============================
      // GOVERNORATES
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_governorates_name
        ON governorates(name);
      `);


      // ===============================
      // BRANCHES
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_branches_governorate_id
        ON branches(governorate_id);
      `);


      // ===============================
      // EMPLOYEES
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_employees_user_id
        ON employees(user_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_employees_branch_id
        ON employees(branch_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_employees_supervisor_id
        ON employees(supervisor_id);
      `);


      // composite index hierarchy queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_employees_supervisor_branch
        ON employees(supervisor_id, branch_id);
      `);


      // ===============================
      // CUSTOMERS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_user_id
        ON customers(user_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_governorate_id
        ON customers(governorate_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_referred_by
        ON customers(referred_by);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_customers_first_marketer
        ON customers(first_marketer_id);
      `);


      // ===============================
      // CATEGORIES
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_categories_name
        ON categories(name);
      `);


      // ===============================
      // PRODUCTS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_category_id
        ON products(category_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_is_active
        ON products(is_active);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_in_stock
        ON products(in_stock);
      `);

      // composite product filtering
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_products_category_active
        ON products(category_id, is_active);
      `);


      // ===============================
      // PRODUCT IMAGES
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_product_images_product_id
        ON product_images(product_id);
      `);


      // ===============================
      // COMMISSION SETTINGS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_commission_settings_product_id
        ON commission_settings(product_id);
      `);


      // ===============================
      // ORDERS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_customer_id
        ON orders(customer_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_marketer_id
        ON orders(marketer_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_branch_id
        ON orders(branch_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_status
        ON orders(status);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_created_at
        ON orders(created_at);
      `);

      // composite indexes for order queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_branch_status
        ON orders(branch_id, status);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_marketer_status
        ON orders(marketer_id, status);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_orders_branch_created
        ON orders(branch_id, created_at DESC);
      `);


      // ===============================
      // ORDER ITEMS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_order_items_order_id
        ON order_items(order_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_order_items_product_id
        ON order_items(product_id);
      `);


      // ===============================
      // ORDER COMMISSIONS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_order_commissions_order_id
        ON order_commissions(order_id);
      `);


      // ===============================
      // WALLET TRANSACTIONS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_wallet_transactions_employee_id
        ON wallet_transactions(employee_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_wallet_transactions_order_id
        ON wallet_transactions(order_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at
        ON wallet_transactions(created_at);
      `);

      // composite for salary history
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_wallet_transactions_employee_created
        ON wallet_transactions(employee_id, created_at DESC);
      `);


      // ===============================
      // SALARY REQUESTS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_salary_requests_employee_id
        ON salary_requests(employee_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_salary_requests_status
        ON salary_requests(status);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_salary_requests_employee_status
        ON salary_requests(employee_id, status);
      `);


      // ===============================
      // NOTIFICATIONS
      // ===============================

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id
        ON notifications(user_id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read
        ON notifications(is_read);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at
        ON notifications(created_at);
      `);

      // composite for unread notifications
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_user_read
        ON notifications(user_id, is_read);
      `);

    });
  },
};