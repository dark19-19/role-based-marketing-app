const db = require('../helpers/DBHelper');

module.exports = {
    name: '0007_add_is_active_to_employees_customers',
    up: async () => {
        await db.runInTransaction(async (client) => {
            // Add is_active column to employees table
            await client.query(`
                ALTER TABLE IF EXISTS employees 
                ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
            `);
            
            // Add is_active column to customers table
            await client.query(`
                ALTER TABLE IF EXISTS customers 
                ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true
            `);
        });
    },
    down: async () => {
        await db.runInTransaction(async (client) => {
            await client.query(`
                ALTER TABLE IF EXISTS employees 
                DROP COLUMN IF EXISTS is_active
            `);
            await client.query(`
                ALTER TABLE IF EXISTS customers 
                DROP COLUMN IF EXISTS is_active
            `);
        });
    }
};