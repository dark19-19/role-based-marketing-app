const { randomUUID } = require('crypto');
const TYPES = require('../utils/walletTransactionTypes')
const db = require('../helpers/DBHelper')

class WalletRepository {

    async create(data) {

        await db.query(`
      INSERT INTO wallet_transactions
      (id, employee_id, order_id, amount, type)

      VALUES ($1,$2,$3,$4,$5)
    `, [
            randomUUID(),
            data.employee_id,
            data.order_id,
            data.amount,
            data.type || TYPES.BALANCE
        ]);

    }

    async getSummary(employeeId) {
        const { rows } = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'BALANCE' THEN amount ELSE 0 END), 0) as current_balance,
                COALESCE(SUM(CASE WHEN type = 'WITHDREW' THEN amount ELSE 0 END), 0) as total_withdrawn,
                COALESCE(SUM(CASE WHEN type = 'REQUESTED' THEN amount ELSE 0 END), 0) as pending_requests_total,
                COALESCE(SUM(amount), 0) as total_earned
            FROM wallet_transactions
            WHERE employee_id = $1
        `, [employeeId]);
        
        return rows[0] || { current_balance: 0, total_withdrawn: 0, pending_requests_total: 0, total_earned: 0 };
    }

    async getTransactions(employeeId) {
        const { rows } = await db.query(`
            SELECT 
                w.id,
                w.amount,
                w.type,
                w.created_at as date,
                w.order_id,
                CASE 
                    WHEN w.type = 'BALANCE' THEN 'إضافة رصيد (صالح للسحب)'
                    WHEN w.type = 'REQUESTED' THEN 'طلب سحب رصيد (قيد المعالجة)'
                    WHEN w.type = 'WITHDREW' THEN 'عملية سحب ناجحة'
                    ELSE w.type
                END as description
            FROM wallet_transactions w
            WHERE w.employee_id = $1
            ORDER BY w.created_at DESC
        `, [employeeId]);

        return rows;
    }

    async getBalanceAndRequestedTransactions(employeeId) {
        const { rows } = await db.query(`
            SELECT id, amount, type
            FROM wallet_transactions
            WHERE employee_id = $1
            AND type IN ('BALANCE', 'REQUESTED')
        `, [employeeId]);
        return rows;
    }

    async bulkUpdateType(ids, newType, client) {
        await client.query(
            `
            UPDATE wallet_transactions
            SET type = $1
            WHERE id = ANY($2)
            `,
            [newType, ids]
        );
    }


}

module.exports = new WalletRepository();