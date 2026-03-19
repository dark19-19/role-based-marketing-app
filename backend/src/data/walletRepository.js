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

}

module.exports = new WalletRepository();