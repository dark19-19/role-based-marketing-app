const db = require('../helpers/DBHelper');

module.exports = {
    name: '0003_add_name_to_users',
    up: async () => {
        await db.runInTransaction(async (client) => {
            await client.query('ALTER TABLE IF EXISTS users ADD COLUMN first_name VARCHAR(30) NOT NULL');
            await client.query('ALTER TABLE IF EXISTS users ADD COLUMN last_name VARCHAR(30) NOT NULL');
        })
    },
};