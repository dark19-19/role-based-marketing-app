const db = require('../helpers/DBHelper');

module.exports = {
  name: '0019_add_branch_id_to_salary_requests',
  up: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`
        ALTER TABLE IF EXISTS salary_requests
          ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);
      `);

      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_salary_requests_branch_id
          ON salary_requests (branch_id);
      `);
    });
  },
  down: async () => {
    await db.runInTransaction(async (client) => {
      await client.query(`DROP INDEX IF EXISTS idx_salary_requests_branch_id;`);

      await client.query(`
        ALTER TABLE IF EXISTS salary_requests
          DROP COLUMN IF EXISTS branch_id;
      `);
    });
  },
};
