const db = require("../helpers/DBHelper");

async function cleanupLast3Hours(client) {
  console.log("Starting database cleanup for data added in the last 3 hours...");

  const couponUsagesResult = await client.query(`
    DELETE FROM coupon_usages WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const orderCommentsResult = await client.query(`
    DELETE FROM order_comments WHERE created_at >= NOW() - INTERVAL '3 hours' OR order_id IN (
      SELECT id FROM orders WHERE created_at >= NOW() - INTERVAL '3 hours'
    )
  `);

  const orderItemsResult = await client.query(`
    DELETE FROM order_items WHERE order_id IN (
      SELECT id FROM orders WHERE created_at >= NOW() - INTERVAL '3 hours'
    )
  `);

  const orderCommissionsResult = await client.query(`
    DELETE FROM order_commissions WHERE created_at >= NOW() - INTERVAL '3 hours' OR order_id IN (
      SELECT id FROM orders WHERE created_at >= NOW() - INTERVAL '3 hours'
    )
  `);

  const walletTransactionsResult = await client.query(`
    DELETE FROM wallet_transactions WHERE created_at >= NOW() - INTERVAL '3 hours' OR order_id IN (
      SELECT id FROM orders WHERE created_at >= NOW() - INTERVAL '3 hours'
    )
  `);

  const ordersResult = await client.query(`
    DELETE FROM orders WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const resetKeysResult = await client.query(`
    DELETE FROM reset_keys WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const customersResult = await client.query(`
    DELETE FROM customers WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const salaryRequestsResult = await client.query(`
    DELETE FROM salary_requests WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const employeesResult = await client.query(`
    DELETE FROM employees WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const jwtTokensResult = await client.query(`
    DELETE FROM jwt_tokens WHERE user_id IN (
      SELECT id FROM users WHERE created_at >= NOW() - INTERVAL '3 hours'
    )
  `);

  const usersResult = await client.query(`
    DELETE FROM users WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const deliveryPointsResult = await client.query(`
    DELETE FROM delivery_points WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const commissionSettingsResult = await client.query(`
    DELETE FROM commission_settings WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const productImagesResult = await client.query(`
    DELETE FROM product_images WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const productsResult = await client.query(`
    DELETE FROM products WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const categoriesResult = await client.query(`
    DELETE FROM categories WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const branchesResult = await client.query(`
    DELETE FROM branches WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const governoratesResult = await client.query(`
    DELETE FROM governorates WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const couponsResult = await client.query(`
    DELETE FROM coupons WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const notificationsResult = await client.query(`
    DELETE FROM notifications WHERE created_at >= NOW() - INTERVAL '3 hours'
  `);

  const summary = {
    couponUsages: couponUsagesResult.rowCount,
    orderComments: orderCommentsResult.rowCount,
    orderItems: orderItemsResult.rowCount,
    orderCommissions: orderCommissionsResult.rowCount,
    walletTransactions: walletTransactionsResult.rowCount,
    orders: ordersResult.rowCount,
    resetKeys: resetKeysResult.rowCount,
    customers: customersResult.rowCount,
    salaryRequests: salaryRequestsResult.rowCount,
    employees: employeesResult.rowCount,
    jwtTokens: jwtTokensResult.rowCount,
    users: usersResult.rowCount,
    deliveryPoints: deliveryPointsResult.rowCount,
    commissionSettings: commissionSettingsResult.rowCount,
    productImages: productImagesResult.rowCount,
    products: productsResult.rowCount,
    categories: categoriesResult.rowCount,
    branches: branchesResult.rowCount,
    governorates: governoratesResult.rowCount,
    coupons: couponsResult.rowCount,
    notifications: notificationsResult.rowCount,
  };

  console.log("Cleanup summary:", JSON.stringify(summary, null, 2));
  return summary;
}

// Support running directly as a node script
if (require.main === module) {
  (async () => {
    try {
      const result = await db.runInTransaction(cleanupLast3Hours);
      console.log(JSON.stringify({ success: true, result }, null, 2));
      await db.close();
    } catch (err) {
      console.error("Cleanup script failed:", err);
      try {
        await db.close();
      } catch (_) {}
      process.exit(1);
    }
  })();
}

module.exports = { cleanupLast3Hours };
