const db = require('../helpers/DBHelper');

const PREFIX = '0000_0000_';
const USER_TAG = 'SD';

async function revoke() {
  console.log('🔥 Starting revocation process...');

  try {
    const summary = await db.runInTransaction(async (client) => {
      const seededUsers = await client.query(
        `
          SELECT id
          FROM users
          WHERE last_name LIKE $1
        `,
        [`${USER_TAG}_%`],
      );
      const userIds = seededUsers.rows.map((row) => row.id);

      const seededEmployees = userIds.length
        ? await client.query(
            `
              SELECT id
              FROM employees
              WHERE user_id = ANY($1::uuid[])
            `,
            [userIds],
          )
        : { rows: [] };

      const seededCustomers = userIds.length
        ? await client.query(
            `
              SELECT id
              FROM customers
              WHERE user_id = ANY($1::uuid[])
            `,
            [userIds],
          )
        : { rows: [] };

      const employeeIds = seededEmployees.rows.map((row) => row.id);
      const customerIds = seededCustomers.rows.map((row) => row.id);

      const seededOrders = await client.query(
        `
          SELECT id
          FROM orders
          WHERE notes LIKE $1
             OR branch_note LIKE $1
             OR ($2::uuid[] IS NOT NULL AND marketer_id = ANY($2::uuid[]))
             OR ($3::uuid[] IS NOT NULL AND customer_id = ANY($3::uuid[]))
        `,
        [`${PREFIX}%`, employeeIds.length ? employeeIds : null, customerIds.length ? customerIds : null],
      );
      const orderIds = seededOrders.rows.map((row) => row.id);

      const seededProducts = await client.query(
        `
          SELECT id
          FROM products
          WHERE description LIKE $1
        `,
        [`${PREFIX}%`],
      );
      const productIds = seededProducts.rows.map((row) => row.id);

      let deletedOrderComments = 0;
      let deletedCouponUsages = 0;
      let deletedNotifications = 0;
      let deletedWalletTransactions = 0;
      let deletedOrderCommissions = 0;
      let deletedOrderItems = 0;
      let deletedOrders = 0;
      let deletedSalaryRequests = 0;
      let deletedCustomers = 0;
      let deletedEmployees = 0;
      let deletedUsers = 0;
      let deletedCommissionSettings = 0;
      let deletedProductImages = 0;
      let deletedProducts = 0;
      let deletedCategories = 0;

      if (orderIds.length > 0 || userIds.length > 0) {
        const result = await client.query(
          `
            DELETE FROM order_comments
            WHERE ($1::uuid[] IS NOT NULL AND order_id = ANY($1::uuid[]))
               OR ($2::uuid[] IS NOT NULL AND added_by = ANY($2::uuid[]))
          `,
          [orderIds.length ? orderIds : null, userIds.length ? userIds : null],
        );
        deletedOrderComments = result.rowCount;
      }

      if (orderIds.length > 0 || customerIds.length > 0) {
        const result = await client.query(
          `
            DELETE FROM coupon_usages
            WHERE ($1::uuid[] IS NOT NULL AND order_id = ANY($1::uuid[]))
               OR ($2::uuid[] IS NOT NULL AND customer_id = ANY($2::uuid[]))
          `,
          [orderIds.length ? orderIds : null, customerIds.length ? customerIds : null],
        );
        deletedCouponUsages = result.rowCount;
      }

      if (userIds.length > 0) {
        const result = await client.query(
          `DELETE FROM notifications WHERE user_id = ANY($1::uuid[])`,
          [userIds],
        );
        deletedNotifications = result.rowCount;
      }

      if (employeeIds.length > 0 || orderIds.length > 0) {
        const result = await client.query(
          `
            DELETE FROM wallet_transactions
            WHERE ($1::uuid[] IS NOT NULL AND employee_id = ANY($1::uuid[]))
               OR ($2::uuid[] IS NOT NULL AND order_id = ANY($2::uuid[]))
          `,
          [employeeIds.length ? employeeIds : null, orderIds.length ? orderIds : null],
        );
        deletedWalletTransactions = result.rowCount;
      }

      if (orderIds.length > 0) {
        let result = await client.query(
          `DELETE FROM order_commissions WHERE order_id = ANY($1::uuid[])`,
          [orderIds],
        );
        deletedOrderCommissions = result.rowCount;

        result = await client.query(
          `DELETE FROM order_items WHERE order_id = ANY($1::uuid[])`,
          [orderIds],
        );
        deletedOrderItems = result.rowCount;

        result = await client.query(`DELETE FROM orders WHERE id = ANY($1::uuid[])`, [orderIds]);
        deletedOrders = result.rowCount;
      }

      if (employeeIds.length > 0) {
        const result = await client.query(
          `DELETE FROM salary_requests WHERE employee_id = ANY($1::uuid[])`,
          [employeeIds],
        );
        deletedSalaryRequests = result.rowCount;
      }

      if (customerIds.length > 0) {
        const result = await client.query(`DELETE FROM customers WHERE id = ANY($1::uuid[])`, [customerIds]);
        deletedCustomers = result.rowCount;
      }

      if (employeeIds.length > 0) {
        const result = await client.query(`DELETE FROM employees WHERE id = ANY($1::uuid[])`, [employeeIds]);
        deletedEmployees = result.rowCount;
      }

      if (userIds.length > 0) {
        const result = await client.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [userIds]);
        deletedUsers = result.rowCount;
      }

      if (productIds.length > 0) {
        let result = await client.query(
          `DELETE FROM commission_settings WHERE product_id = ANY($1::uuid[])`,
          [productIds],
        );
        deletedCommissionSettings = result.rowCount;

        result = await client.query(
          `DELETE FROM product_images WHERE product_id = ANY($1::uuid[])`,
          [productIds],
        );
        deletedProductImages = result.rowCount;

        result = await client.query(`DELETE FROM products WHERE id = ANY($1::uuid[])`, [productIds]);
        deletedProducts = result.rowCount;
      }

      const categoriesResult = await client.query(
        `DELETE FROM categories WHERE name LIKE $1`,
        [`${PREFIX}%`],
      );
      deletedCategories = categoriesResult.rowCount;

      return {
        deletedOrderComments,
        deletedCouponUsages,
        deletedNotifications,
        deletedWalletTransactions,
        deletedOrderCommissions,
        deletedOrderItems,
        deletedOrders,
        deletedSalaryRequests,
        deletedCustomers,
        deletedEmployees,
        deletedUsers,
        deletedCommissionSettings,
        deletedProductImages,
        deletedProducts,
        deletedCategories,
      };
    });

    console.log('✅ Revocation completed successfully');
    console.log('🧹 Revocation summary:', summary);
  } catch (err) {
    console.error('❌ Revocation failed:', err);
    process.exit(1);
  }
}


revoke();
