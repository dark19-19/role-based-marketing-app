const db = require('../helpers/DBHelper');

module.exports = {
  name: '0020_add_order_hierarchy_snapshot',
  up: async () => {
    await db.query(`
      ALTER TABLE IF EXISTS orders
        ADD COLUMN IF NOT EXISTS supervisor_employee_id UUID REFERENCES employees(id),
        ADD COLUMN IF NOT EXISTS gs_employee_id UUID REFERENCES employees(id);
    `);
  },
  down: async () => {
    await db.query(`
      ALTER TABLE IF EXISTS orders
        DROP COLUMN IF EXISTS supervisor_employee_id,
        DROP COLUMN IF EXISTS gs_employee_id;
    `);
  },
};
