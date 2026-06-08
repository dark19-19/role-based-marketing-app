const db = require("../helpers/DBHelper");

async function stage1BackfillCustomers(client) {
  const r1 = await client.query(
    `
    UPDATE customers c
    SET
      phone = u.phone,
      first_name = u.first_name,
      last_name = u.last_name,
      has_account = true,
      account_created_at = u.created_at
    FROM users u
    WHERE c.user_id = u.id
      AND (
        c.phone IS NULL
        OR c.first_name IS NULL
        OR c.last_name IS NULL
        OR c.has_account = false
        OR c.account_created_at IS NULL
      )
  `,
  );

  const r2 = await client.query(
    `
    UPDATE customers
    SET customer_origin =
      CASE
        WHEN referred_by IS NULL AND first_marketer_id IS NULL THEN 'SELF_REGISTERED'
        ELSE 'INTERNAL'
      END
    WHERE customer_origin IS NULL OR customer_origin = '' OR customer_origin = 'INTERNAL'
  `,
  );

  return {
    customersUpdatedFromUsers: r1.rowCount,
    customersOriginUpdated: r2.rowCount,
  };
}

async function stage2MarkLegacyOrders(client) {
  const r1 = await client.query(
    `
    UPDATE orders
    SET commission_mode = 'LEGACY'
    WHERE commission_mode IS NULL OR commission_mode = ''
  `,
  );

  return {
    ordersMarkedLegacy: r1.rowCount,
  };
}

async function run() {
  const mode = (process.argv[2] || "all").toLowerCase();
  const allowed = new Set(["all", "stage1", "stage2"]);
  if (!allowed.has(mode)) {
    throw new Error(`Invalid mode: ${mode}. Use all|stage1|stage2`);
  }

  const result = await db.runInTransaction(async (client) => {
    const out = {};

    if (mode === "all" || mode === "stage1") {
      out.stage1 = await stage1BackfillCustomers(client);
    }

    if (mode === "all" || mode === "stage2") {
      out.stage2 = await stage2MarkLegacyOrders(client);
    }

    return out;
  });

  console.log(JSON.stringify({ success: true, mode, result }, null, 2));
  await db.close();
}

run().catch(async (err) => {
  console.error("Backfill failed:", err.message);
  try {
    await db.close();
  } catch (_) {}
  process.exit(1);
});

