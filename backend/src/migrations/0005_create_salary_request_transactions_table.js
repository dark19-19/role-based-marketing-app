const db = require('../helpers/DBHelper');

module.exports = {
    name: '0005_create_salary_request_transactions_table',
    up: async () => {
        await db.runInTransaction(async (client) => {
            await client.query(`
                CREATE TABLE IF NOT EXISTS salary_request_transactions (
                        id UUID NOT NULL DEFAULT gen_random_uuid(),
                        salary_request_id UUID REFERENCES salary_requests (id) ON DELETE CASCADE,
                        transaction_id UUID REFERENCES wallet_transactions (id) ON DELETE CASCADE
                    )
`);
        })
    },
};