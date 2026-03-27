const db = require('../helpers/DBHelper');

module.exports = {
    name: '0004_add_status_to_branches',
    up: async () => {
        await db.runInTransaction(async (client) => {
            await client.query(`ALTER TABLE IF EXISTS branches ADD COLUMN is_active VARCHAR(50) DEFAULT true`);
        })
    },
};