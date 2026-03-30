const db = require('../helpers/DBHelper');

module.exports = {
    name: '0006_add_referrence_to_notifications',
    up: async () => {
        await db.runInTransaction(async (client) => {
            await client.query(`
                ALTER TABLE IF EXISTS notifications ADD FOREIGN KEY (user_id) REFERENCES users(id)
`);
        })
    },
};